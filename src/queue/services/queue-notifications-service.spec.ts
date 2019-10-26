import { EventEmitter } from 'events';
import { buildProviderModule } from 'inversify-binding-decorators';
import { container } from '../../container';
import { DiscordBotService } from '../../discord/services/discord-bot-service';
import { QueueNotificationsService } from './queue-notifications-service';
import { QueueService } from './queue-service';

class QueueServiceStub extends EventEmitter {
  public playerCount = 0;
  public requiredPlayerCount = 0;
}

// tslint:disable-next-line:max-classes-per-file
class DiscordBotServiceStub {
  // tslint:disable-next-line:no-empty
  public notifyQueue() { }
}

describe('QueueNotificationsService', () => {
  const queueService = new QueueServiceStub();
  const discordBotService = new DiscordBotServiceStub();
  let service: QueueNotificationsService;

  beforeAll(async () => {
    container.load(buildProviderModule());
  });

  beforeEach(() => {
    container.snapshot();
    container.rebind(QueueService).toConstantValue(queueService as unknown as QueueService);
    container.rebind(DiscordBotService).toConstantValue(discordBotService as unknown as DiscordBotService);
    service = container.resolve(QueueNotificationsService);
  });

  describe('when player joins', () => {
    beforeEach(() => {
      jasmine.clock().install();
      queueService.playerCount = 6;
      queueService.requiredPlayerCount = 12;
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should notify after 5 minutes', () => {
      const spy = spyOn(discordBotService, 'notifyQueue');
      queueService.emit('player_join', 'fake_id');
      expect(spy).not.toHaveBeenCalled();
      jasmine.clock().tick(5 * 60 * 1000);
      expect(spy).toHaveBeenCalledWith(6, 12);
    });

    it('should notify only once if there are two consecutive player_join events', () => {
      const spy = spyOn(discordBotService, 'notifyQueue');
      queueService.emit('player_join', 'fake_id');
      jasmine.clock().tick(4 * 60 * 1000);
      queueService.emit('player_join', 'fake_id');
      jasmine.clock().tick(4 * 60 * 1000);
      expect(spy).not.toHaveBeenCalled();
      jasmine.clock().tick(60 * 1000);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not notify under specified threshold', () => {
      queueService.playerCount = 5;
      const spy = spyOn(discordBotService, 'notifyQueue');
      queueService.emit('player_join', 'fake_id');
      jasmine.clock().tick(5 * 60 * 1000);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
