import { Response } from 'express';
import pool from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { sendRealTimeNotification } from '../services/socketService.js';
import { sendPushNotification } from '../services/fcmService.js';

// Trigger notification helper
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
    console.error('Task notification trigger failed:', err);
  }
};

// 1. Mentor assigns task to accepted mentee student
export const assignTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const mentorId = req.user?.id;
  const { menteeId, title, description, dueDate } = req.body;

  if (!mentorId || req.user?.role !== 'mentor') {
    res.status(403).json({ error: 'Forbidden. Only mentors are authorised to initiate tasks.' });
    return;
  }

  if (!menteeId || !title || !description) {
    res.status(400).json({ error: 'Please submit mandatory fields: menteeId, title, and description.' });
    return;
  }

  try {
    // Audit that student is indeed an accepted mentee of this mentor
    const connectionAudit = `
      SELECT id FROM mentorship_requests 
      WHERE student_id = $1 AND mentor_id = $2 AND status = 'accepted'
    `;
    const connectionRes = await pool.query(connectionAudit, [menteeId, mentorId]);
    if (connectionRes.rows.length === 0) {
      res.status(403).json({ error: 'Core match failure. Selected student is not an accepted mentee in your workspace.' });
      return;
    }

    // Insert task using raw query
    const insertQuery = `
      INSERT INTO tasks (mentor_id, mentee_id, title, description, due_date, status)
      VALUES ($1, $2, $3, $4, $5, 'assigned')
      RETURNING id, title, description, due_date, status, created_at
    `;
    const taskResult = await pool.query(insertQuery, [
      mentorId,
      menteeId,
      title.trim(),
      description.trim(),
      dueDate ? new Date(dueDate) : null
    ]);

    const createdTask = taskResult.rows[0];

    // Notify the Student/Mentee (FCM + Socket + In-app Feed)
    const mentorInfo = await pool.query('SELECT name FROM users WHERE id = $1', [mentorId]);
    const mentorName = mentorInfo.rows[0]?.name || 'Your Mentor';

    await notifyUser(
      menteeId,
      'New Task Assigned 📝',
      `${mentorName} assigned you a task: "${title}". Be sure to submit on time.`,
      'TASK_ASSIGNED'
    );

    res.status(201).json({
      message: 'Task assigned successfully.',
      task: createdTask
    });
  } catch (error: any) {
    console.error('Error assigning task controller:', error);
    res.status(500).json({ error: 'Internal server error processing task assignment.' });
  }
};

// 2. Mentee submits task evidence (link/text summary)
export const submitTaskEvidence = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = req.user?.id;
  const taskId = parseInt(req.params.taskId);
  const { submissionEvidence } = req.body;

  if (!studentId || req.user?.role !== 'student') {
    res.status(403).json({ error: 'Access restricted. Only assigned graduate students can submit tasks.' });
    return;
  }

  if (isNaN(taskId)) {
    res.status(400).json({ error: 'Invalid Task ID parameter.' });
    return;
  }

  if (!submissionEvidence) {
    res.status(400).json({ error: 'Please submit submission evidence, such as a portfolio URL, repository repository, or text review.' });
    return;
  }

  try {
    // Verify task exists and is assigned to this student
    const checkTaskQuery = 'SELECT id, title, mentor_id, status FROM tasks WHERE id = $1 AND mentee_id = $2';
    const checkRes = await pool.query(checkTaskQuery, [taskId, studentId]);

    if (checkRes.rows.length === 0) {
      res.status(404).json({ error: 'The specified assigned task could not be traced.' });
      return;
    }

    const taskObj = checkRes.rows[0];

    // Update submission record
    const updateQuery = `
      UPDATE tasks 
      SET submission_evidence = $1, status = 'submitted', updated_at = NOW()
      WHERE id = $2
      RETURNING id, title, status, updated_at
    `;
    const updateRes = await pool.query(updateQuery, [submissionEvidence.trim(), taskId]);

    // Notify Mentor (In-app feed + push)
    const studentInfo = await pool.query('SELECT name FROM users WHERE id = $1', [studentId]);
    const studentName = studentInfo.rows[0]?.name || 'Your Mentee';

    await notifyUser(
      taskObj.mentor_id,
      'Task Evidence Submitted 📤',
      `${studentName} has submitted evidence for task: "${taskObj.title}".`,
      'TASK_SUBMITTED'
    );

    res.status(200).json({
      message: 'Task evidence successfully submitted!',
      task: updateRes.rows[0]
    });
  } catch (error: any) {
    console.error('Error submitting task evidence:', error);
    res.status(500).json({ error: 'Failed db save transaction processing task submission.' });
  }
};

// 3. Mentor reviews, grades, and leaves feedback on a submitted task
export const reviewAndGradeTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const mentorId = req.user?.id;
  const taskId = parseInt(req.params.taskId);
  const { grade, feedback } = req.body;

  if (!mentorId || req.user?.role !== 'mentor') {
    res.status(403).json({ error: 'Forbidden. Only mentors are authorised to grade assignments.' });
    return;
  }

  if (isNaN(taskId)) {
    res.status(400).json({ error: 'Invalid Task ID parameter.' });
    return;
  }

  if (!grade) {
    res.status(400).json({ error: 'Please submit a grade score or indicator.' });
    return;
  }

  try {
    // Assert task belongs to this mentor
    const checkTask = 'SELECT id, title, mentee_id, status FROM tasks WHERE id = $1 AND mentor_id = $2';
    const checkRes = await pool.query(checkTask, [taskId, mentorId]);

    if (checkRes.rows.length === 0) {
      res.status(404).json({ error: 'Task not found or unauthorised to review.' });
      return;
    }

    const taskObj = checkRes.rows[0];

    if (taskObj.status !== 'submitted') {
      res.status(400).json({ error: `Cannot grade/review task that is currently in "${taskObj.status}" state. Student has not submitted yet.` });
      return;
    }

    // Update DB row
    const updateQuery = `
      UPDATE tasks
      SET grade = $1, feedback = $2, status = 'reviewed', updated_at = NOW()
      WHERE id = $3
      RETURNING id, title, grade, feedback, status, updated_at
    `;
    const result = await pool.query(updateQuery, [grade.trim(), feedback || '', taskId]);

    // Notify candidate student
    await notifyUser(
      taskObj.mentee_id,
      'Task Reviewed & Graded 🎓',
      `Your submission for "${taskObj.title}" has been graded: "${grade}".`,
      'TASK_REVIEWED'
    );

    res.status(200).json({
      message: 'Task reviewed and graded successfully.',
      task: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error reviewing task:', error);
    res.status(500).json({ error: 'Database transaction error updating task grade records.' });
  }
};

// 4. Retrieve list of tasks relevant to authenticated session
export const getMyTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      // Mentor views tasks they assigned
      query = `
        SELECT t.*, u.name as mentee_name, u.email as mentee_email
        FROM tasks t
        JOIN users u ON u.id = t.mentee_id
        WHERE t.mentor_id = $1
        ORDER BY t.created_at DESC
      `;
      params = [userId];
    } else {
      // Student views tasks assigned to them
      query = `
        SELECT t.*, u.name as mentor_name, u.email as mentor_email
        FROM tasks t
        JOIN users u ON u.id = t.mentor_id
        WHERE t.mentee_id = $1
        ORDER BY t.created_at DESC
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);
    res.status(200).json({ tasks: result.rows });
  } catch (error: any) {
    console.error('Error retrieving task matrix:', error);
    res.status(500).json({ error: 'Failed DB retrieval of core tasks array.' });
  }
};
