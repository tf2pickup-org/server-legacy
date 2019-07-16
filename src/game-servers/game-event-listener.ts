import { EventEmitter } from 'events';
import { LogMessage, LogReceiver } from 'srcds-log-receiver';
import logger from '../logger';

export type GameEvent = 'match started' | 'match ended';

export class GameEventListener extends EventEmitter {
  private logReceiver: LogReceiver = new LogReceiver();

  constructor() {
    super();
    this.logReceiver.on('data', (msg: LogMessage) => {
      logger.debug(msg.message);
    });
  }

}
