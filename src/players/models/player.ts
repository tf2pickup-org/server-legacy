import { Document, model, Schema } from 'mongoose';

export interface IPlayer extends Document {
  steamId: string;
  name: string;
  joinedAt: Date;
}

export const PlayerSchema: Schema = new Schema({
  steamId: { type: String, required: true },
  name: { type: String, unique: true, trim: true, required: true },
  joinedAt: Date,
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
