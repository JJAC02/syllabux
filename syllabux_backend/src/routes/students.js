import { Router } from "express";
import * as studentsController from '../controllers/students.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// router.get('/', studentsController.loadStudent);
router.use(auth);
/* NEEDED ROUTES
    Load {Dashboard, Modules, Progress} 
    Update {User info}
*/
router.get('/', studentsController.loadDashboard);
router.get('/s', studentsController.loadStudent);
router.post('/enroll', studentsController.enrollStudent);
// router.post('/update', studentsController.updateStudentDetails);
// router.post('/remove', studentsController.deleteStudent);

export default router;