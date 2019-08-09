import { resolve as resolveCb } from 'dns';
import { provide } from 'inversify-binding-decorators';
import { InstanceType } from 'typegoose';
import { promisify } from 'util';
import { Game } from '../../games/models';
import logger from '../../logger';
import { GameServer, gameServerAssignmentModel, gameServerModel } from '../models';
import { verifyServer } from '../utils/verify-server';

const resolve = promisify(resolveCb);

@provide(GameServerService)
export class GameServerService {

  public async getAllGameServers(): Promise<Array<InstanceType<GameServer>>> {
    return await gameServerModel.find();
  }

  public async getGameServer(gameServerId: string): Promise<InstanceType<GameServer>> {
    return await gameServerModel.findById(gameServerId);
  }

  public async addGameServer(gameServer: GameServer): Promise<InstanceType<GameServer>> {
    await verifyServer(gameServer);
    gameServer.isOnline = true;

    try {
      const addresses = await resolve(gameServer.address);
      logger.info(`resolved addresses for ${gameServer.address}: ${addresses}`);
      gameServer.resolvedIpAddresses = addresses;
    } catch (error) { }

    return await gameServerModel.create(gameServer);
  }

  public async removeGameServer(gameServerId: string) {
    const { ok } = await gameServerModel.deleteOne({ _id: gameServerId });
    logger.debug('game server removed');
    if (!ok) {
      throw new Error('unabled to remove server');
    }
  }

  public async getFreeGameServer(): Promise<GameServer> {
    const allGameServers = await gameServerModel.find();
    for (const gs of allGameServers) {
      logger.debug(`checking availability of ${gs.name}...`);

      const games = await gameServerAssignmentModel
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

  public async assignGame(game: Game, server: GameServer) {
    await new gameServerAssignmentModel({ server, game, gameRunning: true }).save();
  }

  public async releaseServer(server: GameServer) {
    const assignment = await gameServerAssignmentModel.findOne({ server, gameRunning: true });
    if (assignment) {
      assignment.gameRunning = false;
      await assignment.save();
    }
  }

  public async getGameServerByEventSource(eventSource: { address: string; port: number; }): Promise<GameServer> {
    return await gameServerModel.findOne({
      resolvedIpAddresses: eventSource.address,
      port: eventSource.port,
    });
  }

  public async getAssignedGame(server: GameServer): Promise<InstanceType<Game>> {
    const assignment = await gameServerAssignmentModel
      .findOne({ server }, null, { sort: { assignedAt: -1 }})
      .populate('game');

    if (assignment) {
      return assignment.game as InstanceType<Game>;
    } else {
      return null;
    }
  }

  public async getAssignedServer(game: Game): Promise<InstanceType<GameServer>> {
    const assignment = await gameServerAssignmentModel
      .findOne({ game })
      .populate('server');

    if (assignment) {
      return assignment.server as InstanceType<GameServer>;
    } else {
      return null;
    }
  }

}
