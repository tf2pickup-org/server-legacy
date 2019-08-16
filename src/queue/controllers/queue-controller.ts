import { Response } from 'express';
import { inject, postConstruct } from 'inversify';
import { controller, httpGet, response } from 'inversify-express-utils';
import { InstanceType } from 'typegoose';
import { WsProviderService } from '../../core';
import logger from '../../logger';
import { Player } from '../../players/models/player';
import { OnlinePlayerService } from '../../players/services/online-player-service';
import { QueueConfigService, QueueService } from '../services';

@controller('/queue')
export class QueueController {

  @inject(QueueService) private queueService: QueueService;
  @inject(QueueConfigService) private queueConfigService: QueueConfigService;
  @inject(WsProviderService) private wsProvider: WsProviderService;
  @inject(OnlinePlayerService) private onlinePlayerService: OnlinePlayerService;

  @httpGet('/')
  public async index(@response() res: Response) {
    return res.status(200).send({
      config: this.queueConfigService.queueConfig,
      state: this.queueService.state,
      slots: this.queueService.slots,
      map: this.queueService.map,
    });
  }

  @httpGet('/config')
  public async getConfig(@response() res: Response) {
    return res.status(200).send(this.queueConfigService.queueConfig);
  }

  @httpGet('/state')
  public async getStats(@response() res: Response) {
    return res.status(200).send(this.queueService.state);
  }

  @httpGet('/slots')
  public async getSlots(@response() res: Response) {
    return res.status(200).send(this.queueService.slots);
  }

  @httpGet('/map')
  public async getMap(@response() res: Response) {
    return res.status(200).send(this.queueService.map);
  }

  @postConstruct()
  public setupWs() {
    this.wsProvider.ws.on('connection', socket => {
      if (socket.request.user.logged_in) {
        const player = socket.request.user as InstanceType<Player>;

        socket.on('join queue', async (slotId: number, done) => {
          try {
            const slot = await this.queueService.join(slotId, player.id, socket);
            done({ value: slot });
          } catch (error) {
            done({ error: error.message });
          }
        });

        socket.on('leave queue', done => {
          try {
            const slot = this.queueService.leave(player.id, socket);
            done({ value: slot });
          } catch (error) {
            done({ error: error.message });
          }
        });

        socket.on('player ready', async done => {
          try {
            const slot = await this.queueService.ready(player.id, socket);
            done({ value: slot });
          } catch (error) {
            done({ error: error.message });
          }
        });

        socket.on('vote for map change', async (value: boolean, done) => {
          try {
            const slot = await this.queueService.voteForMapChange(player.id, value, socket);
            done({ value: slot });
          } catch (error) {
            done({ error: error.message });
          }
        });
      }
    });
    logger.debug('queue ws calls setup');

    this.onlinePlayerService.on('player left', ({ playerId }) => {
      try {
        this.queueService.leave(playerId);
      } catch (error) {
        logger.error(error);
      }
    });
  }

}
