import mongoose from 'mongoose';
import { config } from './config';

export const connectDB = async (): Promise<typeof mongoose | null> => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error: any) {
    console.warn(`⚠️ MongoDB Connection Warning: ${error.message}`);
    console.log(`ℹ️ Running in resilient mode. Ensure MongoDB is running on ${config.mongoUri}`);
    return null;
  }
};
