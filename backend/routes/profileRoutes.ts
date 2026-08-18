import { Router } from 'express';
import { getStudentProfile, browseMentors } from '../controllers/profileController.js';
import { authGuard, roleGuard } from '../middleware/auth.js';

const router = Router();

// /api/profiles/student/:id -> Mentor only (or admin/self) views detailed student dossiers
router.get('/student/:id', authGuard, roleGuard(['mentor', 'admin']), getStudentProfile);

// /api/profiles/mentors -> List available matching mentors for graduate students
router.get('/mentors', authGuard, browseMentors);

export default router;
