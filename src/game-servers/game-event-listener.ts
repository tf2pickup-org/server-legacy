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
    address: config.logRelay.address,
    port: config.logRelay.port,
  });

  constructor() {
    super();
    this.logReceiver.on('data', (msg: LogMessage) => {
      if (msg.isValid) {
        logger.debug(`[${msg.receivedFrom.address}:${msg.receivedFrom.port}] ${msg.message}`);
        this.testForGameEvent(msg.message, msg.receivedFrom);
      }
    });
  }

  private testForGameEvent(message: string, source: GameEventSource) {
    if (message.match(/^[\d\/\s-:]+World triggered \"Round_Start\"$/)) {
      this.emit('match start', { source });
    } else if (message.match(/^[\d\/\s-:]+World triggered \"Game_Over\" reason \".*\"$/)) {
      this.emit('match end', { source });
    } else if (message.match(/^[\d\/\s-:]+\[TFTrue\].+\shttp:\/\/logs\.tf\/(\d+)\..*$/)) {
      const matches = message.match(/^[\d\/\s-:]+\[TFTrue\].+\shttp:\/\/logs\.tf\/(\d+)\..*$/);
      const logsUrl = `http://logs.tf/${matches[1]}`;
      this.emit('logs uploaded', { source, logsUrl });
    }
  }

}
