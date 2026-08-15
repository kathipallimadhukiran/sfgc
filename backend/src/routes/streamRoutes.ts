import { Router } from 'express';
import { getStreamState, updateStreamState, getCastInfo } from '../controllers/streamController';
import { createLiveVideo, deleteLiveVideo, getLiveVideos, updateLiveVideo } from '../controllers/liveVideoController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/videos', getLiveVideos);
router.post('/videos', authenticate, requireRole(['Admin', 'Super Admin']), createLiveVideo);
router.put('/videos/:id', authenticate, requireRole(['Admin', 'Super Admin']), updateLiveVideo);
router.delete('/videos/:id', authenticate, requireRole(['Admin', 'Super Admin']), deleteLiveVideo);
router.get('/cast-info', getCastInfo);
router.get('/', getStreamState);
router.put('/', authenticate, requireRole(['Admin', 'Super Admin', 'Media Team', 'Worship Leader']), updateStreamState);
router.post('/', authenticate, requireRole(['Admin', 'Super Admin', 'Media Team', 'Worship Leader']), updateStreamState);

export default router;
