import { DailyPromise } from '../models/DailyPromise';
import { Notice } from '../models/Notice';
import { sendPushNotificationToAll, sendPushNotificationToAdmins } from './pushNotificationService';

const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 5 * 60; // Default 5:00 AM = 300 minutes
  const trimmed = timeStr.trim().toUpperCase();
  const isPM = trimmed.includes('PM');
  const isAM = trimmed.includes('AM');
  const clean = trimmed.replace(/AM|PM/gi, '').trim();
  const parts = clean.split(':');
  let h = parseInt(parts[0] || '5', 10);
  let m = parseInt(parts[1] || '0', 10);

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  return h * 60 + m;
};

/**
 * Custom Time Asia/Kolkata Daily Promise Auto-Publisher & Admin Alert Job
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
    const currentMinutes = hours * 60 + minutes;

    // Find today's promises that are still marked 'scheduled' (not yet 'sent')
    const scheduledPromises = await DailyPromise.find({
      date: todayStr,
      status: { $ne: 'sent' }
    });

    for (const promise of scheduledPromises) {
      const scheduledMinutes = parseTimeToMinutes(promise.time || '05:00 AM');

      // Trigger if current time is at or after scheduled time
      if (currentMinutes >= scheduledMinutes && promise.verseTelugu) {
        const pubTime = promise.time || '05:00 AM';
        console.log(`⏰ [Daily Promise Scheduler] Publishing promise for ${todayStr} at ${pubTime}: "${promise.referenceTelugu}"`);

        let notice = null;
        try {
          notice = await Notice.create({
            title: `🌅 నేటి వాగ్దానం (Daily Promise)`,
            description: `📖 "${promise.verseTelugu.trim()}" - ${promise.referenceTelugu.trim()}${promise.verseEnglish ? `\n\n"${promise.verseEnglish.trim()}" - ${promise.referenceEnglish || ''}` : ''}`,
            date: new Date().toISOString(),
            time: pubTime,
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

        const telTitle = '🕊️ నేటి దేవుని వాగ్దానము';
        const telBody = `"${promise.verseTelugu.trim()}"\n\n— ${promise.referenceTelugu.trim()}`;

        await sendPushNotificationToAll(
          telTitle,
          telBody,
          { 
            type: 'daily_promise', 
            date: todayStr,
            time: pubTime,
            verseTelugu: promise.verseTelugu,
            referenceTelugu: promise.referenceTelugu,
            verseEnglish: promise.verseEnglish,
            referenceEnglish: promise.referenceEnglish,
          }
        );

        promise.status = 'sent';
        promise.notificationSentAt = new Date();
        await promise.save();

        console.log(`✅ [Daily Promise Scheduler] Push notification sent and status updated to 'sent' for ${todayStr} at ${pubTime}`);
      }
    }

    // If 5:00 AM hour exact match and no promise found at all, alert admins once
    if (hours === 5 && minutes < 5) {
      const existingSent = await DailyPromise.findOne({ date: todayStr, status: 'sent' });
      if (!existingSent && scheduledPromises.length === 0) {
        console.log(`⚠️ No Daily Promise scheduled for today (${todayStr})! Alerting admins...`);
        await sendPushNotificationToAdmins(
          '⚠️ Admin Action Required: Daily Promise Missing!',
          `No Daily Promise is scheduled for today (${todayStr}). Please schedule today's promise in the app.`,
          { type: 'admin_promise_missing_alert', date: todayStr }
        );
      }
    }
  } catch (err) {
    console.error('Error running Daily Promise Scheduler job:', err);
  }
};
