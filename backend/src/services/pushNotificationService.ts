import { User } from '../models/User';
import { PushToken } from '../models/PushToken';

export interface PushMessagePayload {
  to: string;
  sound?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

/**
 * Send real system push notifications to all Expo registered mobile devices
 */
export const sendPushNotificationToAll = async (
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<{ success: boolean; sentCount: number; message: string }> => {
  try {
    // 1. Gather tokens from logged in Users
    const userTokens = await User.find({ pushToken: { $exists: true, $ne: '' } }).distinct('pushToken');
    
    // 2. Gather tokens from PushToken collection (all mobile devices & guests)
    const deviceTokens = await PushToken.find({ token: { $exists: true, $ne: '' } }).distinct('token');

    // Combine and deduplicate
    const tokens = Array.from(new Set([...userTokens, ...deviceTokens].filter(Boolean))) as string[];

    if (tokens.length === 0) {
      console.log('ℹ️ No registered mobile Expo push tokens found in database.');
      return { success: false, sentCount: 0, message: 'No registered mobile devices found.' };
    }

    const messages: PushMessagePayload[] = tokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: { ...data, timestamp: new Date().toISOString() },
      badge: 1,
      priority: 'high',
      channelId: 'default',
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
    return { success: true, sentCount: tokens.length, message: `Push notification sent to ${tokens.length} mobile device(s).` };
  } catch (err: any) {
    console.error('⚠️ Error sending Expo push notification:', err?.message || err);
    return { success: false, sentCount: 0, message: err?.message || 'Error sending push notification.' };
  }
};
