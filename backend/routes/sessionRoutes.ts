import { Router } from 'express';
import { scheduleSession, getMySessions } from '../controllers/sessionController.js';
import { authGuard, roleGuard } from '../middleware/auth.js';

const router = Router();

// /api/sessions -> Fetch all virtual video scheduled sessions (Zoom/Meet) relevant to user role
router.get('/', authGuard, getMySessions);

// /api/sessions/schedule -> Mentor initializes Live Zoom or Meet meeting links to connected mentees
router.post('/schedule', authGuard, roleGuard(['mentor']), scheduleSession);

export default router;
