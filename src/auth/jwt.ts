import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import jwt from 'passport-jwt';
import { config } from '../config';
import { Player } from '../players/models/player';

passport.use(new jwt.Strategy({
  secretOrKey: config.jwtSecret,
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
