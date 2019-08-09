import { Rcon } from 'rcon-client';
import { config } from '../../config';
import { GameServer } from '../../game-servers/models';
import logger from '../../logger';

export async function cleanupServer(server: GameServer) {
  try {
    const rcon = new Rcon({ packetResponseTimeout: 30000 });
    await rcon.connect({
      host: server.address,
      port: server.port,
      password: server.rconPassword,
    });

    const logAddress = `${config.logRelay.address}:${config.logRelay.port}`;
    logger.debug(`[${server.name}] removing log address ${logAddress}...`);
    await rcon.send(`logaddress_del ${logAddress}`);
    await rcon.send('sm_game_player_delall');
    await rcon.end();
  } catch (error) {
    throw new Error(`could not cleanup server ${server.name} (${error.message})`);
  }
}
