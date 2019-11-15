import { arrayProp, DocumentType, getModelForClass, mapProp, pre, prop, Ref } from '@typegoose/typegoose';
import { Schema } from 'mongoose';
import { Player } from '../../players/models/player';
import { renameId } from '../../utils';
import { GamePlayer } from './game-player';
import { GameState } from './game-state';

function removeAssignedSkills(doc: DocumentType<Game>, ret: any) {
  ret = renameId(doc, ret);
  delete ret.assignedSkills;
  return ret;
}

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
export class Game {
  @prop({ default: () => new Date() })
  public launchedAt?: Date;

  @prop({ unique: true })
  public number?: number;

  @mapProp({ of: String })
  public teams?: Map<string, string>;

  @arrayProp({ items: Player })
  public players?: Array<Ref<Player>>;

  @arrayProp({ items: GamePlayer })
  public slots?: GamePlayer[];

  @mapProp({ of: Number })
  public assignedSkills?: Map<string, number>;

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

export const gameModel = getModelForClass(Game, {
  schemaOptions: {
    toJSON: {
      versionKey: false,
      virtuals: true,
      transform: removeAssignedSkills,
    },
  },
});
