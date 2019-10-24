import config from '../config.json';

export interface Config {
  production: boolean;
  debugLog: boolean;
  url: string;

  mongodb: {
    host: string;
    port: number;
    db: string;
    username: string;
    password: string;
  };

  steam: {
    apiKey: string;
  };

  keyStoreFile: string;
  keyStorePassphare: string;

  clientUrl: string;
  superUser: string;
  logRelay: {
    address: string;
    port: number;
  };

  mumble: {
    serverUrl: string;
    channel: string;
  };

  queueConfig: string;
  requireEtf2lAccount: boolean;

  discord?: {
    token: string;
    channels: {
      queueNotifications: string;
      banNotifications: string;
    }
  };
}

export { config };
