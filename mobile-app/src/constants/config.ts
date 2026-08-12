import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const MONGODB_DATA_API_URL = process.env.EXPO_PUBLIC_MONGODB_DATA_API_URL || '';
export const MONGODB_API_KEY = process.env.EXPO_PUBLIC_MONGODB_API_KEY || '';
export const MONGODB_DATA_SOURCE = process.env.EXPO_PUBLIC_MONGODB_DATA_SOURCE || 'Cluster0';
export const MONGODB_DATABASE = process.env.EXPO_PUBLIC_MONGODB_DATABASE || 'churchconnect';

const resolveBackendUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // If envUrl is set, use it directly
  if (envUrl && envUrl.length > 0) {
    return envUrl;
  }

  // Default to live Render cloud backend
  return 'https://sfgc-church.onrender.com';
};

export const API_URL = resolveBackendUrl();
export const AUTH_URL = `${API_URL}/api/auth`;

console.log(`🔗 [ChurchApp] Backend Server URL configured to: ${API_URL}`);
