import { Response } from 'express';
import pool from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { sendRealTimeNotification } from '../services/socketService.js';
import { sendPushNotification } from '../services/fcmService.js';

// 1. Post a new chat message to a connected peer
export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const senderId = req.user?.id;
  const { receiverId, content } = req.body;

  if (!senderId) {
    res.status(401).json({ error: 'Session credentials untraced.' });
    return;
  }

  if (!receiverId || !content) {
    res.status(400).json({ error: 'Please submit receiverId and message content.' });
    return;
  }

  try {
    // Assert active matching relation, either Student-Mentor request is accepted
    const checkRelation = `
      SELECT id FROM mentorship_requests
      WHERE ((student_id = $1 AND mentor_id = $2) OR (student_id = $2 AND mentor_id = $1))
        AND status = 'accepted'
    `;
    const relationRes = await pool.query(checkRelation, [senderId, receiverId]);
    if (relationRes.rows.length === 0) {
      res.status(403).json({ error: 'Access forbidden. Chat can only occur between active, accepted mentees and mentors.' });
      return;
    }

    // Save message record
    const insertMessage = `
      INSERT INTO messages (sender_id, receiver_id, content, is_read)
      VALUES ($1, $2, $3, FALSE)
      RETURNING id, sender_id, receiver_id, content, is_read, created_at
    `;
    const msgResult = await pool.query(insertMessage, [senderId, receiverId, content.trim()]);
    const savedMessage = msgResult.rows[0];

    // Fetch sender metadata name
    const senderInfo = await pool.query('SELECT name FROM users WHERE id = $1', [senderId]);
    const senderName = senderInfo.rows[0]?.name || 'Someone';

    // 1. Emit live real-time message via socket channel (Feature 5)
    const isOnline = sendRealTimeNotification(receiverId, 'message_received', {
      message: savedMessage,
      senderName
    });

    // 2. Dispatch Push notification via FCM only if peer isn't consuming instantly via browser socket
    if (!isOnline) {
      // Soft-log notification alert
      const insertNotifQuery = `
        INSERT INTO notifications (user_id, title, body, type, is_read) 
        VALUES ($1, $2, $3, 'MESSAGE_RECEIVED', FALSE)
      `;
      await pool.query(insertNotifQuery, [
        receiverId,
        `New Message from ${senderName}`,
        content.length > 50 ? `${content.substring(0, 47)}...` : content
      ]);

      await sendPushNotification(
        receiverId,
        `New Message from ${senderName} 💬`,
        content.length > 100 ? `${content.substring(0, 97)}...` : content,
        { type: 'MESSAGE_RECEIVED', senderId: String(senderId) }
      );
    }

    res.status(201).json({
      message: 'Message posted successfully.',
      chatMessage: savedMessage
    });
  } catch (error: any) {
    console.error('Error in posting chat message:', error);
    res.status(500).json({ error: 'Failed DB insertion processing chat message.' });
  }
};

// 2. Retrieve continuous chat history with a peer
export const getChatHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const peerId = parseInt(req.params.peerId);

  if (!userId) {
    res.status(401).json({ error: 'Session credentials untraced.' });
    return;
  }

  if (isNaN(peerId)) {
    res.status(400).json({ error: 'Invalid Peer ID parameters.' });
    return;
  }

  try {
    const historyQuery = `
      SELECT id, sender_id, receiver_id, content, is_read, created_at
      FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
    `;
    const result = await pool.query(historyQuery, [userId, peerId]);

    // Automatically mark retrieved messages sent from Peer as read
    const markAsReadQuery = `
      UPDATE messages
      SET is_read = TRUE
      WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE
    `;
    await pool.query(markAsReadQuery, [peerId, userId]);

    res.status(200).json({ messages: result.rows });
  } catch (error: any) {
    console.error('Error fetching chat logs history:', error);
    res.status(500).json({ error: 'Unable to load conversational chat logs.' });
  }
};
