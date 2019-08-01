import { Rcon } from 'rcon-client';

/**
 * Verify the game server is valid for playing pickup games (has tftrue, etc.).
 */
export async function verifyServer(options: { address: string, port: number, rconPassword: string }) {
  const rcon = await Rcon.connect({
    host: options.address,
    port: options.port,
    password: options.rconPassword,
  });

  // todo check the server is properly configured (tftrue, sourcemod, etc.)

  await rcon.end();
  return true;
}
