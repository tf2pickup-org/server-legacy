import { EventEmitter } from 'events';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { LogMessage, LogReceiver } from 'srcds-log-receiver';
import { Config } from '../../config';
import logger from '../../logger';
import { GameServerService } from './game-server-service';

export interface GameEventSource {
  address: string;
  port: number;
}

@provide(GameEventListener)
export class GameEventListener extends EventEmitter {

  private logReceiver: LogReceiver;

  constructor(
    @inject('config') private config: Config,
    @inject(GameServerService) private gameServerService: GameServerService,
  ) {
    super();

    this.logReceiver =  new LogReceiver({
      address: this.config.logRelay.address,
      port: this.config.logRelay.port,
    });

    this.logReceiver.on('data', (msg: LogMessage) => {
      if (msg.isValid) {
        logger.debug(`[${msg.receivedFrom.address}:${msg.receivedFrom.port}] ${msg.message}`);
        this.testForGameEvent(msg.message, msg.receivedFrom);
      }
    });
  }

  private testForGameEvent(message: string, source: GameEventSource) {
    if (message.match(/^[\d\/\s-:]+World triggered \"Round_Start\"$/)) {
      this.onMatchStarted(source);
    } else if (message.match(/^[\d\/\s-:]+World triggered \"Game_Over\" reason \".*\"$/)) {
      this.onMatchEnded(source);
    } else if (message.match(/^[\d\/\s-:]+\[TFTrue\].+\shttp:\/\/logs\.tf\/(\d+)\..*$/)) {
      const matches = message.match(/^[\d\/\s-:]+\[TFTrue\].+\shttp:\/\/logs\.tf\/(\d+)\..*$/);
      const logsUrl = `http://logs.tf/${matches[1]}`;
      this.onLogsUploaded(source, logsUrl);
    }
  }

  private async onMatchStarted(source: GameEventSource) {
    const server = await this.gameServerService.getGameServerByEventSource(source);
    if (server) {
      this.emit('match started', { server });
    }
  }

  private async onMatchEnded(source: GameEventSource) {
    const server = await this.gameServerService.getGameServerByEventSource(source);
    if (server) {
      this.emit('match ended', { server });
    }
  }

  private async onLogsUploaded(source: GameEventSource, logsUrl: string) {
    const server = await this.gameServerService.getGameServerByEventSource(source);
    if (server) {
      this.emit('logs uploaded', { server, logsUrl });
    }
  }

}
