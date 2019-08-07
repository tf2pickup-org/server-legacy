import 'reflect-metadata';

import { buildProviderModule } from 'inversify-binding-decorators';
import { InversifyExpressServer } from 'inversify-express-utils';
import { container } from './container';
import { App, ExpressAppProvider } from './core';
import logger from './logger';

import './auth';
import './core';
import './game-servers';
import './games';
import './players';
import './profile';
import './queue';

const PORT = parseInt(process.env.PORT, 10) || 3000;

async function run() {
  try {
    container.load(buildProviderModule());

    const expressApp = container.get(ExpressAppProvider).app;
    new InversifyExpressServer(container, null, null, expressApp).build();

    const app = container.get(App);
    app.initialize();
    app.listen(PORT);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}

run();
