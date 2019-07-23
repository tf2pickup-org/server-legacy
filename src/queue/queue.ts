import { Inject } from 'typescript-ioc';
import { config } from '../config';
import { gameServerController } from '../game-servers/game-server-controller';
import { gameController } from '../games';
import { IoProvider } from '../io-provider';
import logger from '../logger';
import { Player } from '../players/models/player';
import { QueueConfig } from './models/queue-config';
import { QueueSlot } from './models/queue-slot';
import { QueueState } from './models/queue-state';
import { queueConfigs } from './queue-configs';

class Queue {

  public config: QueueConfig = queueConfigs[config.queueConfig];
  public slots: QueueSlot[] = [];
  public state: QueueState = 'waiting';
  public map: string;
  private timer: NodeJS.Timeout;
  @Inject private ioProvider: IoProvider;

  get requiredPlayerCount() {
    return this.config.classes.reduce((prev, curr) => prev + curr.count, 0) * this.config.teamCount;
  }

  get playerCount() {
    return this.slots.reduce((prev, curr) => curr.playerId ? prev + 1 : prev, 0);
  }

  get readyPlayerCount() {
    return this.slots.reduce((prev, curr) => curr.playerReady ? prev + 1 : prev, 0);
  }

  constructor() {
    logger.info(`queue config: ${config.queueConfig}`);
    this.reset();
    this.setupIo();
  }

  /**
   * Clears all slots, resets the queue to default state.
   */
  public reset() {
    this.resetSlots();
    this.ioProvider.io.emit('queue slots reset', this.slots);
    this.randomizeMap();
    this.ioProvider.io.emit('queue map updated', this.map);
    this.updateState();
  }

  /**
   * Joins the given player at the given spot.
   * @param slotId The slot to be taken.
   * @param playerId The player to take the slot.
   */
  public async join(slotId: number, playerId: string, sender?: SocketIO.Socket): Promise<QueueSlot> {
    const player = await Player.findById(playerId);
    if (!player) {
      throw new Error('no such player');
    }

    if (!!(await gameController.activeGameForPlayer(playerId))) {
      throw new Error('player involved in a currently active game');
    }

    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) {
      throw new Error('no such slot');
    }

    if (slot.playerId) {
      throw new Error('slot already taken');
    }

    // remove player from any slot he could be occupying
    this.slots.forEach(s => {
      if (s.playerId === playerId) {
        delete s.playerId;
        s.playerReady = false;
        this.slotUpdated(s);
      }
    });

    slot.playerId = playerId;
    if (this.state === 'ready') {
      slot.playerReady = true;
    }

    logger.info(`player "${player.name}" joined the queue at slot id=${slot.id} (game class: ${slot.gameClass})`);
    this.slotUpdated(slot, sender);
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
      if (slot.playerReady && (this.state === 'ready' || this.state === 'launching')) {
        throw new Error('cannot unready when already readied up');
      }

      delete slot.playerId;
      logger.info(`slot ${slot.id} freed`);
      this.slotUpdated(slot, sender);
      setTimeout(() => this.updateState(), 0);
      return slot;
    } else {
      return null;
    }
  }

  public async ready(playerId: string, sender?: SocketIO.Socket): Promise<QueueSlot> {
    if (this.state !== 'ready') {
      throw new Error('queue not ready');
    }

    const slot = this.slots.find(s => s.playerId === playerId);
    if (slot) {
      const player = await Player.findById(playerId);
      slot.playerReady = true;
      logger.info(`player "${player.name}" ready`);
      this.slotUpdated(slot, sender);
      setTimeout(() => this.updateState(), 0);
      return slot;
    } else {
      throw new Error('player is not in the queue');
    }
  }

  private resetSlots() {
    let lastId = 0;
    this.slots = this.config.classes.reduce((prev, curr) => {
      const tmpSlots = [];
      for (let i = 0; i < curr.count * this.config.teamCount; ++i) {
        tmpSlots.push({ id: lastId++, gameClass: curr.name, playerReady: false });
      }

      return prev.concat(tmpSlots);
    }, []);
  }

  private setupIo() {
    this.ioProvider.io.on('connection', socket => {
      if (socket.request.user.logged_in) {
        const player = socket.request.user;

        socket.on('disconnect', () => {
          try {
            queue.leave(player.id);
          } catch (error) { }
        });

        socket.on('join queue', async (slotId: number, done) => {
          try {
            const slot = await this.join(slotId, player.id, socket);
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

        socket.on('player ready', async done => {
          try {
            const slot = await this.ready(player.id, socket);
            done({ slot });
          } catch (error) {
            done({ error: error.message });
          }
        });
      }
    });
  }

  private updateState() {
    switch (this.state) {
      case 'waiting':
        if (this.playerCount === this.requiredPlayerCount) {
          this.setState('ready');
        }
        break;

      case 'ready':
        if (this.playerCount === 0) {
          this.setState('waiting');
        } else if (this.readyPlayerCount === this.requiredPlayerCount) {
          this.setState('launching');
        }
        break;

      case 'launching':
        this.setState('waiting');
        break;
    }
  }

  private setState(state: QueueState) {
    if (state !== this.state) {
      logger.info(`queue state change (${this.state} => ${state})`);
      this.onStateChange(this.state, state);
      this.state = state;
      this.ioProvider.io.emit('queue state update', state);
    }
  }

  private onStateChange(oldState: QueueState, newState: QueueState) {
    if (oldState === 'waiting' && newState === 'ready') {
      this.timer = setTimeout(() => this.readyUpTimeout(), this.config.readyUpTimeout);
    } else if (oldState === 'ready' && newState === 'launching') {
      delete this.timer;
      this.launch();
    } else if (oldState === 'launching' && newState === 'waiting') {
      delete this.timer;
    } else if (oldState === 'ready' && newState === 'waiting') {
      this.cleanupQueue();
    }
  }

  private slotUpdated(slot: QueueSlot, sender?: SocketIO.Socket) {
    if (sender) {
      // broadcast event to everyone except the sender
      sender.broadcast.emit('queue slot update', slot);
    } else {
      this.ioProvider.io.emit('queue slot update', slot);
    }
  }

  private readyUpTimeout() {
    if (this.readyPlayerCount === this.requiredPlayerCount) {
      this.setState('launching');
    } else {
      this.setState('waiting');
    }
  }

  private cleanupQueue() {
    this.slots.forEach(s => {
      if (!s.playerReady) {
        delete s.playerId;
      } else {
        s.playerReady = false;
      }
      this.slotUpdated(s);
    });
  }

  private async launch() {
    const game = await gameController.create(this.slots, this.map);
    logger.info(`game ${game.id} created`);

    const server = await gameServerController.findFirstFreeGameServer();
    if (server) {
      await gameServerController.assignGame(server, game);
      logger.info(`game ${game.id} will be played on ${server.name}`);
      await gameController.launch(this.config, game, server);
    } else {
      logger.error('no servers available!');
      await gameController.interruptGame(game.id, 'no servers available');
    }

    setTimeout(() => this.reset(), 0);
  }

  private randomizeMap() {
    this.map = this.config.maps[Math.floor(Math.random() * this.config.maps.length)];
  }

}

export const queue = new Queue();
