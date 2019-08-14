import { provide } from 'inversify-binding-decorators';
import { InstanceType } from 'typegoose';
import { lazyInject } from '../../container';
import { QueueService } from '../../queue/services/queue-service';
import { PlayerBan, playerBanModel } from '../models/player-ban';
import { OnlinePlayerService } from './online-player-service';

@provide(PlayerBansService)
export class PlayerBansService {

  @lazyInject(QueueService) private queueService: QueueService;
  @lazyInject(OnlinePlayerService) private onlinePlayersService: OnlinePlayerService;

  public async getActiveBansForPlayer(playerId: string): Promise<PlayerBan[]> {
    return await playerBanModel.find({
      player: playerId,
      end: {
        $gte: new Date(),
      },
    });
  }

  public async addPlayerBan(playerBan: Partial<PlayerBan>): Promise<InstanceType<PlayerBan>> {
    const addedBan = await playerBanModel.create(playerBan);
    this.queueService.validateAllPlayers();
    this.onlinePlayersService.getSocketsForPlayer(addedBan.player.toString()).forEach(async socket => {
      const bans = await this.getActiveBansForPlayer(addedBan.player.toString());
      socket.emit('profile update', { bans });
    });

    return addedBan;
  }

  public async revokeBan(banId: string): Promise<InstanceType<PlayerBan>> {
    const ban = await playerBanModel.findById(banId);
    ban.end = new Date();
    await ban.save();

    this.onlinePlayersService.getSocketsForPlayer(ban.player.toString()).forEach(async socket => {
      const bans = await this.getActiveBansForPlayer(ban.player.toString());
      socket.emit('profile update', { bans });
    });

    return ban;
  }

}
