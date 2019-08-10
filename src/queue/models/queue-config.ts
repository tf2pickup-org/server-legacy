import { GameClass } from './game-class';
import { Tf2Map } from './tf2-map';

export interface QueueConfig {
  teamCount: 2;
  classes: GameClass[];
  readyUpTimeout: number; // milliseconds
  maps: Tf2Map[]; // map pool
  execConfigs: string[]; // what configs to execute
  nextMapSuccessfulVoteThreshold: number;
}
