import { DailyPromise } from '../models/DailyPromise';
import { Notice } from '../models/Notice';
import { sendPushNotificationToAll, sendPushNotificationToAdmins } from './pushNotificationService';

/**
 * 5:00 AM Asia/Kolkata Daily Promise Auto-Publisher & Admin Alert Job
 */
export const checkDailyPromiseJob = async (io?: any): Promise<void> => {
  try {
    // Get current date & time explicitly in Asia/Kolkata timezone
    const nowKolkata = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const hours = nowKolkata.getHours();
    const minutes = nowKolkata.getMinutes();
    
    const year = nowKolkata.getFullYear();
    const month = String(nowKolkata.getMonth() + 1).padStart(2, '0');
    const day = String(nowKolkata.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // Trigger daily at/after 5:00 AM in Asia/Kolkata
    if (hours >= 5) {
      // Find today's promise that is still marked 'scheduled' (not yet 'sent')
      const promise = await DailyPromise.findOne({
        date: todayStr,
        status: { $ne: 'sent' }
      });

      if (promise && promise.verseTelugu) {
        console.log(`⏰ [5:00 AM IST Daily Promise Scheduler] Publishing promise for ${todayStr}: "${promise.referenceTelugu}"`);

        // Create Notice Announcement for today's promise at 5:00 AM
        let notice = null;
        try {
          notice = await Notice.create({
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
        const telTitle = '🕊️ నేటి దేవుని వాగ్దానము';
        const telBody = `"${promise.verseTelugu.trim()}"\n\n— ${promise.referenceTelugu.trim()}`;

        await sendPushNotificationToAll(
          telTitle,
          telBody,
          { 
            type: 'daily_promise', 
            date: todayStr,
            verseTelugu: promise.verseTelugu,
            referenceTelugu: promise.referenceTelugu,
            verseEnglish: promise.verseEnglish,
            referenceEnglish: promise.referenceEnglish,
          }
        );

        // Mark as sent to prevent duplicate notifications
        promise.status = 'sent';
        promise.notificationSentAt = new Date();
        await promise.save();

        console.log(`✅ [Daily Promise Scheduler] Push notification sent and status updated to 'sent' for ${todayStr}`);
      } else {
        // If 5:00 AM hour exact match and no promise found at all, alert admins once
        if (hours === 5 && minutes < 5) {
          const existingSent = await DailyPromise.findOne({ date: todayStr, status: 'sent' });
          if (!existingSent) {
            console.log(`⚠️ No Daily Promise scheduled for today (${todayStr})! Alerting admins...`);
            await sendPushNotificationToAdmins(
              '⚠️ Admin Action Required: Daily Promise Missing!',
              `No Daily Promise is scheduled for today (${todayStr}). Please schedule today's promise in the app.`,
              { type: 'admin_promise_missing_alert', date: todayStr }
            );
          }
        }
      }
    }
  } catch (err) {
    console.error('Error running Daily Promise Scheduler job:', err);
  }
};
