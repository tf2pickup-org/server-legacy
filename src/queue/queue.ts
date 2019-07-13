import { app } from '../app';
import logger from '../logger';
import { QueueConfig } from './models/queue-config';
import { QueueSlot } from './models/queue-slot';
import { QueueState } from './models/queue-state';

const config6v6: QueueConfig = {
  teamCount: 2,
  classes: [
    { name: 'scout', count: 2 },
    { name: 'soldier', count: 2 },
    { name: 'demoman', count: 1 },
    { name: 'medic', count: 1 },
  ],
};

const configTest: QueueConfig = {
  teamCount: 1,
  classes: [
    { name: 'soldier', count: 1 },
  ],
};

class Queue {

  public config: QueueConfig = config6v6;
  public slots: QueueSlot[] = [];
  public state: QueueState = 'waiting';

  constructor() {
    this.reset();
  }

  /**
   * Clears all slots, resets the queue to default state.
   */
  public reset() {
    let lastId = 0;
    this.slots = this.config.classes.reduce((prev, curr) => {
      const tmpSlots = [];
      for (let i = 0; i < curr.count * this.config.teamCount; ++i) {
        tmpSlots.push({ id: lastId++, gameClass: curr.name });
      }

      return prev.concat(tmpSlots);
    }, []);

    this.state = 'waiting';
  }

  /**
   * Joins the given player at the given spot.
   * @param slotId The slot to be taken.
   * @param playerId The player to take the slot.
   */
  public join(slotId: number, playerId: string) {
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) {
      throw new Error('no such slot');
    }

    this.slots.forEach(s => {
      if (s.playerId === playerId) {
        delete s.playerId;
        app.io.emit('queue slot update', s);
      }
    });

    slot.playerId = playerId;
    app.io.emit('queue slot update', slot);
    logger.debug(`${playerId} joined the queue`);
  }

  /**
   * Player leaves the queue.
   * @param playerId The player to leave.
   */
  public leave(playerId: string) {
    const slot = this.slots.find(s => s.playerId === playerId);
    if (slot) {
      delete slot.playerId;
      app.io.emit('queue slot update', slot);
      logger.debug(`${playerId} left the queue`);
    }
  }

}

export const queue = new Queue();
