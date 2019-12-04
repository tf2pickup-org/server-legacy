import { EventEmitter } from 'events';
import { Container } from 'inversify';
import { WsProviderService } from '../../core/services';
import { MapVoteService } from './map-vote-service';
import { QueueConfigService } from './queue-config-service';
import { QueueService } from './queue-service';

const queueConfigServiceStub = {
  queueConfig: {
    maps: [1, 2, 3, 4].map(n => `fake_map_${n}`),
  },
};

class QueueServiceStub extends EventEmitter {
  public isInQueue(playerId: string) { return true; }
}

const queueServiceStub = new QueueServiceStub();

const wsProviderServiceStub = {
  ws: {
    emit: (...args: any[]) => { },
  },
};

describe('MapVoteService', () => {
  const container = new Container();
  let service: MapVoteService;

  beforeAll(() => {
    container.bind(QueueConfigService).toConstantValue(queueConfigServiceStub as unknown as QueueConfigService);
    container.bind(QueueService).toConstantValue(queueServiceStub as QueueService);
    container.bind(WsProviderService).toConstantValue(wsProviderServiceStub as WsProviderService);
  });

  beforeEach(() => service = container.resolve(MapVoteService));

  it('should reset all votes initially', () => {
    expect(service.mapOptions.every(m => queueConfigServiceStub.queueConfig.maps.includes(m))).toBe(true);
    expect(service.results.every(r => r.voteCount === 0)).toBe(true);
  });

  describe('#voteForMap()', () => {
    beforeEach(() => {
      service.mapOptions = ['cp_badlands', 'cp_process_final', 'cp_snakewater_final1'];
    });

    it('should save the vote', () => {
      service.voteForMap('FAKE_ID', 'cp_badlands');
      expect(service.results).toEqual([
        { map: 'cp_badlands', voteCount: 1 },
        { map: 'cp_process_final', voteCount: 0 },
        { map: 'cp_snakewater_final1', voteCount: 0 },
      ]);
      expect(service.voteCountForMap('cp_badlands')).toEqual(1);
    });

    it('should emit an event over the ws', () => {
      const spy = spyOn(wsProviderServiceStub.ws, 'emit');
      service.voteForMap('FAKE_ID', 'cp_badlands');
      expect(spy).toHaveBeenCalledWith('map vote results update', jasmine.any(Object));
    });

    it('should deny voting for maps out of pool', () => {
      expect(() => service.voteForMap('FAKE_ID', 'cp_sunshine')).toThrowError();
    });

    it('should deny voting if the player is not in the queue', () => {
      const spy = spyOn(queueServiceStub, 'isInQueue').and.returnValue(false);
      expect(() => service.voteForMap('FAKE_ID', 'cp_badlands')).toThrowError();
    });

    it('should remove the player\'s vote when the player leaves the queue', () => {
      service.voteForMap('FAKE_PLAYER_ID', 'cp_badlands');
      expect(service.voteCountForMap('cp_badlands')).toEqual(1);

      const spy = spyOn(wsProviderServiceStub.ws, 'emit');

      queueServiceStub.emit('player_leave', 'FAKE_PLAYER_ID');
      expect(service.voteCountForMap('cp_badlands')).toEqual(0);

      expect(spy).toHaveBeenCalledWith('map vote results update', jasmine.any(Object));
    });
  });

  describe('#getWinner()', () => {
    beforeEach(() => {
      service.mapOptions = ['cp_badlands', 'cp_process_final', 'cp_snakewater_final1'];
    });

    it('should return the map with the most votes', () => {
      service.voteForMap('FAKE_ID', 'cp_badlands');
      expect(service.getWinner()).toEqual('cp_badlands');
    });

    it('should return one of two most-voted maps', () => {
      service.voteForMap('FAKE_ID_1', 'cp_badlands');
      service.voteForMap('FAKE_ID_2', 'cp_process_final');
      expect(service.getWinner()).toMatch(/cp_badlands|cp_process_final/);
    });

    it('should eventually reset the vote', done => {
      service.voteForMap('FAKE_ID_1', 'cp_badlands');
      service.voteForMap('FAKE_ID_2', 'cp_process_final');

      const spy = spyOn(wsProviderServiceStub.ws, 'emit');
      const map = service.getWinner();
      setImmediate(() => {
        expect(spy).toHaveBeenCalledWith('map vote results update', jasmine.any(Array));
        expect(service.results.every(r => r.voteCount === 0)).toBe(true);
        expect(service.mapOptions.every(m => m !== map));
        done();
      });
    });
  });
});
