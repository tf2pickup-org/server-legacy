import { Etf2lPlayer } from 'etf2l/etf2l-player';
import passport from 'passport';
import steam from 'passport-steam';
import { Config } from '../config';
import { fetchEtf2lPlayerInfo } from '../etf2l';
import logger from '../logger';
import { Player, playerModel } from '../players/models/player';
import { SteamProfile } from './models/steam-profile';

async function createUser(steamProfile: SteamProfile, config: Config) {
  let name = steamProfile.displayName;
  let etf2lProfile: Etf2lPlayer;
  try {
    etf2lProfile = await fetchEtf2lPlayerInfo(steamProfile.id);
    if (etf2lProfile.bans && etf2lProfile.bans.filter(b => b.end > Date.now()).length > 0) {
      throw new Error('etf2l banned');
    }

    name = etf2lProfile.name;
  } catch (error) {
    if (config.requireEtf2lAccount) {
      throw new Error('no etf2l profile');
    }
  }

  const player = await playerModel.create({
    steamId: steamProfile.id,
    name,
    avatarUrl: steamProfile.photos[0].value,
    role: config.superUser === steamProfile.id ? 'super-user' : null,
    hasAcceptedRules: false,
    etf2lProfileId: etf2lProfile ? etf2lProfile.id : null,
  });
  logger.info(`new user: ${name} (steamId: ${steamProfile.id})`);
  return player;
}

export function setupSteamStrategy(config: Config) {
  passport.use(new steam.Strategy({
    returnURL: `${config.url}/auth/steam/return`,
    realm: `${config.url}`,
    apiKey: `${config.steam.apiKey}`,
  }, async (identifier: any, profile: SteamProfile, done: (error: any, player: Player) => void) => {
    let player = await playerModel.findOne({ steamId: profile.id });

    if (!player) {
      try {
        player = await createUser(profile, config);
      } catch (error) {
        return done(error.message, null);
      }
    } else {
      player.avatarUrl = profile.photos[0].value;
      await player.save();
    }

    return done(null, player);
  }));
}
