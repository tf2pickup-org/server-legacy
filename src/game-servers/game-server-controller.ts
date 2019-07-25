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

  private logAddress = `${config.log_relay.address}:${config.log_relay.port}`;
  private gameEventListener = new GameEventListener();

  constructor() {
    // check all servers every 30 seconds
    setInterval(() => this.checkAllServers(), 30 * 1000);

    this.gameEventListener.on('match start', async ({ source }) => {
      try {
        const server = await this.getSourceServer(source);
        const game = await this.getAssignedGame(server);
        gameController.onMatchStarted(game);
      } catch (error) {
        logger.error(error.message);
      }
    });

    this.gameEventListener.on('match end', async ({ source }) => {
      try {
        const server = await this.getSourceServer(source);
        const game = await this.getAssignedGame(server);
        gameController.onMatchEnded(game);
        this.cleanup(server);
      } catch (error) {
        logger.error(error.message);
      }
    });
  }

  public async addGameServer(gameServer: IGameServer): Promise<IGameServer> {
    await verifyServer(gameServer);
    gameServer.isOnline = true;

    try {
      const addresses = await resolve(gameServer.address);
      console.info(`resolved addresses for ${gameServer.address}: ${addresses}`);
      gameServer.resolvedIpAddresses = addresses;
    } catch (error) { }
    return await new GameServer(gameServer).save();
  }

  public async findFirstFreeGameServer(): Promise<IGameServer> {
    const allGameServers = await GameServer.find();
    for (const gs of allGameServers) {
      logger.debug(`checking availability of ${gs.name}...`);

      const games = await GameServerAssignment
        .find({ server: gs.id, gameRunning: true });

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
    await new GameServerAssignment({ server, game, gameRunning: true }).save();
  }

  public async releaseServer(server: IGameServer) {
    const assignment = await GameServerAssignment.findOne({ server, gameRunning: true });
    if (assignment) {
      assignment.gameRunning = false;
      await assignment.save();
    }
  }

  public async configure(queueConfig: QueueConfig, server: IGameServer, game: IGame): Promise<ServerInfoForPlayer> {
    logger.info(`configuring server ${server.name}...`);
    logger.debug(`[${server.address}:${server.port}] using rcon password ${server.rconPassword}`);
    try {
      const rcon = new Rcon({ packetResponseTimeout: 30000 });
      await rcon.connect({
        host: server.address,
        port: server.port,
        password: server.rconPassword,
      });

      logger.debug(`[${server.name}] adding log address ${this.logAddress}...`);
      await rcon.send(`logaddress_add ${this.logAddress}`);

      logger.debug(`[${server.name}] kicking all players...`);
      await rcon.send(`kickall`);
      logger.debug(`[${server.name}] changing map to ${game.map}...`);
      await rcon.send(`changelevel ${game.map}`);

      for (const execConfig of queueConfig.execConfigs) {
        logger.debug(`[${server.name}] executing ${execConfig}...`);
        await rcon.send(`exec ${execConfig}`);
      }

      const password = generator.generate({ length: 10, numbers: true, uppercase: true });
      logger.debug(`[${server.name}] settings password to ${password}...`);
      await rcon.send(`sv_password ${password}`);
      await rcon.end();
      logger.info(`done with configuring server ${server.name}`);

      const connectString = `connect ${server.address}:${server.port}; password ${password}`;
      logger.info(`${server.name} connect: ${connectString}`);

      return {
        connectString,
      };
    } catch (error) {
      throw new Error(`could not configure server ${server.name} (${error.message})`);
    }
  }

  public async getServerForGame(game: IGame): Promise<IGameServer> {
    return (await GameServerAssignment.findOne({ game })).server;
  }

  private async cleanup(server: IGameServer) {
    try {
      const rcon = new Rcon({ packetResponseTimeout: 30000 });
      await rcon.connect({
        host: server.address,
        port: server.port,
        password: server.rconPassword,
      });

      logger.debug(`[${server.name}] removing log address ${this.logAddress}...`);
      await rcon.send(`logaddress_del ${this.logAddress}`);
      await rcon.end();
      await this.releaseServer(server);
    } catch (error) {
      throw new Error(`could not cleanup server ${server.name} (${error.message})`);
    }
  }

  private async checkAllServers() {
    const allGameServers = await GameServer.find();
    for (const server of allGameServers) {
      const isOnline = await isServerOnline(server.address, server.port);
      server.isOnline = isOnline;
      await server.save();
    }
  }

  private async getSourceServer(source: GameEventSource): Promise<IGameServer> {
    const server = await GameServer.findOne({
      resolvedIpAddresses: source.address,
      port: source.port,
    });
    if (server) {
      return server;
    } else {
      throw new Error(`no such server: ${source.address}:${source.port}`);
    }
  }

  /**
   * Returns an ongoing game that takes place on the given server.
   */
  private async getAssignedGame(server: IGameServer): Promise<IGame> {
    const assignment = await GameServerAssignment
        .findOne({ server, gameRunning: true });

    if (assignment) {
      return assignment.game;
    } else {
      throw new Error(`no game assigned for server ${server.name}`);
    }
  }

}

export const gameServerController = new GameServerController();
