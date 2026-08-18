import { Response } from 'express';
import pool from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { sendRealTimeNotification } from '../services/socketService.js';
import { sendPushNotification } from '../services/fcmService.js';

// Helper to log in-app notification & send push notifications + real-time alerts
const triggerNotificationPipeline = async (userId: number, title: string, body: string, type: string) => {
  try {
    // 1. Save in-app notification to Postgres
    const insertNotifQuery = `
      INSERT INTO notifications (user_id, title, body, type, is_read) 
      VALUES ($1, $2, $3, $4, FALSE)
      RETURNING id, created_at
    `;
    const notificationResult = await pool.query(insertNotifQuery, [userId, title, body, type]);
    const savedNotification = notificationResult.rows[0];

    // 2. Emit Real-time alert over SocketIO
    sendRealTimeNotification(userId, 'notification_received', {
      id: savedNotification.id,
      title,
      body,
      type,
      is_read: false,
      created_at: savedNotification.created_at
    });

    // 3. Dispatch Push Notification via FCM
    await sendPushNotification(userId, title, body, { type });
  } catch (err) {
    console.error('Error triggering notification pipeline:', err);
  }
};

// 1. Student sends a mentorship request to a mentor
export const sendMentorshipRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user?.id;
  const { mentorId, message } = req.body;

  if (!studentId) {
    res.status(401).json({ error: 'Unauthorized request credentials.' });
    return;
  }

  if (!mentorId) {
    res.status(400).json({ error: 'Please specify the mentorId.' });
    return;
  }

  try {
    // Check if mentor is a real registered mentor
    const checkMentor = await pool.query('SELECT name FROM users WHERE id = $1 AND role = $2', [mentorId, 'mentor']);
    if (checkMentor.rows.length === 0) {
      res.status(404).json({ error: 'The specified Mentor account does not exist.' });
      return;
    }

    const mentorName = checkMentor.rows[0].name;

    // Check if a request already exists between them
    const existingCheck = await pool.query(
      'SELECT id, status FROM mentorship_requests WHERE student_id = $1 AND mentor_id = $2',
      [studentId, mentorId]
    );

    if (existingCheck.rows.length > 0) {
      res.status(409).json({ 
        error: `A mentorship request already exists with status: ${existingCheck.rows[0].status}.` 
      });
      return;
    }

    // Insert request record
    const insertRequest = `
      INSERT INTO mentorship_requests (student_id, mentor_id, status, message)
      VALUES ($1, $2, 'pending', $3)
      RETURNING id, status, created_at
    `;
    const result = await pool.query(insertRequest, [studentId, mentorId, message || '']);
    const requestRecord = result.rows[0];

    // Fetch student's profile name
    const studentInfo = await pool.query('SELECT name FROM users WHERE id = $1', [studentId]);
    const studentName = studentInfo.rows[0]?.name || 'A Graduate Student';

    // Trigger notification pipeline to notify Mentor
    await triggerNotificationPipeline(
      mentorId,
      'New Mentorship Request Received',
      `${studentName} has sent you a request for mentorship advice.`,
      'REQUEST_RECEIVED'
    );

    res.status(201).json({
      message: 'Mentorship request sent successfully.',
      request: requestRecord
    });
  } catch (error: any) {
    console.error('Error in sendMentorshipRequest controller:', error);
    res.status(500).json({ error: 'Internal server error processing request submission.' });
  }
};

// 2. Mentor accepts or rejects request
export const reviewMentorshipRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const mentorId = req.user?.id;
  const requestId = parseInt(req.params.requestId);
  const { status } = req.body; // 'accepted' or 'rejected'

  if (!mentorId) {
    res.status(401).json({ error: 'Invalid user session.' });
    return;
  }

  if (isNaN(requestId)) {
    res.status(400).json({ error: 'Invalid request ID parameter.' });
    return;
  }

  if (!['accepted', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'Status must be updated to either "accepted" or "rejected".' });
    return;
  }

  try {
    // Assert the request belongs to this mentor and is currently pending
    const findRequest = `
      SELECT r.id, r.student_id, r.status, u.name as mentor_name 
      FROM mentorship_requests r
      JOIN users u ON u.id = r.mentor_id
      WHERE r.id = $1 AND r.mentor_id = $2
    `;
    const checkResult = await pool.query(findRequest, [requestId, mentorId]);

    if (checkResult.rows.length === 0) {
      res.status(404).json({ error: 'Pending mentorship request not found or unauthorized access attempt.' });
      return;
    }

    const requestObj = checkResult.rows[0];

    // Check if progress is already updated
    if (requestObj.status !== 'pending') {
      res.status(400).json({ error: `Mentorship request already has status configured: ${requestObj.status}` });
      return;
    }

    // Update DB
    const updateQuery = `
      UPDATE mentorship_requests 
      SET status = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING id, status, updated_at
    `;
    const updatedResult = await pool.query(updateQuery, [status, requestId]);

    // Send notifications to the student
    const alertTitle = status === 'accepted' ? 'Mentorship Request Accepted! 🎉' : 'Mentorship Request Status Update';
    const alertBody = status === 'accepted'
      ? `${requestObj.mentor_name} accepted your mentorship request. You can now access core tasks and schedule live virtual session panels.`
      : `${requestObj.mentor_name} declined your mentorship request. Feel free to connect with other qualified mentors on the directory.`;

    await triggerNotificationPipeline(
      requestObj.student_id,
      alertTitle,
      alertBody,
      status === 'accepted' ? 'REQUEST_ACCEPTED' : 'REQUEST_REJECTED'
    );

    res.status(200).json({
      message: `Request successfully ${status}.`,
      request: updatedResult.rows[0]
    });
  } catch (error: any) {
    console.error('Error reviewing mentorship request:', error);
    res.status(500).json({ error: 'Failed database update session on request evaluation.' });
  }
};

// 3. Mentor lists their accepted active mentees (students)
export const getMyMentees = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const mentorId = req.user?.id;

  if (!mentorId) {
    res.status(401).json({ error: 'Unauthorized request credentials.' });
    return;
  }

  try {
    const listQuery = `
      SELECT u.id, u.name, u.email, u.skills, u.education, u.bio, r.id as request_id, r.created_at as connection_date
      FROM mentorship_requests r
      JOIN users u ON u.id = r.student_id
      WHERE r.mentor_id = $1 AND r.status = 'accepted'
      ORDER BY u.name ASC
    `;
    const result = await pool.query(listQuery, [mentorId]);
    res.status(200).json({ mentees: result.rows });
  } catch (error: any) {
    console.error('Error listing mentees:', error);
    res.status(500).json({ error: 'Could not fetch active mentees list.' });
  }
};

// 4. Student gets their active matching mentor
export const getMyMentor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user?.id;

  if (!studentId) {
    res.status(401).json({ error: 'Unauthorized request credentials.' });
    return;
  }

  try {
    const query = `
      SELECT u.id, u.name, u.email, u.skills, u.bio
      FROM mentorship_requests r
      JOIN users u ON u.id = r.mentor_id
      WHERE r.student_id = $1 AND r.status = 'accepted'
      LIMIT 1
    `;
    const result = await pool.query(query, [studentId]);
    
    if (result.rows.length === 0) {
      res.status(200).json({ mentor: null, message: 'You do not have an active accepted mentor connection.' });
      return;
    }

    res.status(200).json({ mentor: result.rows[0] });
  } catch (error: any) {
    console.error('Error in student retrieving their mentor:', error);
    res.status(500).json({ error: 'Failed query retrieval for active matching mentor.' });
  }
};
