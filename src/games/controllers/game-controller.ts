import { Response } from 'express';
import { inject } from 'inversify';
import { BaseHttpController, controller, httpGet, httpPut, queryParam, requestParam,
  response } from 'inversify-express-utils';
import { ensureAuthenticated, ensureRole } from '../../auth';
import { gameModel } from '../models/game';
import { GameService } from '../services/game-service';

@controller('/games')
export class GameController extends BaseHttpController {

  constructor(
    @inject(GameService) private gameService: GameService,
  ) {
    super();
  }

  @httpGet('/')
  public async getGames(@queryParam('limit') limit = '10', @queryParam('offset') offset = '0',
                        @queryParam('sort') sort = '-launched_at') {
    try {
      let sortParam = { launchedAt: -1 };
      switch (sort) {
        case '-launched_at':
        case '-launchedAt':
          sortParam = { launchedAt: -1 };
          break;

        case 'launched_at':
        case 'launchedAt':
          sortParam = { launchedAt: 1 };
          break;

        default:
          return this.json({ message: 'invalid value for sort parameter' }, 400);
      }

      const [ results, itemCount ] = await Promise.all([
        gameModel.find()
          .sort(sortParam)
          .limit(parseInt(limit, 10))
          .skip(parseInt(offset, 10)),
        gameModel.count({}),
      ]);

      return this.json({ results: results.map(r => r.toJSON()), itemCount });
    } catch (error) {
      return this.json({ message: error.message }, 400);
    }
  }

  @httpGet('/:id')
  public async getGame(@requestParam('id') gameId: string, @response() res: Response) {
    try {
      const game = await this.gameService.getGame(gameId);
      if (game) {
        return res.status(200).send(game.toJSON());
      } else {
        return res.status(404).send({ message: 'no such game' });
      }
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  }

  @httpGet('/:id/skills', ensureAuthenticated, ensureRole('admin', 'super-user'))
  public async getGameSkills(@requestParam('id') gameId: string, @response() res: Response) {
    try {
      const game = await this.gameService.getGame(gameId);
      if (game) {
        return res.status(200).send(game.assignedSkills);
      } else {
        return res.status(404).send({ message: 'no such game' });
      }
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  }

  @httpPut('/:id', ensureAuthenticated, ensureRole('admin', 'super-user'))
  public async takeAdminAction(@requestParam('id') gameId: string, @queryParam() query: any,
                               @response() res: Response) {
    if (query.hasOwnProperty('force_end')) {
      this.gameService.forceEnd(gameId);
    } else if (query.hasOwnProperty('reinitialize_server')) {
      this.gameService.reinitialize(gameId);
    } else if (query.hasOwnProperty('substitute_player')) {
      try {
        await this.gameService.substitutePlayer(gameId, query.substitute_player);
      } catch (error) {
        res.status(400).send({ message: error.message });
      }
    } else if (query.hasOwnProperty('substitute_player_cancel')) {
      try {
        await this.gameService.cancelSubstitutionRequest(gameId, query.substitute_player_cancel);
      } catch (error) {
        res.status(400).send({ message: error.message });
      }
    }

    return res.status(200).send();
  }

}
