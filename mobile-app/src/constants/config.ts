import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const MONGODB_DATA_API_URL = process.env.EXPO_PUBLIC_MONGODB_DATA_API_URL || '';
export const MONGODB_API_KEY = process.env.EXPO_PUBLIC_MONGODB_API_KEY || '';
export const MONGODB_DATA_SOURCE = process.env.EXPO_PUBLIC_MONGODB_DATA_SOURCE || 'Cluster0';
export const MONGODB_DATABASE = process.env.EXPO_PUBLIC_MONGODB_DATABASE || 'churchconnect';

const resolveBackendUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // If envUrl is a remote cloud URL (e.g. https://...), use it directly
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  // On Web, localhost:5000 is always correct
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }

  // On Native (Android / iOS):
  // 1. Automatically detect the development host IP from Expo bundler connection
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:5000`;
    }
  }

  // 2. Android Emulator fallback
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  return 'http://localhost:5000';
};

export const API_URL = resolveBackendUrl();
export const AUTH_URL = `${API_URL}/api/auth`;

console.log(`🔗 [ChurchApp] Backend Server URL configured to: ${API_URL}`);
