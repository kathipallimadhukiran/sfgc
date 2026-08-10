import { Router } from 'express';
import { 
  getPrayerRequests, 
  createPrayerRequest, 
  prayForRequest, 
  updatePrayerStatus, 
  deletePrayerRequest 
} from '../controllers/prayerController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', getPrayerRequests);
router.post('/', createPrayerRequest);
router.post('/:id/pray', prayForRequest);
router.put('/:id/status', updatePrayerStatus);
router.delete('/:id', deletePrayerRequest);

export default router;
