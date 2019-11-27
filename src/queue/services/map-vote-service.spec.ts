import { Container } from 'inversify';
import { MapVoteService } from './map-vote-service';
import { QueueConfigService } from './queue-config-service';
import { QueueService } from './queue-service';

const queueConfigServiceStub = {
  queueConfig: {
    maps: [1, 2, 3, 4].map(n => `fake_map_${n}`),
  },
};

const queueServiceStub = {

};

describe('MapVoteService', () => {
  const container = new Container();
  let service: MapVoteService;

  beforeAll(() => {
    container.bind(QueueConfigService).toConstantValue(queueConfigServiceStub as unknown as QueueConfigService);
    container.bind(QueueService).toConstantValue(queueServiceStub as QueueService);
  });

  beforeEach(() => service = container.resolve(MapVoteService));

  it('should reset all votes initially', () => {
    expect(service.mapOptions.every(m => queueConfigServiceStub.queueConfig.maps.includes(m))).toBe(true);
    expect(service.results.every(r => r.voteCount === 0)).toBe(true);
  });
});
