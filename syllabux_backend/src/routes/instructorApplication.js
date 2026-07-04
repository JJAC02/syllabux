import { Router } from 'express'
import * as ApplicationController from '../controllers/instructorApplication.js'
import { requireRole } from '../middleware/requireRole.js'

const router = Router();

router.post('/', ApplicationController.apply);

router.get('/', requireRole('admin'), ApplicationController.applicationList);

export default router
