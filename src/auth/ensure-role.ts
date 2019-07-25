import { NextFunction, Request, Response } from 'express';
import { PlayerRole } from 'players/models/player-role';

export function ensureRole(...roles: PlayerRole[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      res.status(403).send('Forbidden');
    } else {
      next();
    }
  };
}
