import { Router } from 'express';
import { getStreamState, updateStreamState } from '../controllers/streamController';
import { createLiveVideo, deleteLiveVideo, getLiveVideos } from '../controllers/liveVideoController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/videos', getLiveVideos);
router.post('/videos', authenticate, requireRole(['Admin', 'Super Admin']), createLiveVideo);
router.delete('/videos/:id', authenticate, requireRole(['Admin', 'Super Admin']), deleteLiveVideo);
router.get('/', getStreamState);
router.put('/', authenticate, requireRole(['Admin', 'Super Admin', 'Media Team', 'Worship Leader']), updateStreamState);

export default router;
