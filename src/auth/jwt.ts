import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import jwt from 'passport-jwt';
import { config } from '../config';
import { Player } from '../players/models/player';

function makeSecret(length: number) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
     result += characters.charAt(Math.floor(Math.random() *  characters.length));
  }

  return result;
}

export const jwtConfig = {
  secret: config.production ? makeSecret(32) : 'secret',
};

passport.use(new jwt.Strategy({
  secretOrKey: jwtConfig.secret,
  jwtFromRequest: jwt.ExtractJwt.fromAuthHeaderAsBearerToken(),
}, async (payload: { id: any }, done) => {
  try {
    const player = await Player.findOne({ _id: payload.id });
    if (player) {
      return done(null, player);
    } else {
      return done(null, false);
    }
  } catch (error) {
    return done(error, false);
  }
}));

export const ensureAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  await passport.authenticate('jwt', { session: false })(req, res, next);
};
