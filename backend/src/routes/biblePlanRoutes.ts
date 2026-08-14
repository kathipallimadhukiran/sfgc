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
  getPublicPlan,
  updatePublicPlan,
} from '../controllers/biblePlanController';

import { authenticate } from '../middleware/auth';

const router = Router();

// Public / User Routes
router.get('/', getPlans);
router.get('/progress/:userId', authenticate, getUserPlanProgress);
router.post('/enroll', authenticate, enrollPlan);
router.post('/mark-read', authenticate, markDayAsRead);
router.post('/generate-quiz', authenticate, getPassageQuiz);
router.post('/submit-quiz', authenticate, submitQuizAttempt);
router.get('/leaderboard', getLeaderboard);
router.get('/daily-promise', getDailyPromise);
router.post('/daily-promise', setDailyPromise);


// Shareable Public Contributor Link Routes (No Admin Login Required)
router.get('/public/:planId', getPublicPlan);
router.post('/public/update-plan', updatePublicPlan);

// Admin Routes
router.get('/admin/statistics', getAdminPlanStatistics);
router.post('/admin/update-plan', adminUpdatePlan);

export default router;

