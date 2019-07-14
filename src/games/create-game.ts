import { QueueConfig } from '../queue/models/queue-config';
import { QueueSlot } from '../queue/models/queue-slot';
import { Game, IGame } from './models/game';
import { GamePlayer } from './models/game-player';

export async function createGame(config: QueueConfig, slots: QueueSlot[]): Promise<IGame> {
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

  return await game.save();
}
