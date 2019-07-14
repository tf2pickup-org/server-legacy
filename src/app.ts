import { Application } from 'express';
import { Server } from 'http';
import { Inject, Singleton } from 'typescript-ioc';
import { setupAuth } from './auth';
import { connectToTheDatabase } from './database';
import { ExpressAppProvider } from './express-app-provider';
import logger from './logger';
import { Routes } from './routes';

@Singleton
export class App {

  @Inject
  private expressAppProvider: ExpressAppProvider;

  private routes: Routes;
  private app: Application;
  private server: Server;

  constructor() {
    this.app = this.expressAppProvider.app;
    this.server = this.expressAppProvider.server;
  }

  public async initialize() {
    await connectToTheDatabase();
    setupAuth(this.app);

    this.routes = new Routes();
    this.routes.setupRoutes(this.app);
  }

  public listen(port: number) {
    this.server.listen(port, () => {
      logger.info(`running on port ${port}`);
    });
  }

}
