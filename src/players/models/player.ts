import { Document, model, Schema } from 'mongoose';
import { renameId } from '../../utils';
import { PlayerRole } from './player-role';

export interface IPlayer extends Document {
  steamId: string;
  name: string;
  joinedAt: Date;
  avatarUrl: string;
  role: PlayerRole;
  hasAcceptedRules: boolean;
}

const playerSchema: Schema = new Schema({
  steamId: { type: Schema.Types.String, required: true },
  name: { type: Schema.Types.String, unique: true, trim: true, required: true },
  joinedAt: Schema.Types.Date,
  avatarUrl: { type: Schema.Types.String },
  role: Schema.Types.String,
  hasAcceptedRules: Schema.Types.Boolean,
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
