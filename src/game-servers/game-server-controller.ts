import { resolve as resolveCb } from 'dns';
import generator from 'generate-password';
import { injectable } from 'inversify';
import { Rcon } from 'rcon-client';
import { promisify } from 'util';
import { config } from '../config';
import { container } from '../container';
import { IGame } from '../games';
import logger from '../logger';
import { Player } from '../players/models/player';
import { QueueConfig } from '../queue/models/queue-config';
import { isServerOnline } from './is-server-online';
import { GameServer, GameServerAssignment, IGameServer, ServerInfoForPlayer } from './models';
import { verifyServer } from './verify-server';

const resolve = promisify(resolveCb);

@injectable()
export class GameServerController {

  private logAddress = `${config.logRelay.address}:${config.logRelay.port}`;

  constructor() {
    // check all servers every 30 seconds
    setInterval(() => this.checkAllServers(), 30 * 1000);
  }

  public async addGameServer(gameServer: IGameServer): Promise<IGameServer> {
    await verifyServer(gameServer);
    gameServer.isOnline = true;

    try {
      const addresses = await resolve(gameServer.address);
      logger.info(`resolved addresses for ${gameServer.address}: ${addresses}`);
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
    logger.debug(JSON.stringify(game));
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

      for (const slot of game.slots) {
        const player = await Player.findById(slot.playerId);
        const team = parseInt(slot.teamId, 10) + 2;

        const cmd = [
          `sm_game_player_add ${player.steamId}`,
          `-name ${player.name}`,
          `-team ${team}`,
          `-class ${slot.gameClass}`,
        ].join(' ');
        logger.debug(`[${server.name}] ${cmd}`);
        await rcon.send(cmd);
      }

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

  public async cleanup(server: IGameServer) {
    try {
      const rcon = new Rcon({ packetResponseTimeout: 30000 });
      await rcon.connect({
        host: server.address,
        port: server.port,
        password: server.rconPassword,
      });

      logger.debug(`[${server.name}] removing log address ${this.logAddress}...`);
      await rcon.send(`logaddress_del ${this.logAddress}`);
      await rcon.send('sm_game_player_delall');
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

}

container.bind(GameServerController).toSelf();
