import { json, urlencoded } from 'body-parser';
import cors from 'cors';
import express from 'express';
import { createServer, Server } from 'http';
import passport from 'passport';
import { Singleton } from 'typescript-ioc';

@Singleton
export class ExpressAppProvider {

  public app: express.Application = express();
  public server: Server;

  constructor() {
    this.app.use(json());
    this.app.use(cors());
    this.app.use(urlencoded({ extended: false }));
    this.app.use(passport.initialize());

    this.server = createServer(this.app);
  }

}
