import { Router, Request, Response } from 'express';
import { checkDailyPromiseJob } from '../services/dailyPromiseScheduler';
import { checkUpcomingEventReminders } from '../services/eventNotificationScheduler';
import { autoSyncChannelVideosJob } from '../controllers/liveVideoController';

const router = Router();

/**
 * @route   POST /api/notifications/daily-promise
 * @desc    5:00 AM IST Daily Promise Trigger (Called by GitHub Actions / Cron)
 */
const triggerDailyPromise = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const io = req.app.get('io');
  try {
    console.log('🌅 [GITHUB ACTIONS] Triggering 5:00 AM Daily Promise Notification Job');
    await checkDailyPromiseJob(io);
    res.status(200).json({
      success: true,
      message: 'Daily Promise notification check completed successfully.',
      timestamp: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime,
    });
  } catch (error: any) {
    console.error('⚠️ Error in Daily Promise trigger:', error);
    res.status(500).json({ success: false, error: error?.message || error });
  }
};

/**
 * @route   POST /api/notifications/youtube-check
 * @desc    Every 20 Min YouTube Sync & Event Reminders Trigger (Called by GitHub Actions / Cron)
 */
const triggerYouTubeCheck = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const io = req.app.get('io');
  try {
    console.log('▶️ [GITHUB ACTIONS] Triggering 20-Min YouTube Sync & Event Reminder Job');
    await autoSyncChannelVideosJob(io);
    await checkUpcomingEventReminders(io);
    res.status(200).json({
      success: true,
      message: 'YouTube sync & event reminder check completed successfully.',
      timestamp: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime,
    });
  } catch (error: any) {
    console.error('⚠️ Error in YouTube check trigger:', error);
    res.status(500).json({ success: false, error: error?.message || error });
  }
};

/**
 * Combined fallback route
 */
const triggerAllCronJobs = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const io = req.app.get('io');
  try {
    console.log('⏰ [GITHUB ACTIONS] Triggering All Notification Jobs');
    await checkDailyPromiseJob(io);
    await checkUpcomingEventReminders(io);
    await autoSyncChannelVideosJob(io);
    res.status(200).json({
      success: true,
      message: 'All scheduled notification jobs executed successfully.',
      timestamp: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime,
    });
  } catch (error: any) {
    console.error('⚠️ Error in full cron trigger:', error);
    res.status(500).json({ success: false, error: error?.message || error });
  }
};

router.get('/daily-promise', triggerDailyPromise);
router.post('/daily-promise', triggerDailyPromise);

router.get('/youtube-check', triggerYouTubeCheck);
router.post('/youtube-check', triggerYouTubeCheck);

router.get('/trigger-cron', triggerAllCronJobs);
router.post('/trigger-cron', triggerAllCronJobs);

export default router;
