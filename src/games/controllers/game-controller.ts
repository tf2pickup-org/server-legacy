import { inject } from 'inversify';
import { BaseHttpController, controller, httpGet, httpPut, queryParam, requestParam } from 'inversify-express-utils';
import { Types } from 'mongoose';
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
      let sortParam: { launchedAt: 1 | -1 };
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
          return this.json({ message: 'invalid value for the sort parameter' }, 400);
      }

      const limitValue = parseInt(limit, 10);
      if (isNaN(limitValue)) {
        return this.json({ message: 'limit is not a number' }, 400);
      }

      const offsetValue = parseInt(offset, 10);
      if (isNaN(offsetValue)) {
        return this.json({ message: 'offset is not a number' }, 400);
      }

      const [ results, itemCount ] = await Promise.all([
        gameModel.find()
          .sort(sortParam)
          .limit(limitValue)
          .skip(offsetValue),
        gameModel.estimatedDocumentCount(),
      ]);

      return this.json({ results: results.map(r => r.toJSON()), itemCount });
    } catch (error) {
      return this.json({ message: error.message }, 500);
    }
  }

  @httpGet('/:id')
  public async getGame(@requestParam('id') gameId: string) {
    try {
      if (!Types.ObjectId.isValid(gameId))  {
        return this.json({ message: 'invalid id' }, 400);
      }

      const game = await gameModel.findById(gameId);
      if (game) {
        return this.json(game.toJSON());
      } else {
        return this.json({ message: 'no such game' }, 404);
      }
    } catch (error) {
      return this.json({ message: error.message }, 500);
    }
  }

  @httpGet('/:id/skills', ensureAuthenticated, ensureRole('admin', 'super-user'))
  public async getGameSkills(@requestParam('id') gameId: string) {
    try {
      const game = await this.gameService.getGame(gameId);
      if (game) {
        return this.json(game.assignedSkills);
      } else {
        return this.json({ message: 'no such game' }, 404);
      }
    } catch (error) {
      return this.json({ message: error.message }, 500);
    }
  }

  @httpPut('/:id', ensureAuthenticated, ensureRole('admin', 'super-user'))
  public async takeAdminAction(@requestParam('id') gameId: string, @queryParam() query: any) {
    if (query.hasOwnProperty('force_end')) {
      this.gameService.forceEnd(gameId);
    } else if (query.hasOwnProperty('reinitialize_server')) {
      this.gameService.reinitialize(gameId);
    } else if (query.hasOwnProperty('substitute_player')) {
      try {
        await this.gameService.substitutePlayer(gameId, query.substitute_player);
      } catch (error) {
        return this.json({ message: error.message }, 400);
      }
    } else if (query.hasOwnProperty('substitute_player_cancel')) {
      try {
        await this.gameService.cancelSubstitutionRequest(gameId, query.substitute_player_cancel);
      } catch (error) {
        return this.json({ message: error.message }, 400);
      }
    }

    return this.json({ });
  }

}
