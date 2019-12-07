import { DocumentType } from '@typegoose/typegoose';
import { inject, postConstruct } from 'inversify';
import { BaseHttpController, controller, httpGet } from 'inversify-express-utils';
import { WsProviderService } from '../../core';
import { gameModel } from '../../games/models/game';
import logger from '../../logger';
import { Player } from '../../players/models/player';
import { OnlinePlayerService } from '../../players/services/online-player-service';
import { Tf2Map } from '../models/tf2-map';
import { GameLauncherService, MapVoteService, QueueConfigService, QueueNotificationsService, QueueService } from '../services';

@controller('/queue')
export class QueueController extends BaseHttpController {

  @inject(QueueService) private queueService: QueueService;
  @inject(QueueConfigService) private queueConfigService: QueueConfigService;
  @inject(WsProviderService) private wsProvider: WsProviderService;
  @inject(OnlinePlayerService) private onlinePlayerService: OnlinePlayerService;
  @inject(MapVoteService) private mapVoteService: MapVoteService;
  @inject(GameLauncherService) private gameLauncherService: GameLauncherService; // don't remove
  @inject(QueueNotificationsService) private queueNotificationsService: QueueNotificationsService; // don't remove

  @httpGet('/')
  public async index() {
    return this.json({
      config: this.queueConfigService.queueConfig,
      state: this.queueService.state,
      slots: this.queueService.slots,
      mapVoteResults: this.mapVoteService.results,
    });
  }

  @httpGet('/config')
  public async getConfig() {
    return this.json(this.queueConfigService.queueConfig);
  }

  @httpGet('/state')
  public async getStats() {
    return this.json(this.queueService.state);
  }

  @httpGet('/slots')
  public async getSlots() {
    return this.json(this.queueService.slots);
  }

  @httpGet('/map_vote_results')
  public async getMapVoteResults() {
    return this.json(this.mapVoteService.results);
  }

  @httpGet('/substitute_requests')
  public async getSubstituteRequests() {
    const activeGames = await gameModel.find({ state: /launching|started/ });
    const ret = activeGames
      .filter(g => g.slots.filter(s => s.status === 'waiting for substitute').length > 0);
    return this.json(ret);
  }

  @postConstruct()
  public setupWs() {
    this.wsProvider.ws.on('connection', socket => {
      if (socket.request.user.logged_in) {
        const player = socket.request.user as DocumentType<Player>;

        socket.on('join queue', async (slotId: number, done) => {
          try {
            const slots = await this.queueService.join(slotId, player.id, socket);
            done({ value: slots });
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

        socket.on('player ready', done => {
          try {
            const slot = this.queueService.ready(player.id, socket);
            done({ value: slot });
          } catch (error) {
            done({ error: error.message });
          }
        });

        socket.on('mark friend', async (friendId: string, done) => {
          try {
            const slot = await this.queueService.markFriend(player.id, friendId, socket);
            done({ value: slot });
          } catch (error) {
            done({ error: error.message });
          }
        });

        socket.on('vote for map', (map: Tf2Map, done) => {
          try {
            this.mapVoteService.voteForMap(player.id, map);
            done({ value: map });
          } catch (error) {
            done({ error: error.message });
          }
        });
      }
    });

    this.onlinePlayerService.on('player left', ({ playerId }) => {
      try {
        this.queueService.leave(playerId);
      } catch (error) {
        logger.error(error);
      }
    });
  }

}
