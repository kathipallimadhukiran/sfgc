const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const axios = require('axios');

// Replace with your Render backend URL (e.g. https://sfgc-church-backend.onrender.com)
const RENDER_BACKEND_URL = process.env.RENDER_BACKEND_URL || 'https://sfgc-church-backend.onrender.com';

/**
 * Firebase Scheduled Cloud Function
 * Runs every 5 minutes 24/7 to:
 * 1. Wake up the Render API server if it is sleeping.
 * 2. Trigger scheduled push notifications (5:00 AM Daily Promise, 2-Hour Event Reminders, Live Streams).
 */
exports.triggerNotificationCron = onSchedule({
  schedule: 'every 5 minutes', // Runs automatically every 5 minutes
  timeZone: 'Asia/Kolkata',   // Configured for Indian Standard Time
  timeoutSeconds: 60,
  memory: '256MiB',
}, async (event) => {
  logger.info('⏰ Firebase Cloud Function woken up. Sending trigger request to Render backend...');

  try {
    const triggerUrl = `${RENDER_BACKEND_URL}/api/notifications/trigger-cron`;
    logger.info(`📡 Calling Render API: ${triggerUrl}`);

    const response = await axios.post(triggerUrl, {
      source: 'firebase_cloud_scheduler',
      timestamp: new Date().toISOString(),
    }, {
      timeout: 45000, // 45s timeout to allow sleeping Render server to wake up
    });

    logger.info('✅ Notification Trigger Response from Render API:', response.data);
  } catch (error) {
    if (error.response) {
      logger.error(`❌ Render backend responded with status ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      logger.error('⚠️ Timeout or no response from Render backend. Server might be waking up:', error.message);
    } else {
      logger.error('❌ Error executing trigger request:', error.message);
    }
  }
});
