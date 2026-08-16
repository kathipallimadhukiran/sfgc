import mongoose from 'mongoose';
import { config } from './config';

/**
 * Drops any old Song text index that used language_override:'none'.
 * This caused MongoServerError 17262 ("language override unsupported: Telugu")
 * because MongoDB tried to use the song's 'language' field value as a stemmer language.
 * The fix is to drop the old index; Mongoose will recreate it with the correct
 * language_override:'lang_ignore' option defined in Song.ts.
 */
const migrateIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const collection = db.collection('songs');
    const indexes = await collection.indexes();

    // Find and drop the old stale text index
    for (const idx of indexes) {
      if (idx.name && idx.name !== '_id_' && idx.textIndexVersion) {
        // Drop it so Mongoose recreates with the patched schema options
        await collection.dropIndex(idx.name);
        console.log(`\u2705 Dropped old Song text index: ${idx.name} (will be recreated with correct language_override)`);
      }
    }
  } catch (e: any) {
    // Non-fatal: if index doesn't exist, ignore
    if (!e.message?.includes('index not found')) {
      console.warn('\u26a0\ufe0f Index migration warning:', e.message);
    }
  }
};

export const connectDB = async (): Promise<typeof mongoose | null> => {
  try {
    // Add event listeners for connection monitoring
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB Connection Error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB Disconnected. Attempting reconnection...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB Reconnected successfully.');
    });

    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 15000,
      family: 4,
    });
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}/${conn.connection.name}`);

    // Run one-time index migration to fix language override error
    await migrateIndexes();

    return conn;
  } catch (error: any) {
    console.error(`❌ MongoDB Connection Failed: ${error.message}`);
    console.log(`ℹ️ Ensure MONGODB_URI is correct and 0.0.0.0/0 is added in MongoDB Atlas Network Access.`);
    return null;
  }
};
