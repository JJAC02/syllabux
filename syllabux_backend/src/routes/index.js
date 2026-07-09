import { Router } from 'express';


import usersRouter from './users.js';
import instructorApplicationRouter from './instructorApplication.js';
import instructorStudentsRouter from './instructorStudents.js';
import coursesRouter from './courses.js';
import categoriesRouter from './categories.js';
import studentsRouter from './students.js';


const router = Router();

router.use('/users', usersRouter);
router.use('/instructor-applications', instructorApplicationRouter);
router.use('/instructors', instructorStudentsRouter);
router.use('/courses', coursesRouter);
router.use('/categories', categoriesRouter);
router.use('/students', studentsRouter);

export default router;
