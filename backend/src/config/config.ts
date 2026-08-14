import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Find .env in current working dir or parent directory
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

export const sanitizeMongoUri = (uri: string): string => {
  if (!uri) return uri;
  return uri.trim().replace(/\/+(\?|$)/g, '$1');
};

const rawMongoUri = process.env.MONGODB_URI || 'mongodb+srv://kathipallimadhu_db_user:RqjWyCG22Ymr8R14@cluster0.tcnvbwf.mongodb.net/SFGC?retryWrites=true&w=majority';

export const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: sanitizeMongoUri(rawMongoUri),
  jwtSecret: process.env.JWT_SECRET || 'church_connect_super_secret_jwt_key_2025_blessed_secure',
  jwtExpire: process.env.JWT_EXPIRE || '30d',
  clientOrigin: process.env.CLIENT_ORIGIN || '*',
};
