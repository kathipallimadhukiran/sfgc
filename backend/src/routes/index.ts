import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import songRoutes from './songRoutes';
import eventRoutes from './eventRoutes';
import noticeRoutes from './noticeRoutes';
import prayerRoutes from './prayerRoutes';
import streamRoutes from './streamRoutes';
import voiceRoutes from './voiceRoutes';
import biblePlanRoutes from './biblePlanRoutes';
import departmentRoutes from './departmentRoutes';
import configRoutes from './configRoutes';

const router = Router();

// API Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    app: 'SFGC Backend Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mounted Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/songs', songRoutes);
router.use('/events', eventRoutes);
router.use('/notices', noticeRoutes);
router.use('/prayers', prayerRoutes);
router.use('/stream', streamRoutes);
router.use('/youtube', streamRoutes);
router.use('/voice', voiceRoutes);
router.use('/bible-plans', biblePlanRoutes);
router.use('/departments', departmentRoutes);
router.use('/config', configRoutes);

export default router;
