import { Router } from 'express';
import { getEvents, getEventById, createEvent, updateEvent, deleteEvent, toggleRSVP, pushEventNotification } from '../controllers/eventController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', getEvents);
router.get('/:id', getEventById);

// RSVP toggle
router.post('/:id/rsvp', toggleRSVP);

// Protected routes for event creation & editing & pushing notifications
router.post('/', authenticate, requireRole(['Admin', 'Super Admin', 'Event Coordinator']), createEvent);
router.post('/:id/push', authenticate, requireRole(['Admin', 'Super Admin', 'Event Coordinator']), pushEventNotification);
router.put('/:id', authenticate, requireRole(['Admin', 'Super Admin', 'Event Coordinator']), updateEvent);
router.delete('/:id', authenticate, requireRole(['Admin', 'Super Admin']), deleteEvent);

export default router;
