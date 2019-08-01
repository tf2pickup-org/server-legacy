import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import jwt from 'passport-jwt';
import { container } from '../container';
import { Player } from '../players/models/player';
import { KeyStore } from './key-store';

passport.use(new jwt.Strategy({
  secretOrKey: container.get(KeyStore).getKey('auth', 'verify'),
  jsonWebTokenOptions: { algorithms: ['ES512'] },
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
