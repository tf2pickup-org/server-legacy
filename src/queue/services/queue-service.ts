import { EventEmitter } from 'events';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { WsProviderService } from '../../core';
import { GameService } from '../../games/services/game-service';
import { playerModel } from '../../players/models/player';
import { PlayerBansService } from '../../players/services/player-bans-service';
import { QueueSlot } from '../models/queue-slot';
import { QueueState } from '../models/queue-state';
import { QueueConfigService } from './queue-config-service';

@provide(QueueService)
export class QueueService extends EventEmitter {

  public slots: QueueSlot[] = [];
  public state: QueueState = 'waiting';
  private timer: NodeJS.Timeout;
  private ws = this.wsProvider.ws;

  public get requiredPlayerCount() {
    return this.queueConfigService.queueConfig.classes
      .reduce((prev, curr) => prev + curr.count, 0) * this.queueConfigService.queueConfig.teamCount;
  }

  public get playerCount() {
    return this.slots.filter(s => !!s.playerId).length;
  }

  public get readyPlayerCount() {
    return this.slots.filter(s => s.playerReady).length;
  }

  constructor(
    @inject(WsProviderService) private wsProvider: WsProviderService,
    @inject(GameService) private gameService: GameService,
    @inject(QueueConfigService) private queueConfigService: QueueConfigService,
    @inject(PlayerBansService) private playerBansService: PlayerBansService,
  ) {
    super();
    this.playerBansService.on('player banned', playerId => this.kick(playerId));
    this.reset();
  }

  /**
   * Clears all slots, resets the queue to default state.
   */
  public reset() {
    this.resetSlots();
    this.ws.emit('queue slots reset', this.slots);
    this.updateState();
  }

  /**
   * Joins the given player at the given spot.
   * @param slotId The slot to be taken.
   * @param playerId The player to take the slot.
   */
  public async join(slotId: number, playerId: string, sender?: SocketIO.Socket): Promise<QueueSlot> {
    const player = await playerModel.findById(playerId);
    if (!player) {
      throw new Error('no such player');
    }

    const bans  = await this.playerBansService.getActiveBansForPlayer(playerId);
    if (bans.length > 0) {
      throw new Error('user is banned from joining the queue');
    }

    if (!!(await this.gameService.activeGameForPlayer(playerId))) {
      throw new Error('player involved in a currently active game');
    }

    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) {
      throw new Error('no such slot');
    }

    if (slot.playerId) {
      throw new Error('slot already taken');
    }

    let tmpAttributes = {
      friend: null,
    };

    // remove player from any slot he could be occupying
    this.slots.forEach(s => {
      if (s.playerId === playerId) {
        delete s.playerId;
        s.playerReady = false;
        tmpAttributes = { friend: s.friend };
        delete s.friend;
        this.slotUpdated(s);
      }
    });

    slot.playerId = playerId;
    if (this.state === 'ready') {
      slot.playerReady = true;
    }

    Object.assign(slot, tmpAttributes);
    if (slot.gameClass !== 'medic') {
      delete slot.friend;
    }

    this.slotUpdated(slot, sender);

    setImmediate(() => this.updateState());
    this.emit('player_join', playerId);
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
        throw new Error('cannot unready');
      }

      delete slot.playerId;
      delete slot.friend;
      this.slotUpdated(slot, sender);
      setImmediate(() => this.updateState());
      this.emit('player_leave', playerId);
      return slot;
    } else {
      return null;
    }
  }

  public isInQueue(playerId: string): boolean {
    return !!this.slots.find(s => s.playerId === playerId);
  }

  public kick(playerId: string) {
    const slot = this.slots.find(s => s.playerId === playerId);
    if (slot) {
      if (this.state === 'launching') {
        return;
      }

      delete slot.playerId;
      delete slot.friend;
      this.slotUpdated(slot);
      setImmediate(() => this.updateState());
      this.emit('player_leave', playerId);
    }
  }

  public ready(playerId: string, sender?: SocketIO.Socket): QueueSlot {
    if (this.state !== 'ready') {
      throw new Error('queue not ready');
    }

    const slot = this.slots.find(s => s.playerId === playerId);
    if (slot) {
      slot.playerReady = true;
      this.slotUpdated(slot, sender);
      this.updateState();
      return slot;
    } else {
      throw new Error('player is not in the queue');
    }
  }

  public async markFriend(playerId: string, friendId: string, sender?: SocketIO.Socket) {
    if (this.state === 'launching') {
      throw new Error('can\'t mark friends now');
    }

    const slot = this.slots.find(s => s.playerId === playerId);
    if (!slot) {
      throw new Error('player is not in the queue');
    }

    if (slot.gameClass !== 'medic') { // todo make this configurable
      throw new Error('only medics can mark friends');
    }

    const friendSlot = this.slots.find(s => s.playerId === friendId);
    if (friendSlot && friendSlot.gameClass === slot.gameClass) {
      throw new Error('cannot mark this player as a friend');
    }

    slot.friend = friendId;
    this.slotUpdated(slot, sender);
    return slot;
  }

  private resetSlots() {
    let lastId = 0;
    this.slots = this.queueConfigService.queueConfig.classes.reduce((prev, curr) => {
      const tmpSlots = [];
      for (let i = 0; i < curr.count * this.queueConfigService.queueConfig.teamCount; ++i) {
        tmpSlots.push({ id: lastId++, gameClass: curr.name, playerReady: false, votesForMapChange: false });
      }

      return prev.concat(tmpSlots);
    }, []);
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
      this.onStateChange(this.state, state);
      this.state = state;
      this.ws.emit('queue state update', state);
      this.emit('state_change', state);
    }
  }

  private onStateChange(oldState: QueueState, newState: QueueState) {
    if (oldState === 'waiting' && newState === 'ready') {
      this.timer = setTimeout(() => this.readyUpTimeout(), this.queueConfigService.queueConfig.readyUpTimeout);
    } else if (oldState === 'ready' && newState === 'launching') {
      delete this.timer;
    } else if (oldState === 'launching' && newState === 'waiting') {
      delete this.timer;
    } else if (oldState === 'ready' && newState === 'waiting') {
      this.cleanupQueue();
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

  private slotUpdated(slot: QueueSlot, sender?: SocketIO.Socket) {
    if (sender) {
      // broadcast event to everyone except the sender
      sender.broadcast.emit('queue slot update', slot);
    } else {
      this.ws.emit('queue slot update', slot);
    }
  }

}
