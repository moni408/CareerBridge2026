-- PostgreSQL Database Schema for Graduate Mentorship and Career Platform

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('graduate', 'mentor', 'industry', 'admin')),
  profile_photo_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- 2. Mentor Profiles Table
CREATE TABLE IF NOT EXISTS mentor_profiles (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  expertise_tags TEXT[] DEFAULT '{}'::TEXT[],
  years_of_experience INT NOT NULL DEFAULT 0 CHECK (years_of_experience >= 0),
  current_position VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  linkedin_url VARCHAR(500),
  is_available BOOLEAN DEFAULT true NOT NULL,
  max_mentees INT DEFAULT 5 NOT NULL CHECK (max_mentees >= 0),
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- 3. Graduate Profiles Table
CREATE TABLE IF NOT EXISTS graduate_profiles (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  university VARCHAR(255) NOT NULL,
  graduation_year INT NOT NULL,
  professional_score INT DEFAULT 0 NOT NULL CHECK (professional_score >= 0),
  cv_url VARCHAR(500),
  portfolio_url VARCHAR(500),
  skills TEXT[] DEFAULT '{}'::TEXT[],
  certifications TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- 4. Mentorship Requests Table
CREATE TABLE IF NOT EXISTS mentorship_requests (
  id SERIAL PRIMARY KEY,
  graduate_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status VARCHAR(50) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  requested_at TIMESTAMP DEFAULT now() NOT NULL,
  responded_at TIMESTAMP
);

-- 5. Mentorship Sessions Active Table
CREATE TABLE IF NOT EXISTS mentorship_sessions_active (
  id SERIAL PRIMARY KEY,
  graduate_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
  started_at TIMESTAMP DEFAULT now() NOT NULL,
  completed_at TIMESTAMP
);

-- 6. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES mentorship_sessions_active(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'assigned' NOT NULL CHECK (status IN ('assigned', 'submitted', 'approved', 'rejected', 'revision_requested')),
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- 7. Task Submissions Table
CREATE TABLE IF NOT EXISTS task_submissions (
  id SERIAL PRIMARY KEY,
  task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  submitted_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_url VARCHAR(500),
  submission_note TEXT,
  submitted_at TIMESTAMP DEFAULT now() NOT NULL,
  mentor_feedback TEXT,
  reviewed_at TIMESTAMP,
  review_status VARCHAR(50) CHECK (review_status IN ('approved', 'rejected', 'revision_requested'))
);

-- 8. Sessions (Live Sessions Event Table)
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  mentor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  meeting_platform VARCHAR(50) NOT NULL CHECK (meeting_platform IN ('zoom', 'google_meet')),
  meeting_link VARCHAR(500),
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INT DEFAULT 60 NOT NULL CHECK (duration_minutes > 0),
  status VARCHAR(50) DEFAULT 'scheduled' NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- 9. Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id INT REFERENCES mentorship_sessions_active(id) ON DELETE SET NULL,
  content TEXT,
  attachment_url VARCHAR(500),
  is_read BOOLEAN DEFAULT false NOT NULL,
  sent_at TIMESTAMP DEFAULT now() NOT NULL
);

-- 10. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  reference_id INT,
  reference_type VARCHAR(100),
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- ============================================================================
-- 5 HIGH RESOLUTION PERFORMANCE OPTIMIZING INDEXES
-- ============================================================================

-- 1. Index to optimize chat history queries between mentor and mentee
CREATE INDEX idx_messages_conversation_thread 
ON messages (sender_id, receiver_id, sent_at DESC);

-- 2. Partial Index for ultra-fast lookup of pending unread user notification feeds
CREATE INDEX idx_notifications_user_unread 
ON notifications (user_id, created_at DESC) 
WHERE is_read = false;

-- 3. Composite Index to quickly query active mentorship sessions by status
CREATE INDEX idx_active_mentorship_sessions 
ON mentorship_sessions_active (graduate_id, mentor_id, status);

-- 4. Covered Index for query scheduling lookups on live calendar events
CREATE INDEX idx_sessions_scheduling 
ON sessions (mentor_id, mentee_id, scheduled_at, status);

-- 5. Index for managing mentorship pending/accepted applications filtered by roles
CREATE INDEX idx_mentorship_requests_status 
ON mentorship_requests (graduate_id, mentor_id, status);
