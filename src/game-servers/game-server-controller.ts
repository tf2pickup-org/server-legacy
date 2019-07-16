import { Rcon } from 'rcon-client';
import { GameServer, IGameServer } from './models/game-server';

class GameServerController {

  public async addGameServer(gameServer: IGameServer): Promise<IGameServer> {
    if (await this.serverOnline(gameServer)) {
      const ret = await new GameServer(gameServer).save();
      return ret;
    } else {
      throw Error('server unreachable');
    }
  }

  public async serverOnline(options: { address: string, port: number, rconPassword: string }): Promise<boolean> {
    try {
      await Rcon.connect({
        host: options.address,
        port: options.port,
        password: options.rconPassword,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

}

export const gameServerController = new GameServerController();
