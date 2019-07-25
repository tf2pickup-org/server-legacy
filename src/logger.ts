import { createLogger, format, transports } from 'winston';
import { config } from './config';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),
  defaultMeta: { service: 'tf2pickup.pl' },
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
  ],
});

if (!config.production) {
  logger.add(new transports.Console({
    level: 'debug',
    format: format.combine(
      format.colorize(),
      format.simple(),
    ),
  }));
} else {
  logger.exceptions.handle(new transports.File({ filename: 'error.log' }));
}

if (config.debugLog) {
  logger.add(new transports.File({ filename: 'debug.log', level: 'debug' }));
}

export default logger;
