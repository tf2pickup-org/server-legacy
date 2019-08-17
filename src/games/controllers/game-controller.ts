import { Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, httpPut, queryParam, requestParam, response } from 'inversify-express-utils';
import { ensureAuthenticated, ensureRole } from '../../auth';
import { gameModel } from '../models/game';
import { GameService } from '../services/game-service';

@controller('/games')
export class GameController {

  constructor(
    @inject(GameService) private gameService: GameService,
  ) { }

  @httpGet('/')
  public async getGames(@queryParam('limit') limit: string, @queryParam('offset') offset: string,
                        @response() res: Response) {
    if (limit === undefined || offset === undefined) {
      return res.status(400).send({ message: 'both limit and offset properties must be specified' });
    }

    try {
      const [ results, itemCount ] = await Promise.all([
        gameModel.find()
          .sort({ launchedAt: -1 })
          .limit(parseInt(limit, 10))
          .skip(parseInt(offset, 10)),
        gameModel.count({}),
      ]);

      return res.status(200).send({ results: results.map(r => r.toJSON()), itemCount });
    } catch (error) {
      return res.status(400).send({ message: error.message });
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
    }

    res.status(200).send();
  }

}
