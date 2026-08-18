import { Router } from 'express';
import { 
  sendMentorshipRequest, 
  reviewMentorshipRequest, 
  getMyMentees, 
  getMyMentor 
} from '../controllers/mentorshipController.js';
import { authGuard, roleGuard } from '../middleware/auth.js';

const router = Router();

// /api/mentorship/request -> Student submits requests to connection mentor profiles
router.post('/request', authGuard, roleGuard(['student']), sendMentorshipRequest);

// /api/mentorship/request/:requestId/review -> Mentor evaluates connection requests
router.post('/request/:requestId/review', authGuard, roleGuard(['mentor']), reviewMentorshipRequest);

// /api/mentorship/mentees -> Mentor lists their accepted active mentees
router.get('/mentees', authGuard, roleGuard(['mentor', 'admin']), getMyMentees);

// /api/mentorship/my-mentor -> Student retrieves connection details of active mentor
router.get('/my-mentor', authGuard, roleGuard(['student']), getMyMentor);

export default router;
