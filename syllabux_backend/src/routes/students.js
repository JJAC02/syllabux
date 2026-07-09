import { Router } from "express";
import * as studentsController from '../controllers/students.js';
import { auth } from '../middleware/auth.js';

const router = Router();
router.use(auth);
/* NEEDED ROUTES
    Load {Dashboard, Modules, Progress} 
    Update {User info}
*/
router.get('/', studentsController.loadDashboard);
router.get('/:id', studentsController.loadStudent);
router.post('/enroll', studentsController.enrollStudent);

export default router;