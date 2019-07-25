import { Inject } from 'typescript-ioc';
import { gameServerController } from '../game-servers/game-server-controller';
import { IGameServer } from '../game-servers/models/game-server';
import { IoProvider } from '../io-provider';
import { QueueConfig } from '../queue/models/queue-config';
import { QueueSlot } from '../queue/models/queue-slot';
import { Game, IGame } from './models/game';
import { GamePlayer } from './models/game-player';

class GameController {
  @Inject private ioProvider: IoProvider;

  public async create(queueSlots: QueueSlot[], map: string): Promise<IGame> {
    let team = 0;
    const slots: GamePlayer[] = queueSlots.map(s => ({
      playerId: s.playerId,
      gameClass: s.gameClass,
      teamId: `${team++ % 2}`,
    }));

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
    const infoForPlayer = await gameServerController.configure(queueConfig, server, game);
    this.updateConnectString(game.id, infoForPlayer.connectString);
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

    const server = await gameServerController.getServerForGame(game);
    await gameServerController.releaseServer(server);

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

  private async updateConnectString(gameId: string, connectString: string) {
    const game = await Game.findById(gameId);
    game.connectString = connectString;
    game.save();

    this.ioProvider.io.emit('game updated', game);
  }
}

export const gameController = new GameController();
