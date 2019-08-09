import { mapProp, prop, Ref, Typegoose } from 'typegoose';
import { Player } from './player';

export class PlayerSkill extends Typegoose {

  @prop({ ref: Player })
  public player?: Ref<Player>;

  @mapProp({ of: Number })
  public skill?: Map<string, number>;

}

export const playerSkillModel = new PlayerSkill().getModelForClass(PlayerSkill);
