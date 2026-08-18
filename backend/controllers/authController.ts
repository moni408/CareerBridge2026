import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js'; // Note the explicit extension or import
import { AuthenticatedRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_mentorship_jwt_token_key_bd_2026';

// Register standard users
export const registerUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, email, password, role, education, skills, bio } = req.body;

  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'Please submit all required parameters: name, email, password, and role.' });
    return;
  }

  if (!['student', 'mentor', 'admin'].includes(role)) {
    res.status(400).json({ error: 'Role must be student, mentor, or admin.' });
    return;
  }

  try {
    // Check if user already exists
    const existingCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existingCheck.rows.length > 0) {
      res.status(409).json({ error: 'User is already registered with this email address.' });
      return;
    }

    // Encrypt password using bcryptjs
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save user to PostgreSQL with raw SQL query
    const insertQuery = `
      INSERT INTO users (name, email, password_hash, role, education, skills, bio)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, email, role, created_at
    `;
    const educationJSON = education ? JSON.stringify(education) : '[]';
    const skillsArray = skills ? skills : [];

    const result = await pool.query(insertQuery, [
      name.trim(),
      email.toLowerCase().trim(),
      passwordHash,
      role,
      educationJSON,
      skillsArray,
      bio || ''
    ]);

    const newUser = result.rows[0];

    // Generate authenticated jsonwebtoken
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Account successfully created!',
      token,
      user: newUser
    });
  } catch (error: any) {
    console.error('Error in user signup controller:', error);
    res.status(500).json({ error: 'Internal server error processing user signup registration.' });
  }
};

// Login user
export const loginUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Please enter registered email and password.' });
    return;
  }

  try {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email.toLowerCase().trim()]);

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid login credentials. User not found.' });
      return;
    }

    const matchedUser = result.rows[0];

    // Compare bcrypt pass hash
    const isMatched = await bcrypt.compare(password, matchedUser.password_hash);
    if (!isMatched) {
      res.status(401).json({ error: 'Incorrect password combination. Please try again.' });
      return;
    }

    // Sign jwt token
    const token = jwt.sign(
      { id: matchedUser.id, email: matchedUser.email, role: matchedUser.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      message: 'Logged in successfully!',
      token,
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role,
        skills: matchedUser.skills,
        education: matchedUser.education,
        bio: matchedUser.bio
      }
    });
  } catch (error: any) {
    console.error('Error logging in controller:', error);
    res.status(500).json({ error: 'Internal server error processing authentication login.' });
  }
};

// Get current user profile
export const getCurrentProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized request frame.' });
    return;
  }

  try {
    const query = 'SELECT id, name, email, role, education, skills, bio, created_at FROM users WHERE id = $1';
    const result = await pool.query(query, [req.user.id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    res.status(200).json({ user: result.rows[0] });
  } catch (error: any) {
    console.error('Error in getCurrentProfile controller:', error);
    res.status(500).json({ error: 'Could not fetch user profile details.' });
  }
};

// Update FCM Token for push messaging
export const updateFCMToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized request frame.' });
    return;
  }

  const { fcmToken } = req.body;
  if (!fcmToken) {
    res.status(400).json({ error: 'FCM Token required for notification binding.' });
    return;
  }

  try {
    await pool.query('UPDATE users SET fcm_token = $1, updated_at = NOW() WHERE id = $2', [fcmToken, req.user.id]);
    res.status(200).json({ success: true, message: 'FCM push registration token saved.' });
  } catch (error: any) {
    console.error('Error updating FCM push notification registration:', error);
    res.status(500).json({ error: 'Failed database storage update for FCMToken.' });
  }
};
