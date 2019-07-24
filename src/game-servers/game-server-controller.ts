import { resolve as resolveCb } from 'dns';
import generator from 'generate-password';
import { Rcon } from 'rcon-client';
import { promisify } from 'util';
import { config } from '../config';
import { gameController } from '../games';
import { IGame } from '../games/models/game';
import logger from '../logger';
import { QueueConfig } from '../queue/models/queue-config';
import { GameEventListener, GameEventSource } from './game-event-listener';
import { isServerOnline } from './is-server-online';
import { GameServer, IGameServer } from './models/game-server';
import { GameServerAssignment } from './models/game-server-assignment';
import { ServerInfoForPlayer } from './models/server-info-for-player';
import { verifyServer } from './verify-server';

const resolve = promisify(resolveCb);

class GameServerController {

  private gameEventListener = new GameEventListener();

  constructor() {
    // check all servers every 30 seconds
    setInterval(() => this.checkAllServers(), 30 * 1000);

    this.gameEventListener.on('match start', async ({ source }) => {
      try {
        const game = await this.getGame(source);
        gameController.onMatchStarted(game);
      } catch (error) {
        logger.error(error.message);
      }
    });

    this.gameEventListener.on('match end', async ({ source }) => {
      try {
        const game = await this.getGame(source);
        gameController.onMatchEnded(game);
      } catch (error) {
        logger.error(error.message);
      }
    });
  }

  public async addGameServer(gameServer: IGameServer): Promise<IGameServer> {
    await verifyServer(gameServer);
    const addresses = await resolve(gameServer.address);
    console.debug(`resolved addresses for ${gameServer.address}: ${addresses}`);
    gameServer.resolvedIpAddresses = addresses;
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

  public async configure(queueConfig: QueueConfig, server: IGameServer, game: IGame): Promise<ServerInfoForPlayer> {
    logger.info(`configuring server ${server.name}...`);

    logger.debug(`using password ${server.rconPassword} for game server ${server.address}:${server.port}`);
    const rcon = new Rcon({ packetResponseTimeout: 30000 });
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

    for (const execConfig of queueConfig.execConfigs) {
      logger.debug(`server ${server.name}: executing ${execConfig}...`);
      await rcon.send(`exec ${execConfig}`);
    }

    const password = generator.generate({ length: 10, numbers: true, uppercase: true });
    logger.debug(`server ${server.name}: settings password to ${password}...`);
    await rcon.send(`sv_password ${password}`);
    await rcon.end();
    logger.info(`done with configuring server ${server.name}`);

    const connectString = `connect ${server.address}:${server.port}; password ${password}`;
    logger.info(`${server.name} connect: ${connectString}`);

    return {
      connectString,
    };
  }

  private async checkAllServers() {
    const allGameServers = await GameServer.find();
    for (const server of allGameServers) {
      const isOnline = await isServerOnline(server.address, server.port);
      server.isOnline = isOnline;
      await server.save();
    }
  }

  private async getGame(source: GameEventSource): Promise<IGame> {
    const server = await GameServer.findOne({
      resolvedIpAddresses: source.address,
      port: source.port,
    });
    if (server) {
      const assignment = await GameServerAssignment
        .find({ server: server.id })
        .find({ $or: [{ 'game.state': 'started' }, { 'game.state': 'launching' }]})
        .findOne();

      if (assignment) {
        return assignment.game;
      } else {
        throw new Error(`no game assigned for server ${server.name}`);
      }
    } else {
      throw new Error(`no such server: ${source.address}:${source.port}`);
    }
  }

}

export const gameServerController = new GameServerController();
