import { Inject } from 'typescript-ioc';
import { IoProvider } from '../io-provider';
import { QueueConfig } from '../queue/models/queue-config';
import { QueueSlot } from '../queue/models/queue-slot';
import { Game, IGame } from './models/game';
import { GamePlayer } from './models/game-player';

class GameController {
  @Inject private ioProvider: IoProvider;

  public async create(config: QueueConfig, queueSlots: QueueSlot[]): Promise<IGame> {
    let team = 0;
    const slots: GamePlayer[] = queueSlots.map(s => ({
      playerId: s.playerId,
      gameClass: s.gameClass,
      teamId: `${team++ % 2}`,
    }));

    const game = new Game({
      map: 'cp_badlands',
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

  public async activeGameForPlayer(playerId: string): Promise<IGame> {
    return await Game.findOne({ state: /launching|started/, players: playerId });
  }
}

export const gameController = new GameController();
