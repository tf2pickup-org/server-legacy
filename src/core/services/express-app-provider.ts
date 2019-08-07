import { json, urlencoded } from 'body-parser';
import cors from 'cors';
import express from 'express';
import { createServer, Server } from 'http';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import passport from 'passport';
import { KeyStore } from '../../auth';
import { setupJwtStrategy } from '../../auth/jwt';
import { setupSteamStrategy } from '../../auth/steam';
import { Config } from '../../config';

@provide(ExpressAppProvider)
export class ExpressAppProvider {

  public app: express.Application = express();
  public server: Server;

  constructor(
    @inject('config') private config: Config,
    @inject(KeyStore) private keyStore: KeyStore,
  ) {
    this.app.use(json());
    this.app.use(cors());
    this.app.use(urlencoded({ extended: false }));

    setupJwtStrategy(this.keyStore);
    setupSteamStrategy(this.config);

    this.app.use(passport.initialize());
    this.server = createServer(this.app);
  }

}
