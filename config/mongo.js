import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectMongo(uri = config.mongoUri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    autoIndex: true,
  });
  return mongoose;
}

export async function disconnectMongo() {
  await mongoose.disconnect();
}
