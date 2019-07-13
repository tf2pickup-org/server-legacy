import rp from 'request-promise';
import logger from '../logger';
import { Etf2lPlayer } from './etf2l-player';

const ETF2L_API_ENDPOINT = 'http://api.etf2l.org';

interface Etf2lPlayerResponse {
  player: Etf2lPlayer;
  status: {
    code: number;
    message: string;
  };
}

export async function fetchEtf2lPlayerInfo(steamId: string) {
  try {
    const response = await rp(`${ETF2L_API_ENDPOINT}/player/${steamId}`, { json: true }) as Etf2lPlayerResponse;
    return response.status.code === 200 ? response.player : null;
  } catch (error) {
    logger.error(`could not fetch ETF2L player info for steamId ${steamId}: ${error.message}`);
  }
}
