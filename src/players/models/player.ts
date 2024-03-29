import { getModelForClass, prop } from '@typegoose/typegoose';
import { Schema } from 'mongoose';
import { renameId } from '../../utils';
import { PlayerRole } from './player-role';

export class Player {
  public _id: Schema.Types.ObjectId;

  @prop({ required: true, unique: true, trim: true })
  public name!: string;

  @prop({ required: true, unique: true })
  public steamId!: string;

  @prop({ default: () => new Date() })
  public joinedAt?: Date;

  @prop()
  public avatarUrl?: string;

  @prop()
  public role?: PlayerRole;

  @prop()
  public hasAcceptedRules?: boolean;

  @prop()
  public etf2lProfileId?: number;
}

export const playerModel = getModelForClass(Player, {
  schemaOptions: {
    toJSON: {
      versionKey: false,
      virtuals: true,
      transform: renameId,
    },
  },
});
