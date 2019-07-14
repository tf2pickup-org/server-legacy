import { App } from './app';
import logger from './logger';

const PORT = parseInt(process.env.PORT, 10) || 3000;

async function run() {
  try {
    const app = new App();
    app.initialize();
    app.listen(PORT);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}

run();
