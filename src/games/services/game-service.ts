import { inject, LazyServiceIdentifer } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { InstanceType } from 'typegoose';
import { Config } from '../../config';
import { WsProviderService } from '../../core';
import { GameEventListener, GameServerService } from '../../game-servers';
import { GameServer } from '../../game-servers/models';
import logger from '../../logger';
import { playerModel } from '../../players/models/player';
import { playerSkillModel } from '../../players/models/player-skill';
import { QueueConfig } from '../../queue/models/queue-config';
import { QueueSlot } from '../../queue/models/queue-slot';
import { QueueConfigService } from '../../queue/services/queue-config-service';
import { Game, gameModel } from '../models';
import { cleanupServer } from '../utils/cleanup-server';
import { configureServer } from '../utils/configure-server';
import { pickTeams, PlayerSlot } from '../utils/pick-teams';

@provide(GameService)
export class GameService {

  private ws = this.wsProvider.ws;

  constructor(
    @inject('config') private config: Config,
    @inject(new LazyServiceIdentifer(() => GameServerService)) private gameServerService: GameServerService,
    @inject(new LazyServiceIdentifer(() => QueueConfigService)) private queueConfigService: QueueConfigService,
    @inject(new LazyServiceIdentifer(() => WsProviderService)) private wsProvider: WsProviderService,
    @inject(new LazyServiceIdentifer(() => GameEventListener)) private gameEventListener: GameEventListener,
  ) {
    this.gameEventListener.on('match started', async ({ server }) => this.onMatchStarted(server));
    this.gameEventListener.on('match ended', async ({ server }) => this.onMatchEnded(server));
    this.gameEventListener.on('logs uploaded', async ({ server, logsUrl }) => this.onLogsUploaded(server, logsUrl));
  }

  public async getAllGames(): Promise<Array<InstanceType<Game>>> {
    return await gameModel.find().sort({ launchedAt: -1 });
  }

  public async getGame(gameId: string): Promise<InstanceType<Game>> {
    return await gameModel.findById(gameId);
  }

  public async create(queueSlots: QueueSlot[], queueConfig: QueueConfig, map: string): Promise<InstanceType<Game>> {
    queueSlots.forEach(slot => {
      if (!slot.playerId) {
        throw new Error('cannot create the game with queue not being full');
      }

      if (!queueConfig.classes.find(cls => cls.name === slot.gameClass)) {
        throw new Error(`invalid game class: ${slot.gameClass}`);
      }
    });

    const players: PlayerSlot[] = await Promise.all(queueSlots.map(slot => this.queueSlotToPlayerSlot(slot)));
    const assignedSkills = players.reduce((prev, curr) => { prev[curr.playerId] = curr.skill; return prev; }, { });
    const slots = pickTeams(players, queueConfig.classes.map(cls => cls.name));

    const game = await gameModel.create({
      map,
      state: 'launching',
      teams: {
        0: 'RED',
        1: 'BLU',
      },
      slots,
      players: queueSlots.map(s => s.playerId),
      assignedSkills,
    });
    this.ws.emit('game created', game);
    this.launch(game);
    return game;
  }

  public async launch(game: InstanceType<Game>) {
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
          await configureServer(server, game, this.queueConfigService.queueConfig.execConfigs);
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

  public async activeGameForPlayer(playerId: string): Promise<InstanceType<Game>> {
    return await gameModel.findOne({ state: /launching|started/, players: playerId });
  }

  public async resolveMumbleUrl(game: InstanceType<Game>, server: GameServer) {
    const mumbleUrl =
      `mumble://${this.config.mumble.serverUrl}/${this.config.mumble.channel}/${server.mumbleChannelName}`;
    game.mumbleUrl = mumbleUrl;
    await game.save();
    this.ws.emit('game updated', game.toJSON());
  }

  private async onMatchStarted(server: GameServer) {
    const game = await this.gameServerService.getAssignedGame(server);
    if (game && game.state === 'launching') {
      game.state = 'started';
      await game.save();
      this.ws.emit('game updated', game.toJSON());
    }
  }

  private async onMatchEnded(server: GameServer) {
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

  private async onLogsUploaded(server: GameServer, logsUrl: string) {
    const game = await this.gameServerService.getAssignedGame(server);
    if (game) {
      game.logsUrl = logsUrl;
      await game.save();
      this.ws.emit('game updated', game.toJSON());
    }
  }

  private async updateConnectString(game: InstanceType<Game>, connectString: string) {
    game.connectString = connectString;
    await game.save();
    this.ws.emit('game updated', game.toJSON());
  }

  private async queueSlotToPlayerSlot(queueSlot: QueueSlot): Promise<PlayerSlot> {
    const { playerId, gameClass } = queueSlot;
    const player = await playerModel.findById(playerId);
    if (!player) {
      throw new Error('no such player');
    }

    const skill = await playerSkillModel.findOne({ player: playerId }).lean();
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
