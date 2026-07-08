import { Router } from "express";
import * as studentsController from '../controllers/students.js';

const router = Router();

/* NEEDED ROUTES
    Load {Dashboard, Modules, Progress}
    Update {User info}
*/
router.post('/',studentsController.loadDashboard);
router.post('/:id',studentsController.loadStudent);

export default router;