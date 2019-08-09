import { prop, Ref, Typegoose } from 'typegoose';
import { Game } from '../../games';
import { GameServer } from './game-server';

export class GameServerAssignment extends Typegoose {
  @prop({ default: new Date() })
  public assignedAt?: Date;

  @prop({ ref: GameServer, required: true })
  public server!: Ref<GameServer>;

  @prop({ ref: Game, required: true })
  public game!: Ref<Game>;

  @prop({ default: true })
  public gameRunning: boolean;
}

export const gameServerAssignmentModel = new GameServerAssignment().getModelForClass(GameServerAssignment);
