import { Platform } from 'react-native';

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

  async init(): Promise<void> {
    if (this.isConfigured || Platform.OS === 'web' || !Notifications) return;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        this.isConfigured = true;
        console.log('✅ System local notifications configured');
      }
    } catch (err) {
      console.log('Push notification permission warning:', err);
    }
  }

  async triggerNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      if (!Notifications) {
        console.log('📢 System Notification:', title, '-', body);
        return;
      }

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
