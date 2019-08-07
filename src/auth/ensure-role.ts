import { NextFunction, Request, Response } from 'express';

export function ensureRole(...roles: string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes((req as any).user.role)) {
      res.status(403).send('Forbidden');
    } else {
      next();
    }
  };
}
