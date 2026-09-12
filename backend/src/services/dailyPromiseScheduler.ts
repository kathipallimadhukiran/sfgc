import { DailyPromise } from '../models/DailyPromise';
import { Notice } from '../models/Notice';
import { sendPushNotificationToAll, sendPushNotificationToAdmins } from './pushNotificationService';

/**
 * Get current date string explicitly formatted in Asia/Kolkata timezone (YYYY-MM-DD)
 */
export const getKolkataDateStr = (dateObj: Date = new Date()): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });
    return formatter.format(dateObj); // Returns "YYYY-MM-DD"
  } catch (e) {
    return dateObj.toISOString().split('T')[0];
  }
};

/**
 * Get current time details explicitly in Asia/Kolkata timezone
 */
export const getKolkataTimeMinutes = (dateObj: Date = new Date()): { hours: number; minutes: number; currentMinutes: number } => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(dateObj);

    let hours = 0;
    let minutes = 0;
    for (const part of parts) {
      if (part.type === 'hour') hours = parseInt(part.value, 10) % 24;
      if (part.type === 'minute') minutes = parseInt(part.value, 10);
    }
    return { hours, minutes, currentMinutes: hours * 60 + minutes };
  } catch (e) {
    const h = dateObj.getHours();
    const m = dateObj.getMinutes();
    return { hours: h, minutes: m, currentMinutes: h * 60 + m };
  }
};

/**
 * Parse time string ("05:00 AM", "5:00 PM", "17:30", "02.05pm") into minutes from midnight (0-1439)
 */
export const parseTimeToMinutes = (timeStr?: string): number => {
  if (!timeStr || typeof timeStr !== 'string') return 5 * 60; // Default 5:00 AM = 300 minutes
  const trimmed = timeStr.trim().toUpperCase();
  const isPM = trimmed.includes('PM');
  const isAM = trimmed.includes('AM');
  const clean = trimmed.replace(/AM|PM/gi, '').trim();
  const parts = clean.split(/[:.]/);
  let h = parseInt(parts[0] || '5', 10);
  let m = parseInt(parts[1] || '0', 10);

  if (isNaN(h)) h = 5;
  if (isNaN(m)) m = 0;

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  return h * 60 + m;
};

/**
 * Custom Time Asia/Kolkata Daily Promise Auto-Publisher & Admin Alert Job
 */
export const checkDailyPromiseJob = async (io?: any): Promise<void> => {
  try {
    const todayStr = getKolkataDateStr();
    const { hours, minutes, currentMinutes } = getKolkataTimeMinutes();

    // Find unsent promises scheduled for today or overdue from previous days
    const scheduledPromises = await DailyPromise.find({
      status: { $ne: 'sent' },
      date: { $lte: todayStr },
    }).sort({ date: 1, createdAt: 1 });

    if (scheduledPromises.length > 0) {
      console.log(`🔍 [Daily Promise Scheduler] IST Date: ${todayStr}, IST Time: ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')} (${currentMinutes} mins). Unsent promises found: ${scheduledPromises.length}`);
    }

    for (const promise of scheduledPromises) {
      const scheduledMinutes = parseTimeToMinutes(promise.time || '05:00 AM');
      const isOverdue = promise.date < todayStr;
      const isTimeReached = promise.date === todayStr && currentMinutes >= scheduledMinutes;

      if (!isOverdue && !isTimeReached) {
        console.log(`⏳ [Daily Promise Scheduler] Promise "${promise.referenceTelugu}" (${promise.date} @ ${promise.time}) is scheduled for ${scheduledMinutes} mins. Current IST: ${currentMinutes} mins. Waiting for target time.`);
      }

      // Trigger if date is in past or current time is at/after scheduled time
      if ((isOverdue || isTimeReached) && promise.verseTelugu) {
        const pubTime = promise.time || '05:00 AM';
        console.log(`🚀 [Daily Promise Scheduler] Publishing promise NOW for ${promise.date} at ${pubTime}: "${promise.referenceTelugu}"`);

        const telTitle = '🕊️ నేటి దేవుని వాగ్దానము';
        const telBody = `"${promise.verseTelugu.trim()}"\n\n— ${promise.referenceTelugu.trim()}`;

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
            console.log(`📡 [Daily Promise Scheduler] Broadcasting Socket.IO events 'newNotice' and 'new_promise_notification'...`);
            io.emit('newNotice', notice);
            io.emit('new_promise_notification', {
              promise,
              title: telTitle,
              verseTelugu: promise.verseTelugu,
              referenceTelugu: promise.referenceTelugu,
              verseEnglish: promise.verseEnglish,
              referenceEnglish: promise.referenceEnglish,
              date: promise.date,
              time: pubTime,
            });
          }
        } catch (e) {
          console.error('⚠️ [Daily Promise Scheduler] Notice auto-creation error:', e);
        }

        // Send Push Notification to all registered Expo mobile devices
        console.log(`📱 [Daily Promise Scheduler] Dispatching Expo Push Notification to registered mobile devices...`);
        const pushRes = await sendPushNotificationToAll(
          telTitle,
          telBody,
          { 
            type: 'daily_promise', 
            date: promise.date,
            time: pubTime,
            verseTelugu: promise.verseTelugu,
            referenceTelugu: promise.referenceTelugu,
            verseEnglish: promise.verseEnglish,
            referenceEnglish: promise.referenceEnglish,
          }
        );
        console.log(`📱 [Daily Promise Scheduler] Push result:`, pushRes.message);

        promise.status = 'sent';
        promise.notificationSentAt = new Date();
        await promise.save();

        console.log(`✅ [Daily Promise Scheduler] Promise status updated to 'sent' for ${promise.date} at ${pubTime}`);
      }
    }

    // Early morning admin alert if no promise exists for today
    if (hours === 5 && minutes < 5) {
      const existingSent = await DailyPromise.findOne({ date: todayStr, status: 'sent' });
      const todayScheduled = await DailyPromise.findOne({ date: todayStr });
      if (!existingSent && !todayScheduled) {
        console.log(`⚠️ [Daily Promise Scheduler] No Daily Promise scheduled for today (${todayStr})! Alerting admins...`);
        await sendPushNotificationToAdmins(
          '⚠️ Admin Action Required: Daily Promise Missing!',
          `No Daily Promise is scheduled for today (${todayStr}). Please schedule today's promise in the app.`,
          { type: 'admin_promise_missing_alert', date: todayStr }
        );
      }
    }
  } catch (err) {
    console.error('❌ [Daily Promise Scheduler Error]:', err);
  }
};
