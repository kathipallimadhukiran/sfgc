import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  if (Notifications && Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (e) {
  console.log('expo-notifications module optional load:', e);
}

class NotificationService {
  private isConfigured = false;
  public pushToken: string | null = null;

  async init(userToken?: string | null): Promise<string | null> {
    if (Platform.OS === 'web' || !Notifications) return null;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('📱 Push notification permission not granted');
        return null;
      }

      this.isConfigured = true;

      // Get Expo Push Token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      this.pushToken = tokenData.data;
      console.log('📱 Registered Device Expo Push Token:', this.pushToken);

      // Register Token with Backend Server
      if (this.pushToken) {
        await this.registerTokenWithBackend(this.pushToken, userToken);
      }

      return this.pushToken;
    } catch (err) {
      console.log('Push notification registration warning:', err);
      return null;
    }
  }

  async registerTokenWithBackend(pushToken: string, userToken?: string | null): Promise<void> {
    try {
      const storedToken = userToken || await AsyncStorage.getItem('userToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      await fetch(`${API_URL}/api/users/push-token`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ pushToken }),
      });
      console.log('✅ Push Token successfully synced with Church Backend Server');
    } catch (err) {
      console.log('Warning syncing push token to backend:', err);
    }
  }

  async triggerNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      if (!Notifications) {
        console.log('📢 System Notification:', title, '-', body);
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger: null, // trigger immediately
      });
    } catch (err) {
      console.log('Error triggering local notification:', err);
    }
  }
}

export const notificationService = new NotificationService();
