import { Router } from 'express';


import usersRouter from './users.js';
import instructorApplicationRouter from './instructorApplication.js';
import instructorStudentsRouter from './instructorStudents.js';


const router = Router();

router.use('/users', usersRouter);
router.use('/instructor-applications', instructorApplicationRouter);
router.use('/instructors', instructorStudentsRouter);

export default router;
