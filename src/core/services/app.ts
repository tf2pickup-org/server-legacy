import { Server } from 'http';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { connectToTheDatabase } from '../../database';
import logger from '../../logger';
import { ExpressAppProvider } from './express-app-provider';

@provide(App)
export class App {

  private server: Server;

  constructor(
    @inject(ExpressAppProvider) private expressAppProvider: ExpressAppProvider,
  ) {
    this.server = this.expressAppProvider.server;
  }

  public async initialize() {
    await connectToTheDatabase();
  }

  public listen(port: number) {
    this.server.listen(port, () => {
      logger.info(`running on port ${port}`);
    });
  }

}
