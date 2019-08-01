import { Document, model, Schema } from 'mongoose';

export interface IKeyPair extends Document {
  name: string;
  privateKey: string;
  publicKey: string;
}

const keyPairSchema: Schema = new Schema({
  name: { type: Schema.Types.String, required: true },
  privateKey: { type: Schema.Types.String, required: true },
  publicKey: { type: Schema.Types.String, required: true },
});

const keyPairDb = model<IKeyPair>('KeyPair', keyPairSchema);
export { keyPairDb as KeyPair };
