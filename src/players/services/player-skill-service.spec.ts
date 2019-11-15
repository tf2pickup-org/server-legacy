import { DocumentType } from '@typegoose/typegoose';
import { buildProviderModule } from 'inversify-binding-decorators';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect } from 'mongoose';
import { container } from '../../container';
import { QueueConfigService } from '../../queue';
import { Player, playerModel } from '../models/player';
import { playerSkillModel } from '../models/player-skill';
import { PlayerSkillService } from './player-skill-service';

class QueueConfigServiceStub {
  public queueConfig = {
    classes: [
      { name: 'soldier', count: 1 },
    ],
  };
}

describe('PlayerSkillService', () => {
  const queueConfigService = new QueueConfigServiceStub();
  let mongod: MongoMemoryServer;
  let service: PlayerSkillService;

  beforeAll(async () => {
    container.load(buildProviderModule());

    mongod = new MongoMemoryServer();
    const uri = await mongod.getConnectionString();
    await connect(uri, { useNewUrlParser: true });
  });

  afterAll(async () => await mongod.stop());

  beforeEach(() => {
    container.snapshot();
    container.rebind(QueueConfigService).toConstantValue(queueConfigService as unknown as QueueConfigService);
    service = container.resolve(PlayerSkillService);
  });

  afterEach(() => container.restore());

  describe('#getPlayerSkill()', () => {
    let player: DocumentType<Player>;

    beforeAll(async () => {
      player = await playerModel.create({ name: 'FAKE_NAME', steamId: 'FAKE_STEAM_ID' });
    });

    it('should retrieve the player skill from the database', async () => {
      await playerSkillModel.create({ player, skill: { soldier: 5 } });
      const skill = await service.getPlayerSkill(player._id);
      expect(skill).toBeTruthy();
      expect(skill.skill.get('soldier')).toEqual(5);
    });

    it('should initialize default skill', async () => {
      const player2 = await playerModel.create({ name: 'FAKE_NAME_2', steamId: 'FAKE_STEAM_ID_2' });
      const skill = await service.getPlayerSkill(player2._id);
      expect(skill).toBeTruthy();
      expect(skill.skill.get('soldier')).toEqual(1);
    });

  });
});
