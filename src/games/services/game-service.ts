import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { Types } from 'mongoose';
import { Config } from '../../config';
import { lazyInject } from '../../container';
import { WsProviderService } from '../../core';
import { GameEventListener, GameServerService } from '../../game-servers';
import { IGameServer } from '../../game-servers/models';
import logger from '../../logger';
import { PlayerService } from '../../players';
import { PlayerSkill } from '../../players/models/player-skill';
import { QueueService } from '../../queue';
import { QueueConfig } from '../../queue/models/queue-config';
import { QueueSlot } from '../../queue/models/queue-slot';
import { Game, IGame } from '../models';
import { cleanupServer } from '../utils/cleanup-server';
import { configureServer } from '../utils/configure-server';
import { pickTeams, PlayerSlot } from '../utils/pick-teams';

@provide(GameService)
export class GameService {

  @lazyInject(WsProviderService) private wsProvider: WsProviderService;
  @lazyInject(PlayerService) private playerService: PlayerService;
  @lazyInject(GameServerService) private gameServerService: GameServerService;
  @lazyInject(QueueService) private queueService: QueueService;
  private ws = this.wsProvider.ws;

  constructor(
    @inject('config') private config: Config,
    @inject(GameEventListener) private gameEventListener: GameEventListener,
  ) {
    this.gameEventListener.on('match started', async ({ server }) => this.onMatchStarted(server));
    this.gameEventListener.on('match ended', async ({ server }) => this.onMatchEnded(server));
    this.gameEventListener.on('logs uploaded', async ({ server, logsUrl }) => this.onLogsUploaded(server, logsUrl));
  }

  public async getAllGames(): Promise<IGame[]> {
    return await Game.find().sort({ launchedAt: -1 });
  }

  public async getGame(gameId: string): Promise<IGame> {
    if (!Types.ObjectId.isValid(gameId)) {
      throw new Error('invalid id');
    }

    return await Game.findById(gameId);
  }

  public async create(queueSlots: QueueSlot[], queueConfig: QueueConfig, map: string): Promise<IGame> {
    queueSlots.forEach(slot => {
      if (!slot.playerId) {
        throw new Error('cannot create the game with queue not being full');
      }

      if (!queueConfig.classes.find(cls => cls.name === slot.gameClass)) {
        throw new Error(`invalid game class: ${slot.gameClass}`);
      }
    });

    const players: PlayerSlot[] = await Promise.all(queueSlots.map(slot => this.queueSlotToPlayerSlot(slot)));
    const slots = pickTeams(players, queueConfig.classes.map(cls => cls.name));

    const game = new Game({
      map,
      state: 'launching',
      teams: {
        0: 'RED',
        1: 'BLU',
      },
      slots,
      players: queueSlots.map(s => s.playerId),
    });

    await game.save();
    this.ws.emit('game created', game);
    this.launch(game);
    return game;
  }

  public async launch(game: IGame) {
    if (game.state === 'interrupted' || game.state === 'ended') {
      return;
    }

    const server = await this.gameServerService.getFreeGameServer();
    if (server) {
      logger.info(`game ${game.id} will be played on ${server.name}`);
      try {
        await this.gameServerService.assignGame(game, server);
        await this.resolveMumbleUrl(game, server);
        const { connectString } =
          await configureServer(server, game, this.queueService.config.execConfigs, this.playerService);
        this.updateConnectString(game, connectString);
      } catch (error) {
        console.log(error.message);
        setTimeout(() => this.launch(game), 10 * 1000);
      }
    } else {
      // fixme
      // try again in 10 seconds
      console.info(`no available servers to launch game ${game.id}; trying again in 10 seconds...`);
      setTimeout(() => this.launch(game), 10 * 1000);
    }
  }

  public async forceEnd(gameId: string, interrupter?: SocketIO.Socket) {
    const game = await this.getGame(gameId);
    game.state = 'interrupted';
    game.error = 'ended by admin';
    game.save();

    const server = await this.gameServerService.getAssignedServer(game);
    await cleanupServer(server);
    await this.gameServerService.releaseServer(server);

    if (interrupter) {
      interrupter.broadcast.emit('game updated', game.toJSON());
    } else {
      this.ws.emit('game updated', game.toJSON());
    }

    return game;
  }

  public async activeGameForPlayer(playerId: string): Promise<IGame> {
    return await Game.findOne({ state: /launching|started/, players: playerId });
  }

  public async resolveMumbleUrl(game: IGame, server: IGameServer) {
    const mumbleUrl =
      `mumble://${this.config.mumble.serverUrl}/${this.config.mumble.channel}/${server.mumbleChannelName}`;
    game.mumbleUrl = mumbleUrl;
    await game.save();
    this.ws.emit('game updated', game.toJSON());
  }

  private async onMatchStarted(server: IGameServer) {
    const game = await this.gameServerService.getAssignedGame(server);
    if (game) {
      game.state = 'started';
      await game.save();
      this.ws.emit('game updated', game.toJSON());
    }
  }

  private async onMatchEnded(server: IGameServer) {
    const game = await this.gameServerService.getAssignedGame(server);
    if (game) {
      game.state = 'ended';
      game.connectString = null;
      await game.save();
      this.ws.emit('game updated', game.toJSON());

      setTimeout(async () => {
        try {
          await cleanupServer(server);
          await this.gameServerService.releaseServer(server);
        } catch (error) {
          logger.error(error.message);
        }
      }, 2 * 60 * 1000 /* 2 minutes */);
    }
  }

  private async onLogsUploaded(server: IGameServer, logsUrl: string) {
    const game = await this.gameServerService.getAssignedGame(server);
    if (game) {
      game.logsUrl = logsUrl;
      await game.save();
      this.ws.emit('game updated', game.toJSON());
    }
  }

  private async updateConnectString(game: IGame, connectString: string) {
    game.connectString = connectString;
    await game.save();
    this.ws.emit('game updated', game.toJSON());
  }

  private async queueSlotToPlayerSlot(queueSlot: QueueSlot): Promise<PlayerSlot> {
    const { playerId, gameClass } = queueSlot;
    const player = await this.playerService.getPlayerById(playerId);
    if (!player) {
      throw new Error('no such player');
    }

    const skill = await await PlayerSkill.findOne({ player: playerId }).lean();
    if (skill) {
      const skillForClass = skill.skill[gameClass];
      logger.debug(`skill for player ${player.name}: ${skillForClass}`);
      return { playerId, gameClass, skill: skillForClass };
    } else {
      logger.debug(`no skill for player ${player.name}!`);
      return { playerId, gameClass, skill: 1 };
    }
  }

}
