import { config } from '../config';

class KeyStore {

  private _refreshSecret = config.jwtSecret; // should be preserved across server restarts
  private _authSecret: string;
  private _wsSecret: string;

  get refreshSecret() {
    return this._refreshSecret;
  }

  get authSecret() {
    return this._authSecret;
  }

  get wsSecret() {
    return this._wsSecret;
  }

  constructor() {
    this._authSecret = 'auth_secret';
    this._wsSecret = 'ws_secret';
  }

  public secretFor(purpose: 'refresh' | 'auth' | 'ws'): string {
    switch (purpose) {
      case 'refresh': return this._refreshSecret;
      case 'auth': return this._authSecret;
      case 'ws': return this._wsSecret;
    }
  }

}

const keyStore = new KeyStore();
export { keyStore };
