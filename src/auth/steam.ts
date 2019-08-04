import { Etf2lPlayer } from 'etf2l/etf2l-player';
import { Application } from 'express';
import passport from 'passport';
import steam from 'passport-steam';
import { config } from '../config';
import { container } from '../container';
import { fetchEtf2lPlayerInfo } from '../etf2l';
import logger from '../logger';
import { IPlayer, Player } from '../players/models/player';
import { SteamProfile } from '../profile/models/steam-profile';
import { queueConfigs } from '../queue/queue-configs';
import { TokenController } from './token-controller';

passport.use(new steam.Strategy({
  returnURL: `${config.url}/auth/steam/return`,
  realm: `${config.url}`,
  apiKey: config.steam.apiKey,
}, async (identifier: any, profile: SteamProfile, done: (error: any, player: IPlayer) => void) => {
  let player = await Player.findOne({ steamId: profile.id });

  if (!player) {
    let name = profile.displayName;
    let etf2lProfile: Etf2lPlayer;
    try {
      etf2lProfile = await fetchEtf2lPlayerInfo(profile.id);
      name = etf2lProfile.name;
    } catch (error) {
      if (config.requireEtf2lAccount) {
        return done('no etf2l profile', null);
      }
    }

    player = await new Player({
      steamId: profile.id,
      name,
      avatarUrl: profile.photos[0].value,
      role: config.superUser === profile.id ? 'super-user' : null,
      hasAcceptedRules: false,
      etf2lProfileId: etf2lProfile ? etf2lProfile.id : null,
    }).save();
    logger.info(`new user: ${name} (steamId: ${profile.id})`);
  } else {
    player.avatarUrl = profile.photos[0].value;
    await player.save();
  }

  return done(null, player);
}));

export function setupSteamAuth(theApp: Application) {
  theApp.get('/auth/steam', passport.authenticate('steam', { session: false }));

  theApp.get('/auth/steam/return', (req, res, next) => {
    passport.authenticate('steam', (error, user) => {
      if (error) {
        return res.redirect(`${config.clientUrl}/auth-error?error=${error}`);
      }

      if (!user) {
        return res.sendStatus(401);
      }

      const tokenController = container.get(TokenController);
      const refreshToken = tokenController.generateToken('refresh', user.id);
      const authToken = tokenController.generateToken('auth', user.id);
      return res.redirect(`${config.clientUrl}?refresh_token=${refreshToken}&auth_token=${authToken}`);
    })(req, res, next);
  });
}
