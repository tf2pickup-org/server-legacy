import { Inject } from 'typescript-ioc';
import { IoProvider } from '../io-provider';
import { QueueConfig } from '../queue/models/queue-config';
import { QueueSlot } from '../queue/models/queue-slot';
import { Game, IGame } from './models/game';
import { GamePlayer } from './models/game-player';

class GameController {
  @Inject private ioProvider: IoProvider;

  public async create(config: QueueConfig, slots: QueueSlot[]): Promise<IGame> {
    let team = 0;
    const players: GamePlayer[] = slots.map(s => ({
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
      players,
    });

    await game.save();
    this.ioProvider.io.emit('game created', game);
    return game;
  }

  public async activeGameForPlayer(playerId: string): Promise<IGame> {
    const games = await Game.find({ state: /launching|started/ });
    return games.find(g => g.players.find(p => p.playerId === playerId));
  }
}

export const gameController = new GameController();
