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
  attachments?: Array<{ url: string }>;
  richMedia?: string;
  image?: string;
}

/**
 * Send real system push notifications to all Expo registered mobile devices
 */
export const sendPushNotificationToAll = async (
  title: string,
  body: string,
  data: Record<string, any> = {},
  imageUrl?: string
): Promise<{ success: boolean; sentCount: number; message: string; expoResponse?: any }> => {
  try {
    // 1. Gather tokens from logged in Users
    const userTokens = await User.find({ pushToken: { $exists: true, $ne: '' } }).distinct('pushToken');
    
    // 2. Gather tokens from PushToken collection (all mobile devices & guests)
    const deviceTokens = await PushToken.find({ token: { $exists: true, $ne: '' } }).distinct('token');

    // Combine and deduplicate real Expo push tokens (filtering out mock dev tokens like ExponentPushToken[dev_...])
    const rawTokens = Array.from(new Set([...userTokens, ...deviceTokens].filter(Boolean))) as string[];
    const tokens = rawTokens.filter(t => t.startsWith('ExponentPushToken[') && !t.includes('[dev_'));

    // Asynchronously prune any leftover mock dev tokens from DB
    if (rawTokens.length !== tokens.length) {
      User.updateMany({ pushToken: { $regex: /\[dev_/ } }, { $set: { pushToken: '' } }).catch(() => {});
      PushToken.deleteMany({ token: { $regex: /\[dev_/ } }).catch(() => {});
    }

    if (tokens.length === 0) {
      console.log('ℹ️ No registered mobile Expo push tokens found in database.');
      return { success: false, sentCount: 0, message: 'No registered mobile devices found in database.' };
    }

    const imageToSend = imageUrl || data.image || data.imageUrl || data.banner || '';

    const messages: PushMessagePayload[] = tokens.map(token => {
      const msg: PushMessagePayload = {
        to: token,
        sound: 'default',
        title,
        body,
        data: { ...data, image: imageToSend, imageUrl: imageToSend, timestamp: new Date().toISOString() },
        badge: 1,
        priority: 'high',
        channelId: 'default',
      };

      if (imageToSend) {
        msg.attachments = [{ url: imageToSend }];
        msg.image = imageToSend;
        msg.richMedia = imageToSend;
      }

      return msg;
    });

    let lastExpoResponse: any = null;

    // Chunk into batches of 100 as per Expo Push API guidelines
    const chunkSize = 100;
    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      lastExpoResponse = await res.json();
      console.log('📱 [EXPO_PUSH_RESPONSE]', JSON.stringify(lastExpoResponse));

      // Clean up invalid or DeviceNotRegistered tokens automatically
      if (lastExpoResponse && Array.isArray(lastExpoResponse.data)) {
        for (const item of lastExpoResponse.data) {
          if (item.status === 'error' && (item.details?.error === 'DeviceNotRegistered' || item.details?.expoPushToken)) {
            const badToken = item.details?.expoPushToken;
            if (badToken) {
              console.log(`🧹 Cleaning up unregistered/invalid Expo push token: ${badToken}`);
              await User.updateMany({ pushToken: badToken }, { $set: { pushToken: '' } });
              await PushToken.deleteMany({ token: badToken });
            }
          }
        }
      }
    }

    console.log(`✅ Expo push notification dispatched to ${tokens.length} device(s): "${title}"`);
    return {
      success: true,
      sentCount: tokens.length,
      message: `Push notification sent to ${tokens.length} mobile device(s).`,
      expoResponse: lastExpoResponse,
    };
  } catch (err: any) {
    console.error('⚠️ Error sending Expo push notification:', err?.message || err);
    return { success: false, sentCount: 0, message: err?.message || 'Error sending push notification.' };
  }
};
