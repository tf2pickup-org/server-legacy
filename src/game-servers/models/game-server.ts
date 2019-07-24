import { Document, model, Schema } from 'mongoose';
import { renameId } from '../../utils';

export interface IGameServer extends Document {
  name: string;
  address: string;
  port: number;
  rconPassword: string;
  isOnline?: boolean;
  resolvedIpAddresses: string[];
}

const gameServerSchema: Schema = new Schema({
  name: { type: Schema.Types.String, required: true },
  address: { type: Schema.Types.String, required: true },
  port: { type: Schema.Types.Number, required: true },
  rconPassword: { type: Schema.Types.String, required: true },
  isOnline: Schema.Types.Boolean,
  resolvedIpAddresses: [Schema.Types.String],
}, {
  toJSON: { versionKey: false, transform: renameId },
});

const gameServerDb = model<IGameServer>('GameServer', gameServerSchema);
export { gameServerDb as GameServer };
