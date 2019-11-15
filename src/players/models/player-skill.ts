import { getModelForClass, mapProp, prop, Ref } from '@typegoose/typegoose';
import { renameId } from '../../utils';
import { Player } from './player';

export class PlayerSkill {

  @prop({ ref: 'Player' })
  public player?: Ref<Player>;

  @mapProp({ of: Number })
  public skill?: Map<string, number>;

}

export const playerSkillModel = getModelForClass(PlayerSkill, {
  schemaOptions: {
    toJSON: {
      versionKey: false,
      virtuals: true,
      transform: renameId,
    },
  },
});
