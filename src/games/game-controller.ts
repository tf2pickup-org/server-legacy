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

    setTimeout(() => this.onGameStarted(game.id), 60 * 1000);
    setTimeout(() => this.onGameEnded(game.id), 120 * 1000);

    return game;
  }

  public async launch(game: IGame, server: IGameServer) {
    const infoForPlayer = await gameServerController.configure(server, game);
    this.updateConnectString(game.id, infoForPlayer.connectString);
  }

  public async activeGameForPlayer(playerId: string): Promise<IGame> {
    return await Game.findOne({ state: /launching|started/, players: playerId });
  }

  private async updateConnectString(gameId: string, connectString: string) {
    const game = await Game.findById(gameId);
    game.connectString = connectString;
    game.save();

    this.ioProvider.io.emit('game updated', game);
  }

  private async onGameStarted(gameId: string) {
    const game = await Game.findById(gameId);
    game.state = 'started';
    game.save();

    this.ioProvider.io.emit('game updated', game);
  }

  private async onGameEnded(gameId: string) {
    const game = await Game.findById(gameId);
    game.state = 'ended';
    game.connectString = null;
    game.save();

    this.ioProvider.io.emit('game updated', game);
  }
}

export const gameController = new GameController();
