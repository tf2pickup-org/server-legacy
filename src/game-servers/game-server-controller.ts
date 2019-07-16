import generator from 'generate-password';
import { Rcon } from 'rcon-client';
import { IGame } from '../games/models/game';
import logger from '../logger';
import { GameServer, IGameServer } from './models/game-server';
import { GameServerAssignment } from './models/game-server-assignment';
import { ServerInfoForPlayer } from './models/server-info-for-player';

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
      const rcon = await Rcon.connect({
        host: options.address,
        port: options.port,
        password: options.rconPassword,
      });
      await rcon.end();
      return true;
    } catch (error) {
      return false;
    }
  }

  public async findFirstFreeGameServer(): Promise<IGameServer> {
    const allGameServers = await GameServer.find();
    for (const gs of allGameServers) {
      logger.debug(`checking availability of ${gs.name}...`);

      const games = await GameServerAssignment
        .find({ server: gs.id })
        .find({ $or: [{ 'game.state': 'started' }, { 'game.state': 'launching' }]});

      if (games.length === 0) {
        return gs;
      }
    }
  }

  public async assignGame(server: IGameServer, game: IGame) {
    await new GameServerAssignment({ server, game }).save();
  }

  public async configure(server: IGameServer, game: IGame): Promise<ServerInfoForPlayer> {
    logger.info(`rconing to ${server.name}...`);

    const rcon = new Rcon({ packetResponseTimeout: 5000 });
    await rcon.connect({
      host: server.address,
      port: server.port,
      password: server.rconPassword,
    });

    const password = generator.generate({ length: 10, numbers: true, uppercase: true });

    logger.info(`server ${server.name}: kicking all players...`);
    await rcon.send(`kickall`);
    logger.info(`server ${server.name}: changing map to ${game.map}...`);
    await rcon.send(`changelevel ${game.map}`);
    logger.info(`server ${server.name}: settings password to ${password}...`);
    await rcon.send(`sv_password ${password}`);
    await rcon.end();
    logger.info(`done with configuring ${server.name}`);

    return {
      connectString: `connect ${server.address}:${server.port}; password ${password}`,
    };
  }

}

export const gameServerController = new GameServerController();
