import { Router } from 'express';
import * as categoriesController from '../controllers/categories.js';

const router = Router();

router.get('/', categoriesController.list);

export default router;