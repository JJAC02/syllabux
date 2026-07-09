import { Router } from 'express';
import * as coursesController from '../controllers/courses.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

router.get('/', coursesController.list);
router.get('/:id', coursesController.getById);
router.post('/', requireRole('instructor'), coursesController.create);
router.put('/:id', requireRole('instructor'), coursesController.update);
router.delete('/:id', requireRole('instructor'), coursesController.remove);

export default router;