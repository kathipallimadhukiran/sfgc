import { Router, Request, Response } from 'express';
import { checkDailyPromiseJob } from '../services/dailyPromiseScheduler';
import { checkUpcomingEventReminders } from '../services/eventNotificationScheduler';
import { autoSyncChannelVideosJob } from '../controllers/liveVideoController';

const router = Router();

/**
 * @route   GET /api/notifications/trigger-cron
 * @route   POST /api/notifications/trigger-cron
 * @desc    External Cron / Firebase Cloud Function Trigger to wake up Render & execute scheduled notifications
 */
const triggerCronJobs = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const io = req.app.get('io');

  try {
    console.log('⏰ [FIREBASE/CRON TRIGGER] Received notification trigger from external service (Firebase / Cloud Scheduler)');

    // 1. Run 5:00 AM Daily Promise Auto-Publisher Check
    await checkDailyPromiseJob(io);

    // 2. Run 2-Hour Pre-Event Push Notification Reminder Check
    await checkUpcomingEventReminders(io);

    // 3. Run YouTube Channel Auto-Sync & Live Stream Alerts
    await autoSyncChannelVideosJob(io);

    const durationMs = Date.now() - startTime;

    res.status(200).json({
      success: true,
      message: 'Render server awake. All scheduled notification jobs executed successfully.',
      timestamp: new Date().toISOString(),
      executionTimeMs: durationMs,
    });
  } catch (error: any) {
    console.error('⚠️ Error processing Firebase notification trigger:', error);
    res.status(500).json({
      success: false,
      message: 'Error executing scheduled notification jobs.',
      error: error?.message || error,
    });
  }
};

router.get('/trigger-cron', triggerCronJobs);
router.post('/trigger-cron', triggerCronJobs);

export default router;
