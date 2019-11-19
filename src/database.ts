import { connect } from 'mongoose';
import { config } from './config';

export async function connectToTheDatabase() {
  await connect(`mongodb://${config.mongodb.username}:${config.mongodb.password}@` +
    `${config.mongodb.host}:${config.mongodb.port}/${config.mongodb.db}`,
    { useNewUrlParser: true, useUnifiedTopology: true },
  );
}
