import { Response } from 'express';
import { inject } from 'inversify';
import { controller, httpDelete, httpGet, httpPost, requestBody, requestParam,
    response } from 'inversify-express-utils';
import { ensureAuthenticated, ensureRole } from '../../auth';
import logger from '../../logger';
import { GameServer } from '../models';
import { GameServerService } from '../services/game-server-service';

@controller('/game-servers')
export class GameServerController {

  constructor(
    @inject(GameServerService) private gameServerService: GameServerService,
  ) { }

  @httpGet('/')
  public async index(@response() res: Response) {
    const gameServers = await this.gameServerService.getAllGameServers();
    return res.status(200).send(gameServers.map(gs => gs.toJSON()));
  }

  @httpGet('/:id')
  public async getGameServer(@requestParam('id') gameServerId: string, @response() res: Response) {
    try {
      const gameServer = await this.gameServerService.getGameServer(gameServerId);
      if (gameServer) {
        return res.status(200).send(gameServer.toJSON());
      } else {
        return res.status(404).send({ message: 'no such game server' });
      }
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  }

  @httpPost('/', ensureAuthenticated, ensureRole('super-user'))
  public async addGameServer(@requestBody() gameServer: GameServer, @response() res: Response) {
    if (!gameServer) {
      return res.status(400).send({ message: 'invalid game server' });
    }

    try {
      const ret = await this.gameServerService.addGameServer(gameServer);
      return res.status(201).send(ret.toJSON());
    } catch (error) {
      logger.error(error.message);
      return res.status(400).send({ message: error.message });
    }
  }

  @httpDelete('/:id', ensureAuthenticated, ensureRole('super-user'))
  public async removeGameServer(@requestParam('id') gameServerId: string, @response() res: Response) {
    try {
      this.gameServerService.removeGameServer(gameServerId);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).send({ message: error.message });
    }
  }

}
