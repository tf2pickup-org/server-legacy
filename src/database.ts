import { connect } from 'mongoose';
import logger from './logger';

export function connectToTheDatabase() {
  connect('mongodb://localhost:27017/tf2pickuppl', { useNewUrlParser: true })
      .then(() => logger.debug('connected to MongoDB'));
}
