import { Document, model, Schema } from 'mongoose';
import { IGame } from '../../games/models/game';
import { IGameServer } from './game-server';

export interface IGameServerAssignment extends Document {
  server: IGameServer;
  game: IGame;
  gameRunning: boolean;
  assignedAt: Date;
}

const gameServerAssignmentSchema = new Schema({
  server: {
    type: Schema.Types.ObjectId,
    ref: 'GameServer',
    required: true,
    autopopulate: true,
  },
  game: {
    type: Schema.Types.ObjectId,
    ref: 'Game',
    required: true,
    autopopulate: true,
  },
  gameRunning: Schema.Types.Boolean,
  assignedAt: Schema.Types.Date,
});

// tslint:disable-next-line: no-var-requires
gameServerAssignmentSchema.plugin(require('mongoose-autopopulate'));

gameServerAssignmentSchema.pre('save', function(next) {
  const self = this as IGameServerAssignment;
  if (!self.assignedAt) {
    self.assignedAt = new Date();
  }

  next();
});

const gameServerAssignmentDb = model<IGameServerAssignment>('GameServerAssignment', gameServerAssignmentSchema);
export { gameServerAssignmentDb as GameServerAssignment };
