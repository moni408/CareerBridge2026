import { Response } from 'express';
import pool from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// Controller allowing mentors to view a student's full profile (including skill details, study records)
export const getStudentProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const studentId = parseInt(req.params.id);

  if (isNaN(studentId)) {
    res.status(400).json({ error: 'Invalid Student ID provided.' });
    return;
  }

  try {
    // Optional check: Ensure the requesting user is a mentor or admin, OR the student viewing their own profile
    if (req.user?.role !== 'mentor' && req.user?.role !== 'admin' && req.user?.id !== studentId) {
      res.status(403).json({ error: 'Access denied. Only certified Mentors or Admins can access complete student dossiers.' });
      return;
    }

    // Query student database
    const query = `
      SELECT id, name, email, role, education, skills, bio, created_at 
      FROM users 
      WHERE id = $1 AND role = 'student'
    `;
    const result = await pool.query(query, [studentId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Active candidate student profile could not be found.' });
      return;
    }

    const studentProfile = result.rows[0];
    res.status(200).json({ student: studentProfile });
  } catch (error: any) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({ error: 'Failed DB retrieval for the requested candidate dossier.' });
  }
};

// Retrieve a directory of available mentors so students can discover and apply for matching roles
export const browseMentors = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT id, name, email, role, skills, bio 
      FROM users 
      WHERE role = 'mentor' 
      ORDER BY name ASC
    `;
    const result = await pool.query(query);
    res.status(200).json({ mentors: result.rows });
  } catch (error: any) {
    console.error('Error browsing mentors:', error);
    res.status(500).json({ error: 'Failed retrieving active mentors lookup database.' });
  }
};
