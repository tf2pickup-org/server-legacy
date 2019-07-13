import { Document, model, Schema } from 'mongoose';
import { renameId } from '../../utils';

export interface IPlayer extends Document {
  steamId: string;
  name: string;
  joinedAt: Date;
  avatarUrl: string;
}

const playerSchema: Schema = new Schema({
  steamId: { type: String, required: true },
  name: { type: String, unique: true, trim: true, required: true },
  joinedAt: Date,
  avatarUrl: { type: String },
}, {
  toJSON: { versionKey: false, transform: renameId },
});

playerSchema.pre('save', function(next) {
  const self = this as IPlayer;
  if (!self.joinedAt) {
    self.joinedAt = new Date();
  }

  next();
});

const playerDb = model<IPlayer>('Player', playerSchema);
export { playerDb as Player };
