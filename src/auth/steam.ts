import { Application, Request, Response } from 'express';
import { sign } from 'jsonwebtoken';
import passport from 'passport';
import steam from 'passport-steam';
import { fetchEtf2lPlayerInfo } from '../etf2l';
import logger from '../logger';
import { IPlayer, Player } from '../player/models/player';
import { SteamProfile } from '../profile/models/steam-profile';

passport.use(new steam.Strategy({
  returnURL: 'http://localhost:3000/auth/steam/return',
  realm: 'http://localhost:3000',
  apiKey: '33BBBEC7706231D75121A3AB4D7C66D8',
}, async (identifier: any, profile: SteamProfile, done: (error: any, player: IPlayer) => void) => {
  let player = await Player.findOne({ steamId: profile.id });

  if (!player) {
    const etf2l = await fetchEtf2lPlayerInfo(profile.id);
    const name = etf2l.name;

    player = await new Player({
      steamId: profile.id,
      name,
    }).save();
    logger.info(`new user: ${name} (steamId: ${profile.id})`);
  }

  return done(null, player);
}));

function handleSteamAuth(req: Request, res: Response) {
  if (!req.user) {
    return res.sendStatus(401);
  }

  const user = req.user as IPlayer;
  const token = sign({ id: user._id }, 'secret', { expiresIn: '1h' });
  return res.redirect(`http://localhost:4200?token=${token}`);
}

export function setupSteamAuth(app: Application) {
  app.get('/auth/steam', passport.authenticate('steam', { session: false }));

  app.get('/auth/steam/return',
    passport.authenticate('steam', { session: false }),
    handleSteamAuth);
}
