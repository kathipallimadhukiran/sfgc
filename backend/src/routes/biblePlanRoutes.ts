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
  getScheduledPromises,
  deleteDailyPromise,
  getAdminPlanStatistics,
  adminUpdatePlan,
  getPublicPlan,
  updatePublicPlan,
  translateVerse,
  resetUserPlanProgress,
} from '../controllers/biblePlanController';

import { authenticate, optionalAuthenticate } from '../middleware/auth';

const router = Router();

// Public / User Routes
router.get('/', getPlans);
router.get('/progress/:userId', getUserPlanProgress);
router.post('/reset-progress', resetUserPlanProgress);
router.post('/enroll', optionalAuthenticate, enrollPlan);
router.post('/mark-read', optionalAuthenticate, markDayAsRead);
router.post('/generate-quiz', optionalAuthenticate, getPassageQuiz);
router.post('/submit-quiz', optionalAuthenticate, submitQuizAttempt);
router.get('/leaderboard', getLeaderboard);
router.get('/daily-promise', getDailyPromise);
router.post('/daily-promise', setDailyPromise);
router.post('/translate-verse', translateVerse);
router.get('/scheduled-promises', getScheduledPromises);
router.delete('/daily-promise/:date', deleteDailyPromise);


// Shareable Public Contributor Link Routes (No Admin Login Required)
router.get('/public/:planId', getPublicPlan);
router.post('/public/update-plan', updatePublicPlan);

// Admin Routes
router.get('/admin/statistics', getAdminPlanStatistics);
router.post('/admin/update-plan', adminUpdatePlan);

export default router;

