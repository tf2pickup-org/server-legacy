import { Document, model, Schema } from 'mongoose';
import { renameId } from '../../utils';
import { GamePlayer } from './game-player';
import { GameState } from './game-state';

export interface IGame extends Document {
  launchedAt: Date;
  number: number;
  teams: { [teamId: string]: string };
  players: GamePlayer[];
  map: string;
  logsUrl?: string;
  demoUrl?: string;
  state: GameState;
}

const gameSchema: Schema = new Schema({
  launchedAt: Schema.Types.Date,
  number: Schema.Types.Number,
  teams: {
    type: Map,
    of: Schema.Types.String,
    required: true,
  },
  players: { type: [Schema.Types.Mixed], required: true },
  map: { type: Schema.Types.String, required: true },
  logsUrl: Schema.Types.String,
  demoUrl: Schema.Types.String,
  gameState: Schema.Types.String,
}, {
  toJSON: { versionKey: false, transform: renameId },
});

gameSchema.pre('save', async function(next) {
  const self = this as IGame;
  if (!self.launchedAt) {
    self.launchedAt = new Date();
  }

  const latestGame = await gameDb.findOne({}, {}, { sort: { launchedAt: -1 }});
  if (latestGame) {
    self.number = latestGame.number + 1;
  } else {
    self.number = 1;
  }

  next();
});

const gameDb = model<IGame>('Game', gameSchema);
export { gameDb as Game };
