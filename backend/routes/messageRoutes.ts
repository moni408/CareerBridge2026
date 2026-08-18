import { Router } from 'express';
import { sendMessage, getChatHistory } from '../controllers/messageController.js';
import { authGuard } from '../middleware/auth.js';

const router = Router();

// /api/messages/send -> Send peer-to-peer message thread (real-time synchronized)
router.post('/send', authGuard, sendMessage);

// /api/messages/history/:peerId -> Get history chats between current session and chosen peer ID
router.get('/history/:peerId', authGuard, getChatHistory);

export default router;
