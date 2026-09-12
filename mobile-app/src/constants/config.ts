import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const MONGODB_DATA_API_URL = process.env.EXPO_PUBLIC_MONGODB_DATA_API_URL || '';
export const MONGODB_API_KEY = process.env.EXPO_PUBLIC_MONGODB_API_KEY || '';
export const MONGODB_DATA_SOURCE = process.env.EXPO_PUBLIC_MONGODB_DATA_SOURCE || 'Cluster0';
export const MONGODB_DATABASE = process.env.EXPO_PUBLIC_MONGODB_DATABASE || 'SFGC';

const resolveBackendUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // 1. Explicit environment variable takes top priority
  if (envUrl && envUrl.length > 0) {
    return envUrl;
  }

  // 2. If developer explicitly requested local backend in development
  if (process.env.EXPO_PUBLIC_USE_LOCAL === 'true') {
    const hostUri = Constants.expoConfig?.hostUri || (Constants as any).experienceUrl || '';
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:5000`;
      }
    }
    return 'http://localhost:5000';
  }

  // 3. Default to live Render cloud backend
  return 'https://sfgc-church.onrender.com';
};

export const API_URL = resolveBackendUrl();
export const AUTH_URL = `${API_URL}/api/auth`;

console.log(`🔗 [ChurchApp] Backend Server URL resolved to: ${API_URL}`);
