import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// PostgreSQL Connection Pool Configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_DATABASE || 'mentorship_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('PostgreSQL database connected successfully.');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

export default pool;

/**
 * ============================================================================
 * DATABASE SCHEMA MIGRATION SCRIPT (Raw SQL queries for PostgreSQL)
 * Run this in your psql shell or any admin visual tool to initialize:
 * ============================================================================
 * 
 * -- 1. Create Users Table
 * CREATE TABLE IF NOT EXISTS users (
 *   id SERIAL PRIMARY KEY,
 *   name VARCHAR(255) NOT NULL,
 *   email VARCHAR(255) UNIQUE NOT NULL,
 *   password_hash VARCHAR(255) NOT NULL,
 *   role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'mentor', 'admin')),
 *   education JSONB DEFAULT '[]', -- details of study history (school, degree, year, gpa)
 *   skills TEXT[] DEFAULT '{}',
 *   bio TEXT,
 *   fcm_token VARCHAR(255), -- for push notifications
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 * 
 * -- 2. Create Mentorship Requests Table
 * CREATE TABLE IF NOT EXISTS mentorship_requests (
 *   id SERIAL PRIMARY KEY,
 *   student_id INT REFERENCES users(id) ON DELETE CASCADE,
 *   mentor_id INT REFERENCES users(id) ON DELETE CASCADE,
 *   status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
 *   message TEXT,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 * 
 * -- 3. Create Tasks Table (Google Classroom Like Assignment System)
 * CREATE TABLE IF NOT EXISTS tasks (
 *   id SERIAL PRIMARY KEY,
 *   mentor_id INT REFERENCES users(id) ON DELETE CASCADE,
 *   mentee_id INT REFERENCES users(id) ON DELETE CASCADE,
 *   title VARCHAR(255) NOT NULL,
 *   description TEXT,
 *   due_date TIMESTAMP,
 *   status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'submitted', 'reviewed')),
 *   submission_evidence TEXT, -- file URL or descriptive text of submission
 *   grade VARCHAR(50),
 *   feedback TEXT,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 * 
 * -- 4. Create Sessions Table (Zoom or Google Meet schedules)
 * CREATE TABLE IF NOT EXISTS sessions (
 *   id SERIAL PRIMARY KEY,
 *   mentor_id INT REFERENCES users(id) ON DELETE CASCADE,
 *   mentee_id INT REFERENCES users(id) ON DELETE CASCADE,
 *   title VARCHAR(255) NOT NULL,
 *   schedule_time TIMESTAMP NOT NULL,
 *   platform VARCHAR(50) DEFAULT 'zoom' CHECK (platform IN ('zoom', 'meet')),
 *   meeting_link VARCHAR(500),
 *   status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 * 
 * -- 5. Create Messages Table (Direct Messaging)
 * CREATE TABLE IF NOT EXISTS messages (
 *   id SERIAL PRIMARY KEY,
 *   sender_id INT REFERENCES users(id) ON DELETE CASCADE,
 *   receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
 *   content TEXT NOT NULL,
 *   is_read BOOLEAN DEFAULT FALSE,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 * 
 * -- 6. Create Notifications Table (In-app Feed System)
 * CREATE TABLE IF NOT EXISTS notifications (
 *   id SERIAL PRIMARY KEY,
 *   user_id INT REFERENCES users(id) ON DELETE CASCADE,
 *   title VARCHAR(255) NOT NULL,
 *   body TEXT NOT NULL,
 *   type VARCHAR(50) NOT NULL, -- e.g., 'REQUEST_RECEIVED', 'SESSION_SCHEDULED', 'TASK_ASSIGNED', 'MESSAGE_RECEIVED'
 *   is_read BOOLEAN DEFAULT FALSE,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 */
