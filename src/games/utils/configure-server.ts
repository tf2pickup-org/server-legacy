import { generate } from 'generate-password';
import { Rcon } from 'rcon-client';
import { config } from '../../config';
import { IGameServer, ServerInfoForPlayer } from '../../game-servers/models';
import logger from '../../logger';
import { PlayerService } from '../../players';
import { IGame } from '../models';

export async function configureServer(server: IGameServer,
                                      game: IGame,
                                      execConfigs: string[],
                                      playerService: PlayerService): Promise<ServerInfoForPlayer> {
  logger.info(`configuring server ${server.name}...`);
  logger.debug(`[${server.name}] using rcon password ${server.rconPassword}`);

  try {
    const rcon = new Rcon({ packetResponseTimeout: 30000 });
    await rcon.connect({
      host: server.address,
      port: server.port,
      password: server.rconPassword,
    });

    const logAddress = `${config.logRelay.address}:${config.logRelay.port}`;
    logger.debug(`[${server.name}] adding log address ${logAddress}...`);
    await rcon.send(`logaddress_add ${logAddress}`);

    logger.debug(`[${server.name}] kicking all players...`);
    await rcon.send(`kickall`);
    logger.debug(`[${server.name}] changing map to ${game.map}...`);
    await rcon.send(`changelevel ${game.map}`);

    for (const execConfig of execConfigs) {
      logger.debug(`[${server.name}] executing ${execConfig}...`);
      await rcon.send(`exec ${execConfig}`);
    }

    const password = generate({ length: 10, numbers: true, uppercase: true });
    logger.debug(`[${server.name}] settings password to ${password}...`);
    await rcon.send(`sv_password ${password}`);

    for (const slot of game.slots) {
      const player = await playerService.getPlayerById(slot.playerId);
      const team = parseInt(slot.teamId, 10) + 2;

      const cmd = [
        `sm_game_player_add ${player.steamId}`,
        `-name "${player.name}"`,
        `-team ${team}`,
        `-class ${slot.gameClass}`,
      ].join(' ');
      logger.debug(`[${server.name}] ${cmd}`);
      await rcon.send(cmd);
    }

    await rcon.end();
    logger.info(`[${server.name}] server ready.`);

    const connectString = `connect ${server.address}:${server.port}; password ${password}`;
    logger.info(`[${server.name}] ${connectString}`);

    return {
      connectString,
    };
  } catch (error) {
    throw new Error(`could not configure server ${server.name} (${error.message})`);
  }
}
