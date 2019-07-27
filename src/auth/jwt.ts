import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import jwt from 'passport-jwt';
import { Player } from '../players/models/player';
import { keyStore } from './key-store';

passport.use(new jwt.Strategy({
  secretOrKey: keyStore.secretFor('auth'),
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
