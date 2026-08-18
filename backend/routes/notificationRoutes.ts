import { Router } from 'express';
import { getNotifications, markNotificationAsRead, markAllAsRead } from '../controllers/notificationController.js';
import { authGuard } from '../middleware/auth.js';

const router = Router();

// /api/notifications -> Retrieve user specific custom notification feed
router.get('/', authGuard, getNotifications);

// /api/notifications/:id/read -> Mark singular active log as read
router.patch('/:id/read', authGuard, markNotificationAsRead);

// /api/notifications/read-all -> Convert all unread feed alerts into read
router.post('/read-all', authGuard, markAllAsRead);

export default router;
