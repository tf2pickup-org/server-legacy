import { Application } from 'express';
import { Server } from 'http';
import { inject, injectable } from 'inversify';
import { setupAuth } from './auth';
import { container } from './container';
import { connectToTheDatabase } from './database';
import { ExpressAppProvider } from './express-app-provider';
import { GameEventHandler } from './game-servers/game-event-handler';
import logger from './logger';
import { Routes } from './routes';

@injectable()
export class App {

  private app: Application;
  private server: Server;

  constructor(
    @inject(ExpressAppProvider) private expressAppProvider: ExpressAppProvider,
    @inject(GameEventHandler) private gameEventHandler: GameEventHandler,
  ) {
    this.app = this.expressAppProvider.app;
    this.server = this.expressAppProvider.server;
  }

  public async initialize() {
    await connectToTheDatabase();
    setupAuth(this.app);
    Routes.setupRoutes(this.app);
    this.gameEventHandler.initialize();
  }

  public listen(port: number) {
    this.server.listen(port, () => {
      logger.info(`running on port ${port}`);
    });
  }

}

container.bind(App).toSelf();
