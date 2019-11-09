import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { DiscordBotService } from '../../discord/services/discord-bot-service';
import { QueueService } from './queue-service';

/**
 * Provide Discord notifications when the queue gets interesting.
 */
@provide(QueueNotificationsService)
export class QueueNotificationsService {

  private readonly messageDelay = 5 * 60 * 1000; // 5 minutes
  private timer: NodeJS.Timeout;

  constructor(
    @inject(QueueService) private queueService: QueueService,
    @inject(DiscordBotService) private discordBotService: DiscordBotService,
  ) {
    this.queueService.on('player_join', () => this.triggerNotifier());
  }

  private triggerNotifier() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => this.maybeNotify(), this.messageDelay);
  }

  private maybeNotify() {
    if (this.queueService.playerCount >= (this.queueService.requiredPlayerCount * 0.5) &&
        this.queueService.playerCount < this.queueService.requiredPlayerCount) {
      this.discordBotService.notifyQueue(this.queueService.playerCount, this.queueService.requiredPlayerCount);
    }
  }

}
