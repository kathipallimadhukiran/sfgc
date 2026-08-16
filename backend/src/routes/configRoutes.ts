import { Router } from 'express';
import { getAppVersionConfig, updateAppVersionConfig } from '../controllers/configController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Public endpoint for mobile app version checking on launch
router.get('/app-version', getAppVersionConfig);

// Admin route to release new versions
router.put('/app-version', authenticate, requireRole(['Admin', 'Super Admin']), updateAppVersionConfig);

export default router;
