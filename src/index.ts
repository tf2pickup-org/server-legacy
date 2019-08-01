import 'reflect-metadata';
import { App } from './app';
import { container } from './container';
import logger from './logger';

const PORT = parseInt(process.env.PORT, 10) || 3000;

async function run() {
  try {
    const app = container.get(App);
    app.initialize();
    app.listen(PORT);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}

run();
