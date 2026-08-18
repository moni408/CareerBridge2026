# Graduate Mentorship & Career Platform - Backend Engine

This folder contains the complete, production-ready REST API and Real-Time messaging backend for your university capstone project. 

It is built clean with **Node.js, Express.js, PostgreSQL (raw SQL queries with `pg` pool), Socket.io, JWT authentication, and third-party API integration plans**.

## 🛠️ Tech Stack & Packages Used
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL (using raw sql query client `pg` pool)
- **Real-Time Layer:** Socket.io (WebSocket framework)
- **Hash Cryptography:** Bcryptjs (secure password hashing)
- **Authentication:** Jsonwebtoken (JWT bearer token authorization)

---

## 📁 Directory Architecture
The project adheres strictly to **clean, modular MVC routes structure**:
```text
/backend
  ├── config/
  │   └── db.ts          # PostgreSQL pool connection & schema script
  ├── middleware/
  │   └── auth.ts        # JWT verification guard & role-gating helper
  ├── controllers/
  │   ├── authController.ts         # User SignUp, Login, FCM update
  │   ├── profileController.ts      # View Student Dossiers, list Mentors
  │   ├── mentorshipController.ts   # Connected request pipelines, manage mentees
  │   ├── taskController.ts         # Classroom like assignment systems
  │   ├── sessionController.ts      # Zoom/Meet virtual schedule integrations
  │   ├── messageController.ts      # Peer-to-peer chat, persistent database logging
  │   └── notificationController.ts  # Retreive in-app notifications feeds
  ├── routes/
  │   ├── authRoutes.ts
  │   ├── profileRoutes.ts
  │   ├── mentorshipRoutes.ts
  │   ├── taskRoutes.ts
  │   ├── sessionRoutes.ts
  │   ├── messageRoutes.ts
  │   └── notificationRoutes.ts
  ├── services/
  │   ├── fcmService.ts       # Firebase Push notification dispatcher
  │   ├── zoomMeetService.ts  # Dynamic web integrations for Zoom/Google Meet links
  │   └── socketService.ts    # Socket.io authentication & event routing engine
  ├── server.ts               # Main Express + Socket HTTP entry point
  └── README.md               # Setup Guide (this file)
```

---

## 🚀 Setting Up the Database
Before booting the server, you need to create the table structure in PostgreSQL. 

Open your shell or admin graphical client (pgAdmin) and execute the SQL contained inside `/backend/config/db.ts` or paste this directly:

```sql
-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'mentor', 'admin')),
  education JSONB DEFAULT '[]',
  skills TEXT[] DEFAULT '{}',
  bio TEXT,
  fcm_token VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Mentorship Requests Table
CREATE TABLE IF NOT EXISTS mentorship_requests (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES users(id) ON DELETE CASCADE,
  mentor_id INT REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tasks Table (Google Classroom)
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  mentor_id INT REFERENCES users(id) ON DELETE CASCADE,
  mentee_id INT REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'submitted', 'reviewed')),
  submission_evidence TEXT,
  grade VARCHAR(50),
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Sessions Table (Zoom or Meet)
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  mentor_id INT REFERENCES users(id) ON DELETE CASCADE,
  mentee_id INT REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  schedule_time TIMESTAMP NOT NULL,
  platform VARCHAR(50) DEFAULT 'zoom' CHECK (platform IN ('zoom', 'meet')),
  meeting_link VARCHAR(500),
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Message Thread logs
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INT REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Notifications Feed table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## ⚙️ Environment Variables (`.env`)
Create a `.env` in your workspace with these key-value configurations filled:

```env
PORT=5000
JWT_SECRET=super_secret_capstone_project_jwt_key_dhaka_bangladesh
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=mentorship_db
DB_USER=postgres
DB_PASSWORD=postgres

# --- Push Messaging (Google Firebase Cloud Messaging)
FCM_SERVER_KEY=your_firebase_fcm_legacy_server_key

# --- Third-Party Zoom API Credentials
ZOOM_CLIENT_ID=your_zoom_oauth_client_id
ZOOM_CLIENT_SECRET=your_zoom_oauth_client_secret
ZOOM_ACCOUNT_ID=your_zoom_account_id

# --- Third-Party Google Calendar Access Token
GOOGLE_CALENDAR_ACCESS_TOKEN=your_google_oauth_access_token
```

---

## 👨‍💻 API Endpoints Specification

### 🔑 1. Authentication (`/api/auth`)
- `POST /register`: Registers an account. Body: `{ name, email, password, role, education, skills, bio }`.
- `POST /login`: Log in and receive JWT token. Body: `{ email, password }`.
- `GET /me`: Get current authenticated profile. Header: `Authorization: Bearer <jwt>`.
- `POST /fcm-token`: Register student/mentor device token for pushes. Body: `{ fcmToken }`.

### 👥 2. Profiles (`/api/profiles`)
- `GET /student/:id`: Retrieves detailed clinical dossier. (Mentor only).
- `GET /mentors`: Browses available active mentors profiles. (Student only).

### 🤝 3. Connection Requests (`/api/mentorship`)
- `POST /request`: Student applies to a mentor. Body: `{ mentorId, message }`.
- `POST /request/:requestId/review`: Mentor accepts/rejects. Body: `{ status }` (accepted/rejected).
- `GET /mentees`: Mentor views all active, accepted students.
- `GET /my-mentor`: Student checks their connected mentor details.

### 📝 4. Assigned Task Classroom (`/api/tasks`)
- `GET /`: Lists all task rows matching requester user session.
- `POST /assign`: Mentor schedules a new project or work unit. Body: `{ menteeId, title, description, dueDate }`.
- `POST/:taskId/submit`: Student submits evidence URL/text wrapper. Body: `{ submissionEvidence }`.
- `POST/:taskId/grade`: Mentor reviews submissions. Body: `{ grade, feedback }`.

### 📅 5. Web Conference Sessions (`/api/sessions`)
- `GET /`: Lists calendar scheduled events.
- `POST /schedule`: Mentor schedules a live meet. Body: `{ menteeId, title, scheduleTime, platform }` (zoom/meet).

### 💬 6. Instant Messaging Chat Log (`/api/messages`)
- `POST /send`: Posts message to connected peer. Body: `{ receiverId, content }`.
- `GET /history/:peerId`: Retrieves chronological database messaging logs with chosen peer ID.

---

## ⚡ Socket.io Real-Time Integrations

### Client Setup Connection
Clients should open a socket connection and immediately authenticate by emitting `'authenticate'`:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

// Login link:
socket.emit('authenticate', loggedInUser.id);
```

### Supported Inbound Socket.io Events:
- **`message_received`**: Emitted when a connected peer sends a chat message. Payload:
  ```json
  {
    "message": { "id": 4, "sender_id": 1, "receiver_id": 2, "content": "Hello World", "created_at": "..." },
    "senderName": "Rahim Chowdhury"
  }
  ```
- **`notification_received`**: Emitted in raw real-time when the student or mentor receives dynamic actions (e.g. Session Scheduled, Task Assigned, Request Accepted/Submitted). Payload:
  ```json
  {
    "id": 99,
    "title": "New Task Assigned 📝",
    "body": "Priya Das assigned you a task...",
    "type": "TASK_ASSIGNED",
    "is_read": false,
    "created_at": "..."
  }
  ```
