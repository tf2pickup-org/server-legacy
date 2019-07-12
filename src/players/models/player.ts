import { Document, model, Schema } from 'mongoose';
import { renameId } from '../../utils';

export interface IPlayer extends Document {
  steamId: string;
  name: string;
  joinedAt: Date;
}

export const PlayerSchema: Schema = new Schema({
  steamId: { type: String, required: true },
  name: { type: String, unique: true, trim: true, required: true },
  joinedAt: Date,
}, {
  toJSON: { versionKey: false, transform: renameId },
});

PlayerSchema.pre('save', function(next) {
  const self = this as IPlayer;
  if (!self.joinedAt) {
    self.joinedAt = new Date();
  }

  next();
});

const Player = model<IPlayer>('Player', PlayerSchema);
export { Player };
