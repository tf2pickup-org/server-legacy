import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { shuffle } from 'lodash';
import { WsProviderService } from '../../core';
import { GameService } from '../../games/services/game-service';
import logger from '../../logger';
import { playerModel } from '../../players/models/player';
import { PlayerBansService } from '../../players/services/player-bans-service';
import { QueueSlot } from '../models/queue-slot';
import { QueueState } from '../models/queue-state';
import { Tf2Map } from '../models/tf2-map';
import { QueueConfigService } from './queue-config-service';

@provide(QueueService)
export class QueueService {

  public slots: QueueSlot[] = [];
  public state: QueueState = 'waiting';
  public map: string;
  private timer: NodeJS.Timeout;
  private ws = this.wsProvider.ws;
  private mapPool: Tf2Map[] = [];

  public get requiredPlayerCount() {
    return this.queueConfigService.queueConfig.classes
      .reduce((prev, curr) => prev + curr.count, 0) * this.queueConfigService.queueConfig.teamCount;
  }

  public get playerCount() {
    return this.slots.reduce((prev, curr) => curr.playerId ? prev + 1 : prev, 0);
  }

  public get readyPlayerCount() {
    return this.slots.reduce((prev, curr) => curr.playerReady ? prev + 1 : prev, 0);
  }

  public get mapChangeVoterCount() {
    return this.slots.reduce((prev, curr) => curr.votesForMapChange ? prev + 1 : prev, 0);
  }

  constructor(
    @inject(WsProviderService) private wsProvider: WsProviderService,
    @inject(GameService) private gameService: GameService,
    @inject(QueueConfigService) private queueConfigService: QueueConfigService,
    @inject(PlayerBansService) private playerBansService: PlayerBansService,
  ) {
    this.reset();
  }

  /**
   * Clears all slots, resets the queue to default state.
   */
  public reset() {
    this.resetSlots();
    this.ws.emit('queue slots reset', this.slots);
    this.randomizeMap();
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

    let votesForMapChange = false;

    // remove player from any slot he could be occupying
    this.slots.forEach(s => {
      if (s.playerId === playerId) {
        delete s.playerId;
        s.playerReady = false;
        votesForMapChange = s.votesForMapChange;
        s.votesForMapChange = false;
        this.slotUpdated(s);
      }
    });

    slot.playerId = playerId;
    if (this.state === 'ready') {
      slot.playerReady = true;
    } else {
      slot.votesForMapChange = votesForMapChange;
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
      slot.votesForMapChange = false;
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
      const player = await playerModel.findById(playerId);
      slot.playerReady = true;
      logger.info(`player "${player.name}" ready`);
      this.slotUpdated(slot, sender);
      setTimeout(() => this.updateState(), 0);
      return slot;
    } else {
      throw new Error('player is not in the queue');
    }
  }

  public async voteForMapChange(playerId: string, value: boolean, voter?: SocketIO.Socket) {
    if (this.state !== 'waiting') {
      throw new Error('can vote only when waiting');
    }

    const slot = this.slots.find(s => s.playerId === playerId);
    if (slot) {
      slot.votesForMapChange = value;
      this.slotUpdated(slot, voter);
      setTimeout(() => this.shouldChangeMap(), 0);
      return slot;
    } else {
      throw new Error('player is not in the queue');
    }
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

  private randomizeMap() {
    if (this.mapPool.length === 0) {
      this.mapPool = shuffle(this.queueConfigService.queueConfig.maps);
      while (this.mapPool[0] === this.map) {
        this.mapPool = shuffle(this.queueConfigService.queueConfig.maps);
      }
    }
    this.map = this.mapPool.shift();
    this.ws.emit('queue map updated', this.map);
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
      this.ws.emit('queue state update', state);
    }
  }

  private onStateChange(oldState: QueueState, newState: QueueState) {
    if (oldState === 'waiting' && newState === 'ready') {
      this.timer = setTimeout(() => this.readyUpTimeout(), this.queueConfigService.queueConfig.readyUpTimeout);
    } else if (oldState === 'ready' && newState === 'launching') {
      delete this.timer;
      this.launch();
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

  private async launch() {
    await this.gameService.create(this.slots, this.queueConfigService.queueConfig, this.map);
    setTimeout(() => this.reset(), 0);
  }

  private slotUpdated(slot: QueueSlot, sender?: SocketIO.Socket) {
    if (sender) {
      // broadcast event to everyone except the sender
      sender.broadcast.emit('queue slot update', slot);
    } else {
      this.ws.emit('queue slot update', slot);
    }
  }

  private shouldChangeMap() {
    if (this.mapChangeVoterCount >= this.queueConfigService.queueConfig.nextMapSuccessfulVoteThreshold) {
      this.randomizeMap();
      this.resetAllVotes();
    }
  }

  private resetAllVotes() {
    this.slots.forEach(s => {
      s.votesForMapChange = false;
      this.slotUpdated(s);
    });
  }

}
