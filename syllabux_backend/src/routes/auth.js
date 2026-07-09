import { Router } from 'express';
import * as authController from '../controllers/auth.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', auth, authController.logout);
router.post('/validatetoken', authController.tokenValidator);

export default router;