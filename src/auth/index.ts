import { Application } from 'express';
import { setupSteamAuth } from './steam';

export function setupAuth(app: Application) {
  setupSteamAuth(app);
}

export { ensureAuthenticated } from './jwt';
export { ensureRole } from './ensure-role';
export { KeyStore } from './key-store';
export { TokenController } from './token-controller';
export { default as routes } from './routes';
