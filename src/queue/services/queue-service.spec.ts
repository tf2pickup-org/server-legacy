import { Container } from 'inversify';
import { ObjectId } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Document } from 'mongoose';
import { WsProviderService } from '../../core/services/ws-provider-service';
import { GameService } from '../../games/services/game-service';
import { Player, playerModel } from '../../players/models/player';
import { PlayerBansService } from '../../players/services/player-bans-service';
import { QueueConfigService } from './queue-config-service';
import { QueueService } from './queue-service';

const wsProviderServiceStub = {
  ws: {
    emit: (...args: any[]) => null,
  },
};

const gameServiceStub = {
  activeGameForPlayer: () => null,
  create: (queueSlots, queueConfig, map, friends) => null,
};

const queueConfigServiceStub = {
  queueConfig: {
    classes: [
      { name: 'scout', count: 2 },
      { name: 'soldier', count: 2 },
      { name: 'demoman', count: 1 },
      { name: 'medic', count: 1 },
    ],
    teamCount: 2,
    maps: ['fake_map_1', 'fake_map_2'],
    readyUpTimeout: 1000,
    nextMapSuccessfulVoteThreshold: 2,
  },
};

const playerBansServiceStub = {
  on: () => null,
  getActiveBansForPlayer: () => [],
};

describe('QueueService', () => {
  const container = new Container();
  const mongod = new MongoMemoryServer();
  let service: QueueService;

  beforeAll(async () => {
    const uri = await mongod.getConnectionString();
    await connect(uri, { useNewUrlParser: true });
  });

  beforeAll(() => {
    container.bind(WsProviderService).toConstantValue(wsProviderServiceStub as unknown as WsProviderService);
    container.bind(GameService).toConstantValue(gameServiceStub as unknown as GameService);
    container.bind(QueueConfigService).toConstantValue(queueConfigServiceStub as QueueConfigService);
    container.bind(PlayerBansService).toConstantValue(playerBansServiceStub as unknown as PlayerBansService);
  });

  beforeEach(() => {
    service = container.resolve(QueueService);
  });

  it('should reset all slots initially', () => {
    expect(service.slots.length).toBe(12);
    expect(service.playerCount).toEqual(0);
    expect(service.readyPlayerCount).toEqual(0);
  });

  it('should reset state', () => {
    expect(service.state).toEqual('waiting');
  });

  describe('#join()', () => {
    let player: Document & Player;

    beforeAll(async () => {
      player = await playerModel.create({
        name: 'FAKE_PLAYER',
        steamId: 'FAKE_STEAM_ID',
      });
    });

    afterAll(async () => await playerModel.deleteMany({ }));

    it('should deny unknown players', async () => {
      const unknownPlayerId = new ObjectId();
      await expectAsync(service.join(0, unknownPlayerId.toHexString())).toBeRejected();
    });

    it('should deny player with active bans', async () => {
      spyOn(playerBansServiceStub, 'getActiveBansForPlayer').and.returnValue([{}]);
      await expectAsync(service.join(0, player.id)).toBeRejected();
    });

    it('should deny player with an active game', async () => {
      spyOn(gameServiceStub, 'activeGameForPlayer').and.returnValue({ });
      await expectAsync(service.join(0, player.id)).toBeRejected();
    });

    it('should deny unknown slots', async () => {
      await expectAsync(service.join(12, player.id)).toBeRejected();
    });

    it('should reject joining a slot that is already occupied', async () => {
      service.slots[0].playerId = 'FAKE_PLAYER_ID';
      await expectAsync(service.join(0, player.id)).toBeRejected();
    });

    it('should store the id of the player that joined', async () => {
      const slots = await service.join(0, player.id);
      expect(slots.length).toEqual(1);
      const slot = slots[0];
      expect(slot.playerId).toEqual(player.id);
      expect(slot.playerReady).toBe(false);
      expect(slot.friend).toBeUndefined();
    });

    it('should ready up immediately if the queue is in ready state', async () => {
      service.state = 'ready';
      const slots = await service.join(0, player.id);
      expect(slots.length).toEqual(1);
      const slot = slots[0];
      expect(slot.playerReady).toBe(true);
    });

    it('should remove the player from already taken slot', async () => {
      const oldSlots = await service.join(0, player.id);
      const newSlots = await service.join(1, player.id);
      expect(newSlots.length).toEqual(2);
      expect(newSlots.find(s => s.playerId === player.id)).toBeTruthy();
      expect(oldSlots[0].playerId).toBeUndefined();
    });

    it('should emit the event', async () => {
      const spy = spyOn(service, 'emit');
      await service.join(0, player.id);
      expect(spy).toHaveBeenCalledWith('player_join', player.id);
    });

    it('should emit the event over ws', async () => {
      const spy = spyOn(wsProviderServiceStub.ws, 'emit');
      const slots = await service.join(0, player.id);
      expect(spy).toHaveBeenCalledWith('queue slots update', slots);
    });

    it('should update queue numbers', async () => {
      expect(service.playerCount).toEqual(0);
      await service.join(0, player.id);
      expect(service.playerCount).toEqual(1);
    });

    it('should remember friend when changing slots', async () => {
      const medicSlots = service.slots.filter(s => s.gameClass === 'medic');
      expect(medicSlots.length).toBe(2);

      let slots = await service.join(medicSlots[0].id, player.id);
      slots[0].friend = 'FAKE_FRIEND_ID';

      slots = await service.join(medicSlots[1].id, player.id);
      expect(slots.find(s => s.playerId === player.id).friend).toEqual('FAKE_FRIEND_ID');
    });

    it('should clear friend when chaning slots to non-medic one', async () => {
      const medicSlot = service.slots.find(s => s.gameClass === 'medic');
      const otherSlot = service.slots.find(s => s.gameClass !== 'medic');

      let slots = await service.join(medicSlot.id, player.id);
      slots[0].friend = 'FAKE_FRIEND_ID';

      slots = await service.join(otherSlot.id, player.id);
      expect(slots.find(s => s.playerId === player.id).friend).toBeUndefined();
    });
  });

  describe('#leave()', () => {
    let player: Document & Player;

    beforeAll(async () => {
      player = await playerModel.create({
        name: 'FAKE_PLAYER',
        steamId: 'FAKE_STEAM_ID',
      });
    });

    afterAll(async () => await playerModel.deleteMany({ }));

    beforeEach(async () => {
      await service.join(0, player.id);
    });

    it('should reset the slot', () => {
      const slot = service.leave(player.id);
      expect(slot.playerId).toBeFalsy();
    });

    it('should emit the event', () => {
      const spy = spyOn(service, 'emit');
      service.leave(player.id);
      expect(spy).toHaveBeenCalledWith('player_leave', player.id);
    });

    it('should emit the ws event', () => {
      const spy = spyOn(wsProviderServiceStub.ws, 'emit');
      const slot = service.leave(player.id);
      expect(spy).toHaveBeenCalledWith('queue slots update', [ slot ]);
    });

    it('should deny leaving the queue when the player is readied up', () => {
      service.state = 'ready';
      const slot = service.slots.find(s => s.playerId === player.id);
      slot.playerReady = true;
      expect(() => service.leave(player.id)).toThrowError();
    });

    it('should update queue numbers', () => {
      expect(service.playerCount).toEqual(1);
      service.leave(player.id);
      expect(service.playerCount).toEqual(0);
    });
  });

  describe('#ready()', () => {
    let player: Document & Player;

    beforeAll(async () => {
      player = await playerModel.create({
        name: 'FAKE_PLAYER',
        steamId: 'FAKE_STEAM_ID',
      });
    });

    afterAll(async () => await playerModel.deleteMany({ }));

    beforeEach(async () => {
      await service.join(0, player.id);
    });

    it('should deny readying up unless the queue is in ready state', () => {
      expect(service.state).toEqual('waiting');
      expect(() => service.ready(player.id)).toThrowError();
    });

    it('should mark the given slot as ready', () => {
      const spy = spyOn(wsProviderServiceStub.ws, 'emit');
      service.state = 'ready';
      const slot = service.ready(player.id);
      expect(slot.playerReady).toBe(true);
      expect(service.readyPlayerCount).toEqual(1);
      expect(spy).toHaveBeenCalledWith('queue slots update', [ slot ]);
    });
  });

  describe('#markFriend()', () => {
    let medic: Document & Player;
    let medicSlot: number;
    let soldier: Document & Player;
    let soldierSlot: number;

    beforeAll(async () => {
      [ medic, soldier ] = await playerModel.create([
        { name: 'FAKE_PLAYER_1', steamId: 'FAKE_STEAM_ID_1' },
        { name: 'FAKE_PLAYER_2', steamId: 'FAKE_STEAM_ID_2' },
      ]);
    });

    afterAll(async () => await playerModel.deleteMany({ }));

    beforeEach(() => {
      medicSlot = service.slots.find(s => s.gameClass === 'medic').id;
      soldierSlot = service.slots.find(s => s.gameClass === 'soldier').id;
    });

    it('should deny if the queue is in launching state', async () => {
      await service.join(medicSlot, medic.id);
      await service.join(soldierSlot, soldier.id);
      service.state = 'launching';
      expectAsync(service.markFriend(medic.id, soldier.id)).toBeRejected();
    });

    it('should deny if the given friend is not in the queue', async () => {
      await service.join(medicSlot, medic.id);
      expectAsync(service.markFriend(medic.id, soldier.id)).toBeRejected();
    });

    it('should deny classes other than medic', async () => {
      await service.join(medicSlot, medic.id);
      await service.join(soldierSlot, soldier.id);
      expectAsync(service.markFriend(soldier.id, medic.id)).toBeRejected();
    });

    it('should deny marking the other medic', async () => {
      const otherMedicSlot = service.slots.find(s => s.gameClass === 'medic' && s.id !== medicSlot).id;
      await service.join(medicSlot, medic.id);
      await service.join(otherMedicSlot, soldier.id);
      expectAsync(service.markFriend(medic.id, soldier.id)).toBeRejected();
    });

    it('should save friends id', async () => {
      await service.join(medicSlot, medic.id);
      await service.join(soldierSlot, soldier.id);

      const spy = spyOn(wsProviderServiceStub.ws, 'emit');
      const slot = await service.markFriend(medic.id, soldier.id);
      expect(slot.friend).toEqual(soldier.id);
      expect(spy).toHaveBeenCalledWith('queue slots update', [ slot ]);
    });
  });

  describe('state', () => {
    const wait = () => new Promise(resolve => setImmediate(resolve));
    let players: Array<Player & Document>;

    beforeEach(async () => {
      players = await Promise.all(
        [...Array(12).keys()]
          .map(id => playerModel.create({ name: `FAKE_PLAYER_${id}`, steamId: `FAKE_STEAM_ID_${id}` })),
      );
    });

    afterEach(async () => await playerModel.deleteMany({ }));

    it('should change waiting->ready->launching->waiting', async () => {
      expect(service.state).toEqual('waiting');
      const spy = spyOn(service, 'emit');

      for (let i = 0; i < 12; ++i) {
        await service.join(i, players[i].id);
      }

      await wait();
      expect(service.state).toEqual('ready');
      expect(spy).toHaveBeenCalledWith('state_change', 'ready');

      for (let i = 0; i < 12; ++i) {
        service.ready(players[i].id);
      }

      await wait();
      expect(spy).toHaveBeenCalledWith('state_change', 'launching');
      expect(service.state).toEqual('launching');

      service.reset();
      expect(service.state).toEqual('waiting');
      expect(spy).toHaveBeenCalledWith('state_change', 'waiting');
    });

    it('should change waiting->ready->waiting', async () => {
      jasmine.clock().install();

      expect(service.state).toEqual('waiting');

      for (let i = 0; i < 12; ++i) {
        await service.join(i, players[i].id);
      }

      await wait();
      expect(service.state).toEqual('ready');

      jasmine.clock().tick(queueConfigServiceStub.queueConfig.readyUpTimeout + 1);

      expect(service.state).toEqual('waiting');
      expect(service.slots.every(s => !s.playerId)).toBe(true);

      jasmine.clock().uninstall();
    });
  });
});
