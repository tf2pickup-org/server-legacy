import { Document, model, Schema } from 'mongoose';
import { renameId } from '../../utils';
import { IPlayer } from './player';

export interface IPlayerSkill extends Document {
  skill: { [gameClass: string]: number };
  player?: IPlayer;
}

const playerSkillSchema: Schema = new Schema({
  skill: { type: Map, of: String },
  player: { type: Schema.Types.ObjectId, ref: 'Player' },
}, {
  toJSON: { versionKey: false, transform: renameId },
});

const playerSkillDb = model<IPlayerSkill>('PlayerSkill', playerSkillSchema);
export { playerSkillDb as PlayerSkill };
