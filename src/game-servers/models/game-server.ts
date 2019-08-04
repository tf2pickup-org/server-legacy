import { Document, model, Schema } from 'mongoose';
import { renameId } from '../../utils';

export interface IGameServer extends Document {
  createdAt: Date;
  name: string;
  address: string;
  port: number;
  rconPassword: string;
  isOnline?: boolean;
  resolvedIpAddresses: string[];
  mumbleChannelName: string;
}

const gameServerSchema: Schema = new Schema({
  createdAt: Schema.Types.Date,
  name: { type: Schema.Types.String, required: true },
  address: { type: Schema.Types.String, required: true },
  port: { type: Schema.Types.Number, required: true },
  rconPassword: { type: Schema.Types.String, required: true },
  isOnline: Schema.Types.Boolean,
  resolvedIpAddresses: [Schema.Types.String],
  mumbleChannelName: Schema.Types.String,
}, {
  toJSON: { versionKey: false, transform: renameId },
});

gameServerSchema.pre('save', async function(next) {
  const self = this as IGameServer;
  if (!self.createdAt) {
    self.createdAt = new Date();
  }

  if (!self.mumbleChannelName) {
    const latestServer = await gameServerDb.findOne({}, {}, { sort: { createdAt: -1 }});
    if (latestServer) {
      const id = parseInt(latestServer.mumbleChannelName, 10) + 1;
      self.mumbleChannelName = `${id}`;
    } else {
      self.mumbleChannelName = '1';
    }
  }

  next();
});

const gameServerDb = model<IGameServer>('GameServer', gameServerSchema);
export { gameServerDb as GameServer };
