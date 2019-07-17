import generator from 'generate-password';
import { Rcon } from 'rcon-client';
import { config } from '../config';
import { IGame } from '../games/models/game';
import logger from '../logger';
import { GameServer, IGameServer } from './models/game-server';
import { GameServerAssignment } from './models/game-server-assignment';
import { ServerInfoForPlayer } from './models/server-info-for-player';
import { verifyServer } from './verify-server';

class GameServerController {

  public async addGameServer(gameServer: IGameServer): Promise<IGameServer> {
    await verifyServer(gameServer);
    return await new GameServer(gameServer).save();
  }

  public async findFirstFreeGameServer(): Promise<IGameServer> {
    const allGameServers = await GameServer.find();
    for (const gs of allGameServers) {
      logger.debug(`checking availability of ${gs.name}...`);

      const games = await GameServerAssignment
        .find({ server: gs.id })
        .find({ $or: [{ 'game.state': 'started' }, { 'game.state': 'launching' }]});

      if (games.length === 0) {
        try {
          await verifyServer(gs);
          return gs;
        } catch (error) {
          continue;
        }
      }
    }

    return null;
  }

  public async assignGame(server: IGameServer, game: IGame) {
    await new GameServerAssignment({ server, game }).save();
  }

  public async configure(server: IGameServer, game: IGame): Promise<ServerInfoForPlayer> {
    logger.info(`configuring server ${server.name}...`);

    const rcon = new Rcon({ packetResponseTimeout: 5000 });
    await rcon.connect({
      host: server.address,
      port: server.port,
      password: server.rconPassword,
    });

    const logAddress = `${config.log_relay.address}:${config.log_relay.port}`;
    logger.debug(`server ${server.name}: adding log address ${logAddress}...`);
    await rcon.send(`logaddress_add ${logAddress}`);

    logger.debug(`server ${server.name}: kicking all players...`);
    await rcon.send(`kickall`);
    logger.debug(`server ${server.name}: changing map to ${game.map}...`);
    await rcon.send(`changelevel ${game.map}`);

    const password = generator.generate({ length: 10, numbers: true, uppercase: true });
    logger.debug(`server ${server.name}: settings password to ${password}...`);
    await rcon.send(`sv_password ${password}`);
    await rcon.end();
    logger.info(`done with configuring server ${server.name}`);

    return {
      connectString: `connect ${server.address}:${server.port}; password ${password}`,
    };
  }

}

export const gameServerController = new GameServerController();
