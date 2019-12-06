import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { GameService } from '../../games/services/game-service';
import { QueueState } from '../models/queue-state';
import { MapVoteService } from './map-vote-service';
import { QueueConfigService } from './queue-config-service';
import { QueueService } from './queue-service';

@provide(GameLauncherService)
export class GameLauncherService {

  constructor(
    @inject(GameService) private gameService: GameService,
    @inject(QueueService) private queueService: QueueService,
    @inject(QueueConfigService) private queueConfigService: QueueConfigService,
    @inject(MapVoteService) private mapVoteService: MapVoteService,
  ) {
    this.queueService.on('state_change', (state: QueueState) => {
      if (state === 'launching') {
        this.launchGame();
      }
    });
  }

  private async launchGame() {
    await this.gameService.create(
      this.queueService.slots,
      this.queueConfigService.queueConfig,
      this.mapVoteService.getWinner(),
    );

    this.queueService.reset();
  }

}
