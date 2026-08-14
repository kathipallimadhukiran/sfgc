import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior for foreground mode
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  console.log('Notifications setup warning:', e);
}

class NotificationService {
  private isConfigured = false;

  async init(): Promise<void> {
    if (this.isConfigured || Platform.OS === 'web') return;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        this.isConfigured = true;
        console.log('✅ Local push notifications initialized');
      }
    } catch (err) {
      console.log('Push notification permission warning:', err);
    }
  }

  async triggerNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      await this.init();
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
