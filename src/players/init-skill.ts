import { container } from '../container';
import { Queue } from '../queue/queue';
import { IPlayerSkill, PlayerSkill } from './models/player-skill';

export async function initSkill(playerId: string): Promise<IPlayerSkill> {
  const queueConfig = container.get(Queue).config;

  const skill = await new PlayerSkill({
    player: playerId,
    skill: queueConfig.classes.reduce((map, curr) => { map[curr.name] = 1; return map; }, { }),
  }).save();

  return skill;
}
