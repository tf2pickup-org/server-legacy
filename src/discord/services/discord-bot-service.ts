import * as discord from 'discord.js';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { Config } from '../../config';
import logger from '../../logger';
import { Player, playerModel } from '../../players/models/player';
import { PlayerBan } from '../../players/models/player-ban';

@provide(DiscordBotService)
export class DiscordBotService {

  private client = new discord.Client();
  private enabled = false;

  constructor(
    @inject('config') private config: Config,
  ) {
    if (this.config.discord) {
      this.client.on('ready', () => {
        logger.info(`Discord: logged in as ${this.client.user.tag}`);
        this.enabled = true;
      });

      this.client.login(this.config.discord.token)
        .catch(e => logger.error(e));
    }
  }

  public notifyQueue(currentPlayerCount: number, targetPlayerCount: number) {
    if (this.enabled) {
      const channel = this.client.channels.get(this.config.discord.channels.queueNotifications) as discord.TextChannel;
      if (channel) {
        channel.send(`<@&610855230992678922> ${currentPlayerCount}/${targetPlayerCount} in the queue.
        Go to ${this.config.clientUrl} and don't miss the next game!`);
      } else {
        logger.warn(`channel id ${this.config.discord.channels.queueNotifications} not found`);
      }
    }
  }

  public async notifyBan(ban: PlayerBan) {
    if (this.enabled) {
      const channelId = this.config.discord.channels.banNotifications;
      const channel = this.client.channels.get(channelId) as discord.TextChannel;
      if (channel) {
        const admin = await playerModel.findById(ban.admin);
        const player = await playerModel.findById(ban.player);

        const embed = new discord.RichEmbed()
          .setColor('#dc3545')
          .setTitle('Ban added')
          .addField('Admin', admin.name)
          .addField('Player', player.name)
          .addField('Reason', ban.reason)
          .setTimestamp();

        channel.send(embed);
      }
    }
  }

  public async notifyNewPlayer(player: Player) {
    if (this.enabled) {
      const channelId = this.config.discord.channels.banNotifications;
      const channel = this.client.channels.get(channelId) as discord.TextChannel;
      if (channel) {
        const embed = new discord.RichEmbed()
          .setColor('#33dc7f')
          .setTitle('New player')
          .addField('Name', player.name)
          .addField('Profile URL', `${this.config.clientUrl}/player/${player._id}`)
          .setTimestamp();
        channel.send(embed);
      }
    }
  }
}
