import { resolve as resolveCb } from 'dns';
import { provide } from 'inversify-binding-decorators';
import { Types } from 'mongoose';
import { promisify } from 'util';
import { IGame } from '../../games/models';
import logger from '../../logger';
import { GameServer, GameServerAssignment, IGameServer } from '../models';
import { verifyServer } from '../utils/verify-server';

const resolve = promisify(resolveCb);

@provide(GameServerService)
export class GameServerService {

  public async getAllGameServers(): Promise<IGameServer[]> {
    return await GameServer.find();
  }

  public async getGameServer(gameServerId: string): Promise<IGameServer> {
    if (!Types.ObjectId.isValid(gameServerId)) {
      throw new Error('invalid id');
    }

    return await GameServer.findById(gameServerId);
  }

  public async addGameServer(gameServer: Partial<IGameServer>): Promise<IGameServer> {
    if (!gameServer.address) {
      throw new Error('server address cannot be empty');
    }

    if (!gameServer.port) {
      throw new Error('server port cannot be empty');
    }

    if (!gameServer.rconPassword) {
      throw new Error('server rcon password cannot be empty');
    }

    await verifyServer(gameServer as { address: string, port: number, rconPassword: string });
    gameServer.isOnline = true;

    try {
      const addresses = await resolve(gameServer.address);
      logger.info(`resolved addresses for ${gameServer.address}: ${addresses}`);
      gameServer.resolvedIpAddresses = addresses;
    } catch (error) { }

    return await new GameServer(gameServer).save();
  }

  public async removeGameServer(gameServerId: string) {
    const { ok } = await GameServer.deleteOne({ _id: gameServerId });
    logger.debug('game server removed');
    if (!ok) {
      throw new Error('unabled to remove server');
    }
  }

  public async getFreeGameServer(): Promise<IGameServer> {
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
          logger.error(error.messsage);
          continue;
        }
      }
    }

    return null;
  }

  public async assignGame(game: IGame, server: IGameServer) {
    await new GameServerAssignment({ server, game, gameRunning: true }).save();
  }

  public async releaseServer(server: IGameServer) {
    const assignment = await GameServerAssignment.findOne({ server, gameRunning: true });
    if (assignment) {
      assignment.gameRunning = false;
      await assignment.save();
    }
  }

  public async getGameServerByEventSource(eventSource: { address: string; port: number; }): Promise<IGameServer> {
    return await GameServer.findOne({
      resolvedIpAddresses: eventSource.address,
      port: eventSource.port,
    });
  }

  public async getAssignedGame(server: IGameServer): Promise<IGame> {
    const assignment = await GameServerAssignment
      .findOne({ server }, null, { sort: { assignedAt: -1 }});

    if (assignment) {
      return assignment.game;
    } else {
      return null;
    }
  }

  public async getAssignedServer(game: IGame): Promise<IGameServer> {
    const assignment = await GameServerAssignment
      .findOne({ game });

    if (assignment) {
      return assignment.server;
    } else {
      return null;
    }
  }

}
