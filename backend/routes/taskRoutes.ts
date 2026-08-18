import { Router } from 'express';
import { 
  assignTask, 
  submitTaskEvidence, 
  reviewAndGradeTask, 
  getMyTasks 
} from '../controllers/taskController.js';
import { authGuard, roleGuard } from '../middleware/auth.js';

const router = Router();

// /api/tasks -> Retrieve all assigned tasks (Mentor views assigned, student views tasks assigned to them)
router.get('/', authGuard, getMyTasks);

// /api/tasks/assign -> Mentor assigns a task to a student (Google-Classroom like)
router.post('/assign', authGuard, roleGuard(['mentor']), assignTask);

// /api/tasks/:taskId/submit -> Student uploads evidence URL/text to submit assigned task
router.post('/:taskId/submit', authGuard, roleGuard(['student']), submitTaskEvidence);

// /api/tasks/:taskId/grade -> Mentor updates grade scores and reviews task content
router.post('/:taskId/grade', authGuard, roleGuard(['mentor']), reviewAndGradeTask);

export default router;
