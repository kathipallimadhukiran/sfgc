import { DailyPromise } from '../models/DailyPromise';
import { Notice } from '../models/Notice';
import { sendPushNotificationToAll, sendPushNotificationToAdmins } from './pushNotificationService';

let lastProcessedDate = '';

/**
 * 5:00 AM Daily Promise Auto-Publisher & Admin Alert Job
 */
export const checkDailyPromiseJob = async (io?: any): Promise<void> => {
  try {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const todayStr = now.toISOString().split('T')[0];

    // Trigger daily at 5:00 AM (runs once per day)
    if (hours === 5 && minutes < 5 && lastProcessedDate !== todayStr) {
      lastProcessedDate = todayStr;
      console.log(`⏰ [5:00 AM Daily Promise Scheduler] Checking promise for ${todayStr}...`);

      const promise = await DailyPromise.findOne({ date: todayStr });

      if (promise && promise.verseTelugu) {
        console.log(`✅ Scheduled Daily Promise found for today: "${promise.referenceTelugu}"`);

        // Create Notice Announcement for today's promise
        try {
          const notice = await Notice.create({
            title: `🌅 నేటి వాగ్దానం (Daily Promise)`,
            description: `📖 "${promise.verseTelugu.trim()}" - ${promise.referenceTelugu.trim()}${promise.verseEnglish ? `\n\n"${promise.verseEnglish.trim()}" - ${promise.referenceEnglish || ''}` : ''}`,
            date: new Date().toISOString(),
            time: '05:00 AM',
            location: 'Daily Scripture Verse',
            isPinned: false,
          });

          if (io) {
            io.emit('newNotice', notice);
            io.emit('new_promise_notification', { promise });
          }
        } catch (e) {
          console.log('Notice auto-creation error for Daily Promise:', e);
        }

        // Send Push Notification to ALL users
        await sendPushNotificationToAll(
          '🌅 ఈనాటి వాగ్దానం (Today\'s Promise)',
          `📖 "${promise.verseTelugu.trim()}" - ${promise.referenceTelugu.trim()}`,
          { type: 'daily_promise', date: todayStr }
        );
      } else {
        console.log(`⚠️ No Daily Promise scheduled for today (${todayStr})! Alerting admins...`);

        // Send HIGH PRIORITY Push Notification ONLY to Admins
        await sendPushNotificationToAdmins(
          '⚠️ Admin Action Required: Daily Promise Missing!',
          `No Daily Promise is scheduled for today (${todayStr}). Please tap here to schedule today's promise now.`,
          { type: 'admin_promise_missing_alert', date: todayStr }
        );
      }
    }
  } catch (err) {
    console.error('Error running Daily Promise Scheduler job:', err);
  }
};
