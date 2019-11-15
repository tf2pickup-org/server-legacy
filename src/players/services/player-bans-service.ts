import { DocumentType } from '@typegoose/typegoose';
import { EventEmitter } from 'events';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { DiscordBotService } from '../../discord/services/discord-bot-service';
import { PlayerBan, playerBanModel } from '../models/player-ban';
import { OnlinePlayerService } from './online-player-service';

@provide(PlayerBansService)
export class PlayerBansService extends EventEmitter {

  @inject(OnlinePlayerService) private onlinePlayersService: OnlinePlayerService;
  @inject(DiscordBotService) private discordService: DiscordBotService;

  public async getActiveBansForPlayer(playerId: string): Promise<PlayerBan[]> {
    return await playerBanModel.find({
      player: playerId,
      end: {
        $gte: new Date(),
      },
    });
  }

  public async addPlayerBan(playerBan: Partial<PlayerBan>): Promise<DocumentType<PlayerBan>> {
    const addedBan = await playerBanModel.create(playerBan);
    this.emit('player banned', playerBan.player);
    this.onlinePlayersService.getSocketsForPlayer(addedBan.player.toString()).forEach(async socket => {
      const bans = await this.getActiveBansForPlayer(addedBan.player.toString());
      socket.emit('profile update', { bans });
    });

    this.discordService.notifyBan(addedBan);
    return addedBan;
  }

  public async revokeBan(banId: string): Promise<DocumentType<PlayerBan>> {
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
