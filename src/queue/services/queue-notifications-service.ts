import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { DiscordBotService } from '../../discord/services/discord-bot-service';
import { QueueService } from './queue-service';

/**
 * Provide Discord notifications when the queue gets interesting.
 */
@provide(QueueNotificationsService)
export class QueueNotificationsService {

  private timer: NodeJS.Timeout;

  constructor(
    @inject(QueueService) private queueService: QueueService,
    @inject(DiscordBotService) private discordBotService: DiscordBotService,
  ) {
    this.queueService.on('player_join', () =>
      this.maybeNotify(this.queueService.playerCount, this.queueService.requiredPlayerCount));
  }

  private maybeNotify(currentPlayerCount: number, targetPlayerCount: number) {
    if (currentPlayerCount >= (targetPlayerCount * 0.5)) {
      if (this.timer) {
        clearTimeout(this.timer);
      }

      this.timer = setTimeout(() => this.discordBotService.notifyQueue(currentPlayerCount, targetPlayerCount),
        60 * 1000);
    }
  }

}
