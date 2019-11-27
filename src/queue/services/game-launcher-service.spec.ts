import { GameService } from 'games';
import { Container } from 'inversify';
import { GameLauncherService } from './game-launcher-service';
import { MapVoteService } from './map-vote-service';
import { QueueConfigService } from './queue-config-service';
import { QueueService } from './queue-service';

const gameServiceStub = {

};

const queueServiceStub = {

};

const queueConfigServiceStub = {

};

const mapVoteServiceStub = {

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

  });

});
