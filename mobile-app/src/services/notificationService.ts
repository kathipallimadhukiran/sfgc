import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.log('expo-notifications require notice:', e);
}

if (Notifications && Notifications.setNotificationHandler) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority?.MAX || 'max',
      }),
    });
  } catch (err) {
    console.log('setNotificationHandler notice:', err);
  }
}

class NotificationService {
  private isConfigured = false;
  public pushToken: string | null = null;

  async init(userToken?: string | null): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      // 1. Android Notification Channel setup (MANDATORY on Android 8.0+)
      if (Platform.OS === 'android' && Notifications?.setNotificationChannelAsync) {
        try {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Church Announcements & Services',
            importance: Notifications.AndroidImportance?.MAX || 5,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6366f1',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
          });
        } catch (chanErr) {
          console.log('Android notification channel setup notice:', chanErr);
        }
      }

      // 2. Check & Request Notification Permissions
      if (Notifications?.getPermissionsAsync) {
        try {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;

          if (existingStatus !== 'granted' && Notifications.requestPermissionsAsync) {
            const { status } = await Notifications.requestPermissionsAsync({
              ios: {
                allowAlert: true,
                allowBadge: true,
                allowSound: true,
              },
            });
            finalStatus = status;
          }

          if (finalStatus !== 'granted') {
            console.log('📱 Notification permission not granted by user.');
          }
        } catch (permErr) {
          console.log('Permission check notice:', permErr);
        }
      }

      this.isConfigured = true;

      // 3. Multi-Strategy Push Token Retrieval
      let tokenData: any = null;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        (Constants as any).easConfig?.projectId ||
        '2ee822fd-395a-4100-9455-38082844c266';

      // Strategy 1: Expo Push Token with EAS Project ID
      if (Notifications?.getExpoPushTokenAsync) {
        try {
          tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
          console.log('✅ Strategy 1 (Expo Push Token with EAS ProjectID) succeeded:', tokenData?.data);
        } catch (err1: any) {
          console.log('⚠️ Strategy 1 getExpoPushTokenAsync(projectId) notice:', err1?.message || err1);
        }
      }

      // Strategy 2: Expo Push Token without parameters
      if (!tokenData?.data && Notifications?.getExpoPushTokenAsync) {
        try {
          tokenData = await Notifications.getExpoPushTokenAsync();
          console.log('✅ Strategy 2 (Expo Default Token) succeeded:', tokenData?.data);
        } catch (err2: any) {
          console.log('⚠️ Strategy 2 getExpoPushTokenAsync() notice:', err2?.message || err2);
        }
      }

      // Strategy 3: Native Device FCM/APNs Push Token
      if (!tokenData?.data && Notifications?.getDevicePushTokenAsync) {
        try {
          const deviceTokenData = await Notifications.getDevicePushTokenAsync();
          if (deviceTokenData?.data) {
            tokenData = { data: deviceTokenData.data };
            console.log('✅ Strategy 3 (Native Device Token) succeeded:', tokenData?.data);
          }
        } catch (err3: any) {
          console.log('⚠️ Strategy 3 getDevicePushTokenAsync() notice:', err3?.message || err3);
        }
      }

      // Strategy 4: Fallback persistent token for local dev environment
      if (!tokenData?.data) {
        let devId = await AsyncStorage.getItem('expo_dev_push_token');
        if (!devId) {
          devId = `ExponentPushToken[dev_${Math.random().toString(36).substring(2, 12)}]`;
          await AsyncStorage.setItem('expo_dev_push_token', devId);
        }
        tokenData = { data: devId };
        console.log('📱 Persistent Dev Token assigned:', devId);
      }

      if (tokenData?.data) {
        const tokenString = String(tokenData.data);
        this.pushToken = tokenString;
        console.log('📱 Registered Device Push Token:', this.pushToken);

        // 4. Register Token with Backend Server
        await this.registerTokenWithBackend(tokenString, userToken);
        return tokenString;
      }

      return null;
    } catch (err) {
      console.log('Push notification initialization warning:', err);
      return null;
    }
  }

  async registerTokenWithBackend(pushToken: string, userToken?: string | null): Promise<void> {
    try {
      if (!pushToken) return;
      const storedToken = userToken || await AsyncStorage.getItem('userToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const res = await fetch(`${API_URL}/api/users/push-token`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ pushToken }),
      });
      const data = await res.json();
      console.log('✅ Mobile Push Token successfully registered with Church Backend:', data);
    } catch (err) {
      console.log('Warning syncing push token to backend:', err);
    }
  }

  async triggerNotification(title: string, body: string, data?: any, imageUrl?: string): Promise<void> {
    try {
      const img = imageUrl || data?.imageUrl || data?.image || data?.banner || '';
      if (Notifications?.scheduleNotificationAsync) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: data || {},
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority?.MAX || 'max',
            attachments: img ? [{ url: img }] : undefined,
          },
          trigger: null, // trigger immediately
        });
        console.log('🔔 System OS Notification Displayed:', title);
      }
    } catch (err: any) {
      console.log('Error triggering system OS notification:', err?.message || err);
    }
  }

  /**
   * Schedule OS Local Notification 2 Hours before event start time
   */
  async scheduleLocalEventReminder(event: any): Promise<void> {
    if (!event || !event.date || Platform.OS === 'web') return;

    try {
      const eventDate = new Date(event.date);
      const eventMs = eventDate.getTime();
      if (isNaN(eventMs)) return;

      const triggerTimeMs = eventMs - 2 * 60 * 60 * 1000; // 2 hours before
      const nowMs = Date.now();

      // Only schedule if 2h prior time is in the future
      if (triggerTimeMs > nowMs && Notifications?.scheduleNotificationAsync) {
        const timeStr = event.time ? ` at ${event.time}` : '';
        const bannerUrl = event.banner || event.imageUrl || '';

        const notificationId = `event_2h_${event._id || event.id || event.title}`;

        // Cancel previous scheduled instance if any to avoid duplicates
        try {
          await Notifications.cancelScheduledNotificationAsync(notificationId);
        } catch (cErr) {}

        await Notifications.scheduleNotificationAsync({
          identifier: notificationId,
          content: {
            title: `⏰ Upcoming Event in 2 Hours!`,
            body: `🗓️ ${event.title}\n📍 ${event.venue}${timeStr}`,
            data: {
              type: 'event',
              id: event._id || event.id,
              eventId: event._id || event.id,
              imageUrl: bannerUrl,
            },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority?.MAX || 'max',
            attachments: bannerUrl ? [{ url: bannerUrl }] : undefined,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(triggerTimeMs),
          },
        });
        console.log(`⏰ Scheduled local 2h OS notification for "${event.title}" at ${new Date(triggerTimeMs).toLocaleString()}`);
      }
    } catch (err: any) {
      console.log('Notice scheduling 2h local event notification:', err?.message || err);
    }
  }
}

export const notificationService = new NotificationService();
