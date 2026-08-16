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
  richContent?: { image: string };
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
      console.log('ℹ️ No registered physical mobile Expo push tokens in database. Broadcast sent via Socket.IO.');
      return { success: true, sentCount: 0, message: 'Notification broadcasted via real-time sockets (No registered mobile push tokens yet).' };
    }

    let rawImage = imageUrl || data.image || data.imageUrl || data.banner || '';
    if (rawImage.startsWith('data:')) {
      rawImage = ''; // Base64 data URLs cannot be fetched by Push notification services
    }
    if (rawImage.startsWith('/') && (process.env.BACKEND_URL || process.env.SERVER_URL)) {
      const baseUrl = (process.env.BACKEND_URL || process.env.SERVER_URL || '').replace(/\/$/, '');
      rawImage = `${baseUrl}${rawImage}`;
    }
    const imageToSend = rawImage;

    const messages: PushMessagePayload[] = tokens.map(token => {
      const msg: PushMessagePayload = {
        to: token,
        sound: 'default',
        title,
        body,
        data: { ...data, image: imageToSend, imageUrl: imageToSend, banner: imageToSend, timestamp: new Date().toISOString() },
        badge: 1,
        priority: 'high',
        channelId: 'default',
      };

      if (imageToSend) {
        msg.attachments = [{ url: imageToSend }];
        msg.richContent = { image: imageToSend };
        msg.image = imageToSend;
        msg.richMedia = imageToSend;
      }

      return msg;
    });

    console.log("========== EVENT NOTIFICATION ==========");
    console.log("Title:", title);
    console.log("Body:", body);
    console.log("Image URL:", imageToSend);
    console.log("Payload:", JSON.stringify(messages[0] || {}, null, 2));
    console.log("========================================");

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

/**
 * Send Priority Push Notification ONLY to Admin users
 */
export const sendPushNotificationToAdmins = async (
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<{ success: boolean; sentCount: number; message: string }> => {
  try {
    const adminUsers = await User.find({
      role: { $in: ['Admin', 'Super Admin'] },
      pushToken: { $exists: true, $ne: '' }
    }).distinct('pushToken');

    const tokens = adminUsers.filter(t => t && t.startsWith('ExponentPushToken[') && !t.includes('[dev_'));
    if (tokens.length === 0) {
      console.log('ℹ️ No registered admin Expo push tokens in database for admin alert.');
      return { success: true, sentCount: 0, message: 'No registered admin push tokens.' };
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

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    console.log(`🚨 Priority Admin push notification sent to ${tokens.length} admin device(s): "${title}"`);
    return { success: true, sentCount: tokens.length, message: `Admin notification sent to ${tokens.length} device(s).` };
  } catch (err: any) {
    console.error('⚠️ Error sending admin push notification:', err?.message || err);
    return { success: false, sentCount: 0, message: err?.message || 'Error sending admin push notification.' };
  }
};
