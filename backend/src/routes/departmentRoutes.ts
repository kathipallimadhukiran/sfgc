import { Router } from 'express';
import { getDepartments, createDepartment, deleteDepartment } from '../controllers/departmentController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /api/departments - open to all members & guests
router.get('/', getDepartments);

// POST /api/departments - admin only
router.post('/', authenticate, requireAdmin, createDepartment);

// DELETE /api/departments/:id - admin only
router.delete('/:id', authenticate, requireAdmin, deleteDepartment);

export default router;
