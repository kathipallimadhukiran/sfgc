import { Router } from 'express';
import { getNotices, getNoticeById, createNotice, updateNotice, deleteNotice, sendTestPush } from '../controllers/noticeController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', getNotices);
router.post('/test-push', sendTestPush);
router.get('/:id', getNoticeById);

// Protected routes for notice creation & editing
router.post('/', authenticate, requireRole(['Admin', 'Super Admin', 'Notice Manager', 'Media Team']), createNotice);
router.put('/:id', authenticate, requireRole(['Admin', 'Super Admin', 'Notice Manager', 'Media Team']), updateNotice);
router.delete('/:id', authenticate, requireRole(['Admin', 'Super Admin']), deleteNotice);

export default router;
