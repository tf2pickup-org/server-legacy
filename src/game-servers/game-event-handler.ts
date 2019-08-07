import { inject, injectable } from 'inversify';
import { container } from '../container';
import { GameService, IGame } from '../games';
import logger from '../logger';
import { GameEventListener, GameEventSource } from './game-event-listener';
import { GameServerController } from './game-server-controller';
import { GameServer, GameServerAssignment, IGameServer } from './models';

@injectable()
export class GameEventHandler {

  private gameEventListener = new GameEventListener();

  constructor(
    @inject(GameService) private gameService: GameService,
    @inject(GameServerController) private gameServerController: GameServerController,
  ) { }

  public initialize() {
    this.gameEventListener.on('match start', async ({ source }) => {
      try {
        const server = await this.getSourceServer(source);
        const game = await this.getAssignedGame(server);
        await this.gameService.onMatchStarted(game);
      } catch (error) {
        logger.error(error.message);
      }
    });

    this.gameEventListener.on('match end', async ({ source }) => {
      try {
        const server = await this.getSourceServer(source);
        const game = await this.getAssignedGame(server);
        await this.gameService.onMatchEnded(game);

        setTimeout(async () => {
          try {
            await this.gameServerController.cleanup(server);
          } catch (error) {
            logger.error(error.message);
          }
        }, 10 * 1000);
      } catch (error) {
        logger.error(error.message);
      }
    });

    this.gameEventListener.on('logs uploaded', async ({ source, logsUrl }) => {
      try {
        const server = await this.getSourceServer(source);
        const game = await this.getAssignedGame(server);
        await this.gameService.onLogsUploaded(game, logsUrl);
      } catch (error) {
        logger.error(error.message);
      }
    });
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
      .findOne({ server }, null, { sort: { assignedAt: -1 }});

    if (assignment) {
      return assignment.game;
    } else {
      throw new Error(`no game assigned for server ${server.name}`);
    }
  }
}

container.bind(GameEventHandler).toSelf();
