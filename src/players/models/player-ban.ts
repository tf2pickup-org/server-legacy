import { prop, Ref, Typegoose } from 'typegoose';
import { Player } from './player';

export class PlayerBan extends Typegoose {

  @prop({ ref: Player })
  public player?: Ref<Player>;

  @prop({ required: true })
  public start!: Date;

  @prop({ required: true })
  public end!: Date;

  @prop()
  public reason?: string;

}

export const playerBanModel = new PlayerBan().getModelForClass(PlayerBan);
