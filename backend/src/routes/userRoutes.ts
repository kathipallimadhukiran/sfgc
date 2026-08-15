import { Router } from 'express';
import { 
  getMembers, 
  getMemberById, 
  updateMember, 
  deleteMember, 
  addAssignment, 
  updateAssignment, 
  deleteAssignment,
  savePushToken
} from '../controllers/userController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Register Mobile Push Token (Public or Authenticated)
router.post('/push-token', savePushToken);

// Members list (Accessible to logged in users or admins)
router.get('/', getMembers);
router.get('/:id', getMemberById);

// Admin / Leader Operations
router.put('/:id', authenticate, requireRole(['Admin', 'Super Admin']), updateMember);
router.delete('/:id', authenticate, requireRole(['Admin', 'Super Admin']), deleteMember);

// Duty Assignments
router.post('/:id/assignments', authenticate, requireRole(['Admin', 'Super Admin', 'Worship Leader', 'Media Team']), addAssignment);
router.put('/:id/assignments/:assignmentId', authenticate, updateAssignment);
router.delete('/:id/assignments/:assignmentId', authenticate, requireRole(['Admin', 'Super Admin']), deleteAssignment);

export default router;
