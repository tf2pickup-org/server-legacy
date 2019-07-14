import { connect } from 'mongoose';

export async function connectToTheDatabase() {
  await connect('mongodb://localhost:27017/tf2pickuppl', { useNewUrlParser: true });
}
