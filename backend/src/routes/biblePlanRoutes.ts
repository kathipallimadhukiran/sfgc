import { Router } from 'express';
import {
  getPlans,
  getUserPlanProgress,
  enrollPlan,
  markDayAsRead,
  getPassageQuiz,
  submitQuizAttempt,
  getLeaderboard,
  getDailyPromise,
  setDailyPromise,
  getAdminPlanStatistics,
  adminUpdatePlan,
} from '../controllers/biblePlanController';

const router = Router();

// Public / User Routes
router.get('/', getPlans);
router.get('/progress/:userId', getUserPlanProgress);
router.post('/enroll', enrollPlan);
router.post('/mark-read', markDayAsRead);
router.post('/generate-quiz', getPassageQuiz);
router.post('/submit-quiz', submitQuizAttempt);
router.get('/leaderboard', getLeaderboard);
router.get('/daily-promise', getDailyPromise);
router.post('/daily-promise', setDailyPromise);

// Admin Routes
router.get('/admin/statistics', getAdminPlanStatistics);
router.post('/admin/update-plan', adminUpdatePlan);

export default router;
