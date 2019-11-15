import { getModelForClass, prop, Ref } from '@typegoose/typegoose';
import { Game } from '../../games/models/game';
import { GameServer } from './game-server';

export class GameServerAssignment {
  @prop({ default: () => new Date() })
  public assignedAt?: Date;

  @prop({ ref: 'GameServer', required: true })
  public server!: Ref<GameServer>;

  @prop({ ref: 'Game', required: true })
  public game!: Ref<Game>;

  @prop({ default: true })
  public gameRunning?: boolean;
}

export const gameServerAssignmentModel = getModelForClass(GameServerAssignment);
