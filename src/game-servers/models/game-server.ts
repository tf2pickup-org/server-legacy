import { Document, model, Schema } from 'mongoose';
import { renameId } from '../../utils';

export interface IGameServer extends Document {
  name: string;
  address: string;
  rconPassword: string;
}

export function transform(doc: Document, ret: any): any {
  ret = renameId(doc, ret);
  delete ret.rconPassword;
}

const gameServerSchema: Schema = new Schema({
  name: { type: Schema.Types.String, required: true },
  address: { type: Schema.Types.String, required: true },
  rconPassword: { type: Schema.Types.String, required: true },
}, {
  toJSON: { versionKey: false, transform },
});

const gameServerDb = model<IGameServer>('GameServer', gameServerSchema);
export { gameServerDb as GameServer };
