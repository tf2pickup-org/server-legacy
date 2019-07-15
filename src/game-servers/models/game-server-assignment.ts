import { Document, model, Schema } from 'mongoose';

export interface IGameServerAssignment extends Document {
  serverId: string;
  gameId: string;
}

const gameServerAssignmentSchema = new Schema({
  serverId: { type: Schema.Types.ObjectId, required: true },
  gameId: { type: Schema.Types.ObjectId, required: true },
});

const gameServerAssignmentDb = model<IGameServerAssignment>('GameServerAssignment', gameServerAssignmentSchema);
export { gameServerAssignmentDb as GameServerAssignment };
