import { Rcon } from 'rcon-client';
import logger from '../logger';

/**
 * Verify the game server is valid for playing pickup games (has tftrue, etc.).
 */
export async function verifyServer(options: { address: string, port: number, rconPassword: string }) {
  const rcon = await Rcon.connect({
    host: options.address,
    port: options.port,
    password: options.rconPassword,
  });

  const tftrueVersion = await rcon.send('tftrue_version');
  logger.info(`tftrue version = ${tftrueVersion}`);

  // TODO verify tftrue is installed

  await rcon.end();
  return true;
}
