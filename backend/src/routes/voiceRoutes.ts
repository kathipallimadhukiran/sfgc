import { Router } from 'express';
import { transcribeAudio } from '../controllers/voiceController';

const router = Router();

// POST /api/voice/transcribe
router.post('/transcribe', transcribeAudio);

export default router;
