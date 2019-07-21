import { EventEmitter } from 'events';
import { LogMessage, LogReceiver } from 'srcds-log-receiver';
import { config } from '../config';
import logger from '../logger';

export type GameEvent = 'match started' | 'match ended';

export class GameEventListener extends EventEmitter {
  private logReceiver: LogReceiver = new LogReceiver({
    address: config.log_relay.address,
    port: config.log_relay.port,
  });

  constructor() {
    super();
    this.logReceiver.on('data', (msg: LogMessage) => {
      logger.debug(msg.message);
    });
  }

}
