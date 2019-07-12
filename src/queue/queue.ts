import logger from '../logger';
import { Queue } from './models/queue';

export const queue: Queue = {
  config: {
    classes: [
      { name: 'scout', count: 2 },
      { name: 'soldier', count: 2 },
      { name: 'demoman', count: 1 },
      { name: 'medic', count: 1 },
    ],
  },
  players: [],
};

export function joinQueue(slot: string, playerId: string) {
  if (!slot) {
    throw new Error('slot undefined');
  }

  const gameClass = queue.config.classes.find(cls => cls.name === slot);
  if (!gameClass) {
    throw new Error('invalid slot');
  }

  const takenSlotsCount = queue.players.filter(p => p.slot === slot).length;
  if (takenSlotsCount >= gameClass.count) {
    throw new Error('slot unavailable');
  }

  queue.players = [ ...queue.players.filter(p => p.playerId !== playerId), { slot, playerId } ];
  logger.debug(`${playerId} joined the queue as ${slot}`);
}

export function leaveQueue(playerId: string) {
  queue.players = [ ...queue.players.filter(p => p.playerId !== playerId) ];
  logger.debug(`${playerId} left the queue`);
}
