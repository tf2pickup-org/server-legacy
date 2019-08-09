import { Document } from 'mongoose';
import { arrayProp, pre, prop, Typegoose } from 'typegoose';
import { renameId } from '../../utils';

function removeRcon(doc: Document, ret: any) {
  ret = renameId(doc, ret);
  delete ret.rconPassword;
  return ret;
}

@pre<GameServer>('save', async function(next) {
  if (!this.mumbleChannelName) {
    const latestServer = await gameServerModel.findOne({}, {}, { sort: { createdAt: -1 }});
    if (latestServer) {
      const id = parseInt(latestServer.mumbleChannelName, 10) + 1;
      this.mumbleChannelName = `${id}`;
    } else {
      this.mumbleChannelName = '1';
    }
  }

  next();
})
export class GameServer extends Typegoose {
  @prop({ default: () => new Date() })
  public createdAt?: Date;

  @prop({ required: true, trim: true })
  public name!: string;

  @prop({ required: true, trim: true })
  public address!: string;

  @prop({ required: true })
  public port: number;

  @prop({ required: true })
  public rconPassword!: string;

  @prop()
  public isOnline?: boolean;

  @arrayProp({ items: String })
  public resolvedIpAddresses?: string[];

  @prop()
  public mumbleChannelName?: string;
}

export const gameServerModel = new GameServer().getModelForClass(GameServer, {
  schemaOptions: {
    toJSON: {
      versionKey: false,
      virtuals: true,
      transform: removeRcon,
    },
  },
});
