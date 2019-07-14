import { GameClass } from './game-class';

export interface QueueConfig {
  teamCount: 2;
  classes: GameClass[];
  readyUpTimeout: number; // milliseconds
}
