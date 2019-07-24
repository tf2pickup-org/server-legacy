import { EventEmitter } from 'events';
import { LogMessage, LogReceiver } from 'srcds-log-receiver';
import { config } from '../config';
import logger from '../logger';

export type GameEvent = 'match start' | 'match end';
export interface GameEventSource {
  address: string;
  port: number;
}

export class GameEventListener extends EventEmitter {
  private logReceiver: LogReceiver = new LogReceiver({
    address: config.log_relay.address,
    port: config.log_relay.port,
  });

  constructor() {
    super();
    this.logReceiver.on('data', (msg: LogMessage) => {
      logger.debug(`log message from ${msg.receivedFrom.address}:${msg.receivedFrom.port}: ${msg.message}`);
      if (msg.isValid) {
        this.testForGameEvent(msg.message, msg.receivedFrom);
      }
    });
  }

  private testForGameEvent(message: string, source: GameEventSource) {
    if (message.match(/^World triggered \"Round_Start\"$/)) {
      this.emit('match start', { source });
    } else if (message.match(/^World triggered \"Game_Over\" reason \".*\"$/)) {
      this.emit('match end', { source });
    }
  }

}
