import { getModelForClass, prop, Ref } from '@typegoose/typegoose';
import { Schema } from 'mongoose';
import { renameId } from '../../utils';
import { Player } from './player';

export class PlayerBan {
  public id?: Schema.Types.ObjectId;

  @prop({ ref: 'Player', required: true })
  public player!: Ref<Player>;

  @prop({ ref: 'Player', required: true })
  public admin!: Ref<Player>;

  @prop({ required: true })
  public start!: Date;

  @prop({ required: true })
  public end!: Date;

  @prop()
  public reason?: string;

}

export const playerBanModel = getModelForClass(PlayerBan, {
  schemaOptions: {
    toJSON: {
      versionKey: false,
      virtuals: true,
      transform: renameId,
    },
  },
});
