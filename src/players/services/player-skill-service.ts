import { DocumentType } from '@typegoose/typegoose';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { GameClass } from '../../queue/models/game-class';
import { QueueConfigService } from '../../queue/services/queue-config-service';
import { PlayerSkill, playerSkillModel } from '../models/player-skill';

async function initializeSkill(playerId: string, classes: GameClass[]): Promise<DocumentType<PlayerSkill>> {
  return await playerSkillModel.create({
    player: playerId,
    skill: classes.reduce((map, curr) => { map[curr.name] = 1; return map; }, { }),
  });
}

@provide(PlayerSkillService)
export class PlayerSkillService {

  @inject(QueueConfigService) private queueConfigService: QueueConfigService;

  public async getPlayerSkill(playerId: string): Promise<DocumentType<PlayerSkill>> {
    const skill = await playerSkillModel.findOne({ player: playerId });
    return skill ? skill : initializeSkill(playerId, this.queueConfigService.queueConfig.classes);
  }

}
