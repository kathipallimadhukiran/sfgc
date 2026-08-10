import { Router } from 'express';
import { getSongs, getSongById, createSong, updateSong, deleteSong } from '../controllers/songController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', getSongs);
router.get('/:id', getSongById);

// Protected routes for song edits
router.post('/', authenticate, requireRole(['Admin', 'Super Admin', 'Worship Leader', 'Media Team']), createSong);
router.put('/:id', authenticate, requireRole(['Admin', 'Super Admin', 'Worship Leader', 'Media Team']), updateSong);
router.delete('/:id', authenticate, requireRole(['Admin', 'Super Admin']), deleteSong);

export default router;
