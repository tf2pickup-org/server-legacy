import { Document, model, Schema } from 'mongoose';
import { IGame } from '../../games/models/game';
import { IGameServer } from './game-server';

export interface IGameServerAssignment extends Document {
  server: IGameServer;
  game: IGame;
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
});

// tslint:disable-next-line: no-var-requires
gameServerAssignmentSchema.plugin(require('mongoose-autopopulate'));

const gameServerAssignmentDb = model<IGameServerAssignment>('GameServerAssignment', gameServerAssignmentSchema);
export { gameServerAssignmentDb as GameServerAssignment };
