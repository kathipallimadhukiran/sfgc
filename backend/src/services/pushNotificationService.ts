import { User } from '../models/User';

export interface PushMessagePayload {
  to: string;
  sound?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

/**
 * Send real push notifications to Expo registered mobile devices
 */
export const sendPushNotificationToAll = async (
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<void> => {
  try {
    // Find all users with a valid Expo push token
    const users = await User.find({ pushToken: { $exists: true, $ne: '' } });
    const tokens = Array.from(new Set(users.map(u => u.pushToken).filter(Boolean))) as string[];

    if (tokens.length === 0) {
      console.log('ℹ️ No registered mobile Expo push tokens found in database.');
      return;
    }

    const messages: PushMessagePayload[] = tokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: { ...data, timestamp: new Date().toISOString() },
      badge: 1,
      priority: 'high',
    }));

    // Chunk into batches of 100 as per Expo Push API guidelines
    const chunkSize = 100;
    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
    }

    console.log(`✅ Expo push notification dispatched to ${tokens.length} device(s): "${title}"`);
  } catch (err: any) {
    console.error('⚠️ Error sending Expo push notification:', err?.message || err);
  }
};
