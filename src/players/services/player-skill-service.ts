import { provide } from 'inversify-binding-decorators';
import { lazyInject } from '../../container';
import { QueueService } from '../../queue';
import { GameClass } from '../../queue/models/game-class';
import { IPlayerSkill, PlayerSkill } from '../models/player-skill';

function defaultSkill(playerId: string, classes: GameClass[]): IPlayerSkill {
  return new PlayerSkill({
    player: playerId,
    skill: classes.reduce((map, curr) => { map[curr.name] = 1; return map; }, { }),
  });
}

@provide(PlayerSkillService)
export class PlayerSkillService {

  @lazyInject(QueueService)
  private queueService: QueueService;

  public async getPlayerSkill(playerId: string): Promise<IPlayerSkill> {
    const skill = await PlayerSkill.findOne({ player: playerId });
    return skill ? skill : defaultSkill(playerId, this.queueService.config.classes);
  }

}
