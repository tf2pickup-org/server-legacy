import { Response } from 'express';
import { inject, LazyServiceIdentifer } from 'inversify';
import { controller, httpGet, httpPut, queryParam, requestParam, response } from 'inversify-express-utils';
import { ensureAuthenticated, ensureRole } from '../../auth';
import { GameService } from '../services';

@controller('/games')
export class GameController {

  constructor(
    @inject(new LazyServiceIdentifer(() => GameService)) private gameService: GameService,
  ) { }

  @httpGet('/')
  public async index(@response() res: Response) {
    const games = await this.gameService.getAllGames();
    return res.status(200).send(games.map(g => g.toJSON()));
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
