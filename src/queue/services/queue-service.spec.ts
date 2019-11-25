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
    emit: () => { },
  },
};

const gameServiceStub = {
  activeGameForPlayer: () => null,
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
    readyUpTimeout: 30,
    nextMapSuccessfulVoteThreshold: 2,
  },
};

const playerBansServiceStub = {
  on: () => { },
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
      const slot = await service.join(0, player.id);
      expect(slot.playerId).toEqual(player.id);
      expect(slot.playerReady).toBe(false);
      expect(slot.votesForMapChange).toBe(false);
      expect(slot.friend).toBeFalsy();
    });

    it('should ready up immediately if the queue is in ready state', async () => {
      service.state = 'ready';
      const slot = await service.join(0, player.id);
      expect(slot.playerReady).toBe(true);
    });

    it('should remove the player from already taken slot', async () => {
      const oldSlot = await service.join(0, player.id);
      const newSlot = await service.join(1, player.id);
      expect(newSlot.playerId).toEqual(player.id);
      expect(oldSlot.playerId).toBeFalsy();
    });

    it('should emit the event', async () => {
      const spy = spyOn(service, 'emit');
      await service.join(0, player.id);
      expect(spy).toHaveBeenCalled();
    });

    it('should emit the event over ws', async () => {
      const spy = spyOn(wsProviderServiceStub.ws, 'emit');
      await service.join(0, player.id);
      expect(spy).toHaveBeenCalled();
    });

    it('should update queue numbers', async () => {
      expect(service.playerCount).toEqual(0);
      await service.join(0, player.id);
      expect(service.playerCount).toEqual(1);
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
      expect(spy).toHaveBeenCalled();
    });

    it('should emit the ws event', () => {
      const spy = spyOn(wsProviderServiceStub.ws, 'emit');
      service.leave(player.id);
      expect(spy).toHaveBeenCalled();
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
});
