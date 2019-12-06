import { EventEmitter } from 'events';
import { Container } from 'inversify';
import { GameService } from '../../games/services/game-service';
import { QueueSlot } from '../../queue/models/queue-slot';
import { GameLauncherService } from './game-launcher-service';
import { MapVoteService } from './map-vote-service';
import { QueueConfigService } from './queue-config-service';
import { QueueService } from './queue-service';

const gameServiceStub = {
  create: (queueSlots, queueConfig, map) => null,
};

class QueueServiceStub extends EventEmitter {
  public slots: QueueSlot[] = [];
  public reset() { }
}

const queueServiceStub = new QueueServiceStub();

const queueConfigServiceStub = {
  queueConfig: {

  },
};

const mapVoteServiceStub = {
  getWinner: () => 'cp_fake_rc1',
};

describe('GameLauncherService', () => {
  const container = new Container();
  let service: GameLauncherService;

  beforeAll(() => {
    container.bind(GameService).toConstantValue(gameServiceStub as GameService);
    container.bind(QueueService).toConstantValue(queueServiceStub as QueueService);
    container.bind(QueueConfigService).toConstantValue(queueConfigServiceStub as QueueConfigService);
    container.bind(MapVoteService).toConstantValue(mapVoteServiceStub as MapVoteService);
  });

  beforeEach(() => service = container.resolve(GameLauncherService));

  it('should launch the game once its ready', async () => {
    const spyCreate = spyOn(gameServiceStub, 'create').and.callThrough();
    const spyReset = spyOn(queueServiceStub, 'reset').and.callThrough();

    queueServiceStub.slots = [
      { id: 0, gameClass: 'soldier', playerId: 'FAKE_PLAYER_1', playerReady: true },
      { id: 1, gameClass: 'soldier', playerId: 'FAKE_PLAYER_2', playerReady: true },
    ];
    queueServiceStub.emit('state_change', 'launching');

    expect(spyCreate).toHaveBeenCalledWith(
      queueServiceStub.slots,
      queueConfigServiceStub.queueConfig,
      'cp_fake_rc1',
    );

    await new Promise(resolve => resolve());
    expect(spyReset).toHaveBeenCalled();
  });

});
