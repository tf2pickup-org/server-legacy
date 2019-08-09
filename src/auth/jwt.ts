import passport from 'passport';
import jwt from 'passport-jwt';
import { playerModel } from '../players/models/player';
import { KeyStore } from './services/key-store';

export function setupJwtStrategy(keyStore: KeyStore) {
  passport.use(new jwt.Strategy({
    secretOrKey: keyStore.getKey('auth', 'verify'),
    jsonWebTokenOptions: { algorithms: ['ES512'] },
    jwtFromRequest: jwt.ExtractJwt.fromAuthHeaderAsBearerToken(),
  }, async (payload: { id: any }, done) => {
    try {
      const player = await playerModel.findOne({ _id: payload.id });
      if (player) {
        return done(null, player);
      } else {
        return done(null, false);
      }
    } catch (error) {
      return done(error, false);
    }
  }));
}
