import express from 'express';
import { checkAuth } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';

const router = express.Router();

router.post('/login', authController.login);
router.post('/register', authController.registrar);
router.post('/logout', authController.logout);
router.get('/status',checkAuth, authController.status);

export default router;