import { json, urlencoded } from 'body-parser';
import cors from 'cors';
import express from 'express';
import { createServer, Server } from 'http';
import passport from 'passport';
import socketio from 'socket.io';
import { setupAuth } from './auth';
import { connectToTheDatabase } from './database';
import logger from './logger';
import { Routes } from './routes';

class App {
  public app: express.Application;
  private routes: Routes = new Routes();
  private server: Server;
  private io: SocketIO.Server;

  constructor() {
    connectToTheDatabase();
    this.app = express();
    this.configure();
    this.routes.routes(this.app);
  }

  public listen(port: number) {
    this.server.listen(port, () => {
      logger.info(`running on port ${port}`);
    });
  }

  private configure() {
    this.app.use(json());
    this.app.use(cors());
    this.app.use(urlencoded({ extended: false }));
    this.app.use(passport.initialize());
    setupAuth(this.app);

    this.server = createServer(this.app);
    this.io = socketio(this.server);

    this.io.on('connection', () => logger.debug('connection'));
  }

}

export default new App();
