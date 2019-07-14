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
  teamCount: 2,
  classes: [
    { name: 'soldier', count: 1 },
  ],
};

class Queue {

  public config: QueueConfig = configTest;
  public slots: QueueSlot[] = [];
  public state: QueueState = 'waiting';

  get requiredPlayerCount() {
    return this.config.classes.reduce((prev, curr) => prev + curr.count, 0) * this.config.teamCount;
  }

  get playerCount() {
    return this.slots.reduce((prev, curr) => curr.playerId ? prev + 1 : prev, 0);
  }

  constructor() {
    this.resetSlots();
  }

  public setupIo(io: SocketIO.Server) {
    io.on('connection', socket => {
      if (socket.request.user.logged_in) {
        const player = socket.request.user;

        socket.on('disconnect', () => {
          queue.leave(player.id);
        });

        socket.on('join queue', (slotId: number, done) => {
          try {
            const slot = this.join(slotId, player.id, socket);
            done({ slot });
          } catch (error) {
            done({ error: error.message });
          }
        });

        socket.on('leave queue', done => {
          try {
            const slot = this.leave(player.id, socket);
            done({ slot });
          } catch (error) {
            done({ error: error.message });
          }
        });
      }
    });
  }

  /**
   * Clears all slots, resets the queue to default state.
   */
  public reset() {
    this.resetSlots();
    this.updateState();
  }

  /**
   * Joins the given player at the given spot.
   * @param slotId The slot to be taken.
   * @param playerId The player to take the slot.
   */
  public join(slotId: number, playerId: string, sender?: SocketIO.Socket): QueueSlot {
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) {
      throw new Error('no such slot');
    }

    if (slot.playerId) {
      throw new Error('slot already taken');
    }

    this.slots.forEach(s => {
      if (s.playerId === playerId) {
        delete s.playerId;
        app.io.emit('queue slot update', s);
      }
    });

    slot.playerId = playerId;
    this.slotUpdated(slot, sender);
    logger.debug(`${playerId} joined the queue`);

    setTimeout(() => this.updateState(), 0);
    return slot;
  }

  /**
   * Player leaves the queue.
   * @param playerId The player to leave.
   */
  public leave(playerId: string, sender?: SocketIO.Socket): QueueSlot {
    const slot = this.slots.find(s => s.playerId === playerId);
    if (slot) {
      delete slot.playerId;
      this.slotUpdated(slot, sender);
      logger.debug(`${playerId} left the queue`);
      setTimeout(() => this.updateState(), 0);
      return slot;
    } else {
      return null;
    }
  }

  private resetSlots() {
    let lastId = 0;
    this.slots = this.config.classes.reduce((prev, curr) => {
      const tmpSlots = [];
      for (let i = 0; i < curr.count * this.config.teamCount; ++i) {
        tmpSlots.push({ id: lastId++, gameClass: curr.name });
      }

      return prev.concat(tmpSlots);
    }, []);
  }

  private updateState() {
    if (this.playerCount === this.requiredPlayerCount) {
      this.setState('ready');
    } else {
      this.setState('waiting');
    }
  }

  private setState(state: QueueState) {
    if (state !== this.state) {
      this.state = state;
      app.io.emit('queue state update', state);
    }
  }

  private slotUpdated(slot: QueueSlot, sender?: SocketIO.Socket) {
    if (sender) {
      // broadcast event to everyone except the sender
      sender.broadcast.emit('queue slot update', slot);
    } else {
      app.io.emit('queue slot update', slot);
    }
  }

}

export const queue = new Queue();
