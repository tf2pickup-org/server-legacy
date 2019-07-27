import { Application } from 'express';
import { setupSteamAuth } from './steam';

export function setupAuth(app: Application) {
  setupSteamAuth(app);
}

export { ensureAuthenticated } from './jwt';
export { ensureRole } from './ensure-role';
export { keyStore } from './key-store';
export { default as routes } from './routes';
