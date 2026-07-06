import { Router } from 'express';
import * as instructorStudentsController from '../controllers/instructorStudents.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

router.get('/students', requireRole('instructor'), instructorStudentsController.listStudents);

export default router;
