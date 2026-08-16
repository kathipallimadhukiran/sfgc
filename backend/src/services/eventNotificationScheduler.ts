import { Event } from '../models/Event';
import { sendPushNotificationToAll } from './pushNotificationService';
import { Server as SocketIOServer } from 'socket.io';

/**
 * Background worker that checks for events starting in approximately 2 hours
 * and automatically broadcasts a push notification to all mobile app users.
 */
export const checkUpcomingEventReminders = async (io?: SocketIOServer): Promise<void> => {
  try {
    const now = new Date();
    const nowMs = now.getTime();

    // Fetch all events that haven't sent 2h notification yet
    const upcomingEvents = await Event.find({
      notified2hBefore: { $ne: true },
    });

    for (const evt of upcomingEvents) {
      if (!evt.date) continue;

      const eventDate = new Date(evt.date);
      const eventMs = eventDate.getTime();
      if (isNaN(eventMs)) continue;

      const diffMs = eventMs - nowMs;

      // Check if event starts between 1 hr 45 min and 2 hr 15 min from now
      const minWindowMs = 105 * 60 * 1000; // 1h 45m
      const maxWindowMs = 135 * 60 * 1000; // 2h 15m

      if (diffMs >= minWindowMs && diffMs <= maxWindowMs) {
        console.log(`⏰ [2-HOUR EVENT REMINDER] Triggering notification for event: "${evt.title}"`);

        const timeStr = evt.time ? ` at ${evt.time}` : '';
        const bannerUrl = evt.banner || '';

        // 1. Send push notification
        const pushResult = await sendPushNotificationToAll(
          `⏰ Upcoming Event starting in 2 Hours!`,
          `🗓️ ${evt.title}\n📍 ${evt.venue}${timeStr}`,
          {
            type: 'event',
            id: evt._id.toString(),
            eventId: evt._id.toString(),
            imageUrl: bannerUrl,
            banner: bannerUrl,
          },
          bannerUrl
        );

        // 2. Broadcast socket event if connected
        if (io) {
          io.emit('upcomingEventReminder', {
            eventId: evt._id.toString(),
            title: evt.title,
            venue: evt.venue,
            date: evt.date,
            time: evt.time,
            banner: bannerUrl,
          });
        }

        // 3. Mark as notified so it doesn't trigger again
        evt.notified2hBefore = true;
        await evt.save();
        console.log(`✅ [2-HOUR REMINDER SENT] Marked event "${evt.title}" as notified. Push result:`, pushResult.message);
      }
    }
  } catch (err: any) {
    console.error('⚠️ Error checking 2-hour event reminders:', err?.message || err);
  }
};
