import { app } from '../app';
import logger from '../logger';
import { QueueConfig } from './models/queue-config';
import { QueueSlot } from './models/queue-slot';

export const queueConfig: QueueConfig = {
  teamCount: 2,
  classes: [
    { name: 'scout', count: 2 },
    { name: 'soldier', count: 2 },
    { name: 'demoman', count: 1 },
    { name: 'medic', count: 1 },
  ],
};

export let queueSlots: QueueSlot[] = [];

export function resetQueue() {
  let lastId = 0;
  queueSlots = queueConfig.classes.reduce((prev, curr) => {
    const tmpSlots = [];
    for (let i = 0; i < curr.count * queueConfig.teamCount; ++i) {
      tmpSlots.push({ id: lastId++, gameClass: curr.name });
    }

    return prev.concat(tmpSlots);
  }, []);
}

export function joinQueue(slotId: number, playerId: string) {
  const slot = queueSlots.find(s => s.id === slotId);
  if (!slot) {
    throw new Error('no such slot');
  }

  queueSlots.forEach(s => {
    if (s.playerId === playerId) {
      delete s.playerId;
      app.io.emit('queue slot update', s);
    }
  });

  slot.playerId = playerId;
  app.io.emit('queue slot update', slot);
  logger.debug(`${playerId} joined the queue`);
}

export function leaveQueue(playerId: string) {
  const slot = queueSlots.find(s => s.playerId === playerId);
  if (slot) {
    delete slot.playerId;
    app.io.emit('queue slot update', slot);
    logger.debug(`${playerId} left the queue`);
  }
}
