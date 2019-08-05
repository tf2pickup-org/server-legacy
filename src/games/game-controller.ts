import { inject, injectable } from 'inversify';
import { config } from '../config';
import { container } from '../container';
import { GameServerController } from '../game-servers/game-server-controller';
import { IGameServer } from '../game-servers/models/game-server';
import { IoProvider } from '../io-provider';
import logger from '../logger';
import { Player } from '../players/models/player';
import { PlayerSkill } from '../players/models/player-skill';
import { QueueConfig } from '../queue/models/queue-config';
import { QueueSlot } from '../queue/models/queue-slot';
import { Game, IGame } from './models/game';
import { pickTeams, PlayerSlot } from './pick-teams';

async function queueSlotToPlayerSlot(queueSlot: QueueSlot): Promise<PlayerSlot> {
  const { playerId, gameClass } = queueSlot;
  const player = await Player.findById(playerId);
  if (!player) {
    throw new Error('no such player');
  }

  const skill = await PlayerSkill.findOne({ player }).lean();
  if (skill) {
    logger.debug(`skill for player ${player.name}: ${skill.skill[gameClass]}`);
    return { playerId, gameClass, skill: parseInt(skill.skill[gameClass], 10) };
  } else {
    logger.debug(`no skill for player ${player.name}!`);
    return { playerId, gameClass, skill: 1 };
  }

}

@injectable()
export class GameController {

  constructor(
    @inject(IoProvider) private ioProvider: IoProvider,
    @inject(GameServerController) private gameServerController: GameServerController,
  ) { }

  public async create(queueSlots: QueueSlot[], queueConfig: QueueConfig, map: string): Promise<IGame> {
    queueSlots.forEach(slot => {
      if (!slot.playerId) {
        throw new Error('cannot create the game with queue not being full');
      }
    });

    const players: PlayerSlot[] = await Promise.all(queueSlots.map(slot => queueSlotToPlayerSlot(slot)));
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
    this.ioProvider.io.emit('game created', game);

    return game;
  }

  public async launch(queueConfig: QueueConfig, game: IGame, server: IGameServer) {
    try {
      const infoForPlayer = await this.gameServerController.configure(queueConfig, server, game);
      this.updateConnectString(game.id, infoForPlayer.connectString);
    } catch (error) {
      logger.error(error);
      this.interruptGame(game.id, 'failed to configure server');
    }
  }

  public async activeGameForPlayer(playerId: string): Promise<IGame> {
    return await Game.findOne({ state: /launching|started/, players: playerId });
  }

  public async interruptGame(gameId: string, error?: string, interrupter?: SocketIO.Socket): Promise<IGame> {
    const game = await Game.findById(gameId);
    game.state = 'interrupted';

    if (error) {
      game.error = error;
    }

    game.save();

    const server = await this.gameServerController.getServerForGame(game);
    await this.gameServerController.releaseServer(server);

    if (interrupter) {
      interrupter.broadcast.emit('game updated', game.toJSON());
    } else {
      this.ioProvider.io.emit('game updated', game.toJSON());
    }

    return game;
  }

  public async onMatchStarted(game: IGame) {
    game.state = 'started';
    await game.save();

    this.ioProvider.io.emit('game updated', game);
  }

  public async onMatchEnded(game: IGame) {
    game.state = 'ended';
    game.connectString = null;
    await game.save();

    this.ioProvider.io.emit('game updated', game);
  }

  public async onLogsUploaded(game: IGame, logsUrl: string) {
    game.logsUrl = logsUrl;
    await game.save();
    this.ioProvider.io.emit('game updated', game);
  }

  public async resolveMumbleUrl(game: IGame, server: IGameServer) {
    const mumbleUrl = `mumble://${config.mumble.serverUrl}/${config.mumble.channel}/${server.mumbleChannelName}`;
    game.mumbleUrl = mumbleUrl;
    await game.save();

    this.ioProvider.io.emit('game updated', game);
  }

  private async updateConnectString(gameId: string, connectString: string) {
    const game = await Game.findById(gameId);
    game.connectString = connectString;
    await game.save();

    this.ioProvider.io.emit('game updated', game);
  }
}

container.bind(GameController).toSelf();
