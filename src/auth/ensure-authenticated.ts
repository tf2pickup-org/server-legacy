import { NextFunction, Request, Response } from 'express';
import passport from 'passport';

export const ensureAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  await passport.authenticate('jwt', { session: false })(req, res, next);
};
