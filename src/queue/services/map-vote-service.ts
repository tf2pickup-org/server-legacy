import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { maxBy, shuffle } from 'lodash';
import { WsProviderService } from '../../core/services';
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

  private lastPlayedMap: string;
  private readonly mapVoteOptionCount = 3;
  private votes: MapVote[];

  constructor(
    @inject(QueueConfigService) private queueConfigService: QueueConfigService,
    @inject(QueueService) private queueService: QueueService,
    @inject(WsProviderService) private wsProvider: WsProviderService,
  ) {
    this.reset();
  }

  public voteCountForMap(map: Tf2Map): number {
    return this.votes.filter(v => v.map === map).length;
  }

  public voteForMap(playerId: string, map: Tf2Map) {
    if (!this.mapOptions.includes(map)) {
      throw new Error('this map is not an option in the vote');
    }

    this.votes = [
      ...this.votes.filter(v => v.playerId !== playerId),
      { map, playerId },
    ];

    this.wsProvider.ws.emit('map vote results update', this.results);
  }

  /**
   * Decides the winner and resets the vote.
   */
  public getWinner() {
    const maxVotes = maxBy(this.results, r => r.voteCount).voteCount;
    const mapsWithMaxVotes = this.results.filter(m => m.voteCount === maxVotes);
    const map = mapsWithMaxVotes[Math.floor(Math.random() * mapsWithMaxVotes.length)].map;
    this.lastPlayedMap = map;
    setImmediate(() => this.reset());
    return map;
  }

  private reset() {
    this.mapOptions = shuffle(this.queueConfigService.queueConfig.maps.filter(m => m !== this.lastPlayedMap))
      .slice(0, this.mapVoteOptionCount);
    this.votes = [];
    this.wsProvider.ws.emit('map vote results update', this.results);
  }

}
