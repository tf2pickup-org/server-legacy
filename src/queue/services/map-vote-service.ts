import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { maxBy, shuffle } from 'lodash';
import { Tf2Map } from '../../queue/models/tf2-map';
import { QueueConfigService } from './queue-config-service';
import { QueueService } from './queue-service';

interface MapVote {
  playerId: string;
  map: Tf2Map;
}

interface MapVoteResult {
  map: Tf2Map;
  voteCount: number;
}

@provide(MapVoteService)
export class MapVoteService {

  public mapOptions: Tf2Map[];

  get results(): MapVoteResult[] {
    return this.mapOptions
      .map(map => ({ map, voteCount: this.voteCountForMap(map) }));
  }

  get bestMap(): Tf2Map {
    return maxBy(this.results, r => r.voteCount)?.map;
  }

  private lastPlayedMap: string;
  private readonly mapVoteOptionCount = 3;
  private votes: MapVote[];

  constructor(
    @inject(QueueConfigService) private queueConfigService: QueueConfigService,
    @inject(QueueService) private queueService: QueueService,
  ) {
    this.reset();
  }

  public voteCountForMap(map: Tf2Map): number {
    return this.votes.filter(v => v.map === map).length;
  }

  private reset() {
    if (this.votes?.length > 0) {
      this.lastPlayedMap = this.bestMap;
    }

    this.mapOptions = shuffle(this.queueConfigService.queueConfig.maps.filter(m => m !== this.lastPlayedMap))
      .slice(0, this.mapVoteOptionCount);
    this.votes = [];
  }

}
