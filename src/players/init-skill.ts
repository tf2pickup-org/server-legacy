import { container } from '../container';
import { Queue } from '../queue/queue';
import { Player } from './models/player';
import { IPlayerSkill, PlayerSkill } from './models/player-skill';

export async function initSkill(playerId: string): Promise<IPlayerSkill> {
  const queueConfig = container.get(Queue).config;
  const player = await Player.findById(playerId);

  const skill = await new PlayerSkill({
    player,
    skill: queueConfig.classes.reduce((map, curr) => { map[curr.name] = 1; return map; }, { }),
  }).save();

  return skill;
}
