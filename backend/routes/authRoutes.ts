import { Router } from 'express';
import { registerUser, loginUser, getCurrentProfile, updateFCMToken } from '../controllers/authController.js';
import { authGuard } from '../middleware/auth.js';

const router = Router();

// /api/auth/register -> Signup
router.post('/register', registerUser);

// /api/auth/login -> Signin
router.post('/login', loginUser);

// /api/auth/me -> Get current JWT user details
router.get('/me', authGuard, getCurrentProfile);

// /api/auth/fcm-token -> Update Device push token
router.post('/fcm-token', authGuard, updateFCMToken);

export default router;
