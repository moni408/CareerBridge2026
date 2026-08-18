import { Response } from 'express';
import pool from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// Retrieve active list of user in-app notification logs
export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Session credentials untraced.' });
    return;
  }

  try {
    const query = `
      SELECT id, title, body, type, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `;
    const result = await pool.query(query, [userId]);
    res.status(200).json({ notifications: result.rows });
  } catch (error: any) {
    console.error('Error fetching notifications list:', error);
    res.status(500).json({ error: 'Could not fetch notifications feed logs.' });
  }
};

// Mark a specific notification document as read
export const markNotificationAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const notifId = parseInt(req.params.id);

  if (!userId) {
    res.status(401).json({ error: 'Session credentials untraced.' });
    return;
  }

  if (isNaN(notifId)) {
    res.status(400).json({ error: 'Invalid notification ID provided.' });
    return;
  }

  try {
    const query = `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING id, is_read
    `;
    const result = await pool.query(query, [notifId, userId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Notification record could not be located.' });
      return;
    }

    res.status(200).json({ success: true, notification: result.rows[0] });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed DB update session for notification read status.' });
  }
};

// Batch update all matching notifications to read status
export const markAllAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Session credentials untraced.' });
    return;
  }

  try {
    const query = `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1 AND is_read = FALSE
    `;
    await pool.query(query, [userId]);
    res.status(200).json({ success: true, message: 'All active notifications loaded as read.' });
  } catch (error: any) {
    console.error('Error batch updating notifications status:', error);
    res.status(500).json({ error: 'Error processing database batch update request.' });
  }
};
