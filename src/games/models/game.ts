import { Schema } from 'mongoose';
import { arrayProp, mapProp, pre, prop, Ref, Typegoose } from 'typegoose';
import { Player } from '../../players/models/player';
import { renameId } from '../../utils';
import { GamePlayer } from './game-player';
import { GameState } from './game-state';

@pre<Game>('save', async function(next) {
  if (!this.number) {
    const latestGame = await gameModel.findOne({}, {}, { sort: { launchedAt: -1 }});
    if (latestGame) {
      this.number = latestGame.number + 1;
    } else {
      this.number = 1;
    }
  }

  next();
})
export class Game extends Typegoose {
  @prop({ default: new Date() })
  public launchedAt?: Date;

  @prop({ unique: true })
  public number?: number;

  @mapProp({ of: String })
  public teams?: Map<string, string>;

  @arrayProp({ itemsRef: Player })
  public players?: Array<Ref<Player>>;

  @arrayProp({ items: Schema.Types.Mixed, required: true })
  public slots!: GamePlayer[];

  @prop()
  public map?: string;

  @prop()
  public state?: GameState;

  @prop()
  public connectString?: string;

  @prop()
  public mumbleUrl?: string;

  @prop()
  public logsUrl?: string;

  @prop()
  public error?: string;

}

export const gameModel = new Game().getModelForClass(Game, {
  schemaOptions: {
    toJSON: {
      versionKey: false,
      virtuals: true,
      transform: renameId,
    },
  },
});
