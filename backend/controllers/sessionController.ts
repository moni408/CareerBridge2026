import { Response } from 'express';
import pool from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { createLiveSessionLink } from '../services/zoomMeetService.js';
import { sendRealTimeNotification } from '../services/socketService.js';
import { sendPushNotification } from '../services/fcmService.js';

// Notify helper
const notifyUser = async (userId: number, title: string, body: string, type: string) => {
  try {
    const insertNotifQuery = `
      INSERT INTO notifications (user_id, title, body, type, is_read) 
      VALUES ($1, $2, $3, $4, FALSE)
      RETURNING id, created_at
    `;
    const res = await pool.query(insertNotifQuery, [userId, title, body, type]);
    const saved = res.rows[0];

    sendRealTimeNotification(userId, 'notification_received', {
      id: saved.id,
      title,
      body,
      type,
      is_read: false,
      created_at: saved.created_at
    });

    await sendPushNotification(userId, title, body, { type });
  } catch (err) {
    console.error('Session notification trigger failed:', err);
  }
};

// 1. Mentor creates a live conference session (Zoom or Google Meet)
export const scheduleSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const mentorId = req.user?.id;
  const { menteeId, title, scheduleTime, platform } = req.body; // platform: 'zoom' or 'meet'

  if (!mentorId || req.user?.role !== 'mentor') {
    res.status(403).json({ error: 'Access denied. Only mentors are authorised to schedule live virtual video rounds.' });
    return;
  }

  if (!menteeId || !title || !scheduleTime || !platform) {
    res.status(400).json({ error: 'Please submit all required parameters: menteeId, title, scheduleTime, and platform (zoom/meet).' });
    return;
  }

  if (!['zoom', 'meet'].includes(platform)) {
    res.status(400).json({ error: 'Active session platform must be either "zoom" or "meet".' });
    return;
  }

  try {
    // Confirm target student is an accepted mentee of this mentor
    const checkConnection = `
      SELECT id FROM mentorship_requests 
      WHERE student_id = $1 AND mentor_id = $2 AND status = 'accepted'
    `;
    const checkResult = await pool.query(checkConnection, [menteeId, mentorId]);
    if (checkResult.rows.length === 0) {
      res.status(403).json({ error: 'Connection check failed. Target student is not linked to your registered profile.' });
      return;
    }

    // 2. Request actual link generation from service (Zoom API or Google Meet with fallbacks)
    const meetingLink = await createLiveSessionLink(platform, title, scheduleTime);

    // 3. Save session in Postgres
    const insertSession = `
      INSERT INTO sessions (mentor_id, mentee_id, title, schedule_time, platform, meeting_link, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')
      RETURNING id, title, schedule_time, platform, meeting_link, status, created_at
    `;
    const dbResult = await pool.query(insertSession, [
      mentorId,
      menteeId,
      title.trim(),
      new Date(scheduleTime),
      platform,
      meetingLink
    ]);

    const createdSession = dbResult.rows[0];

    // Notification: Notify Student/Mentee (FCM + Socket + In-app)
    const mentorInfo = await pool.query('SELECT name FROM users WHERE id = $1', [mentorId]);
    const mentorName = mentorInfo.rows[0]?.name || 'Your Mentor';
    const localizedTime = new Date(scheduleTime).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });

    await notifyUser(
      menteeId,
      'New Live Session Scheduled 📅',
      `${mentorName} has scheduled a live ${platform === 'zoom' ? 'Zoom Meeting' : 'Google Meet'} session: "${title}" at ${localizedTime}.`,
      'SESSION_SCHEDULED'
    );

    res.status(201).json({
      message: 'Live session scheduled successfully.',
      session: createdSession
    });
  } catch (error: any) {
    console.error('Error scheduling live mentorship session:', error);
    res.status(500).json({ error: 'Failed DB insertion or third-party API meeting schedule loop.' });
  }
};

// 2. List scheduled conference sessions for active session
export const getMySessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const role = req.user?.role;

  if (!userId) {
    res.status(401).json({ error: 'Session credentials untraced.' });
    return;
  }

  try {
    let query = '';
    let params: any[] = [];

    if (role === 'mentor') {
      // Mentor retrieves sessions they scheduled
      query = `
        SELECT s.*, u.name as mentee_name, u.email as mentee_email
        FROM sessions s
        JOIN users u ON u.id = s.mentee_id
        WHERE s.mentor_id = $1
        ORDER BY s.schedule_time ASC
      `;
      params = [userId];
    } else {
      // Student retrieves sessions scheduled for them
      query = `
        SELECT s.*, u.name as mentor_name, u.email as mentor_email
        FROM sessions s
        JOIN users u ON u.id = s.mentor_id
        WHERE s.mentee_id = $1
        ORDER BY s.schedule_time ASC
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);
    res.status(200).json({ sessions: result.rows });
  } catch (error: any) {
    console.error('Error retrieving scheduled sessions:', error);
    res.status(500).json({ error: 'Could not fetch live virtual session records.' });
  }
};
