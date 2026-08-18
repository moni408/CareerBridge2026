import React, { useState } from 'react';
import { 
  Database, Terminal, Cpu, Play, CheckCircle, HelpCircle, 
  Code, Activity, Globe, Send, RefreshCw, Key, Shield, Info,
  ExternalLink, Layers, ArrowRight, AlertTriangle, Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Tables definition based direct on the /backend/schema.sql
const POSTGRES_TABLES = [
  {
    name: 'users',
    desc: 'Core user credentials and role-based assignments.',
    columns: [
      { name: 'id', type: 'SERIAL (PK)', nullable: 'NOT NULL', default: 'Next value' },
      { name: 'name', type: 'VARCHAR(255)', nullable: 'NOT NULL', default: 'None' },
      { name: 'email', type: 'VARCHAR(255)', nullable: 'NOT NULL UNIQUE', default: 'None' },
      { name: 'password_hash', type: 'VARCHAR(255)', nullable: 'NOT NULL', default: 'None' },
      { name: 'role', type: 'VARCHAR(50)', nullable: 'NOT NULL CHECK', default: "Constraint: 'graduate'|'mentor'|'industry'|'admin'" },
      { name: 'profile_photo_url', type: 'VARCHAR(500)', nullable: 'NULL', default: 'NULL' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: 'NOT NULL', default: 'CURRENT_TIMESTAMP' }
    ]
  },
  {
    name: 'mentor_profiles',
    desc: 'Professional details and matching quotas for the active mentors.',
    columns: [
      { name: 'id', type: 'SERIAL (PK)', nullable: 'NOT NULL', default: 'Next value' },
      { name: 'user_id', type: 'INT (FK)', nullable: 'NOT NULL UNIQUE', default: 'REFERENCES users(id) ON DELETE CASCADE' },
      { name: 'bio', type: 'TEXT', nullable: 'NULL', default: 'NULL' },
      { name: 'expertise_tags', type: 'TEXT[]', nullable: 'NULL', default: "'{}'::TEXT[]" },
      { name: 'years_of_experience', type: 'INT', nullable: 'NOT NULL DEFAULT 0', default: 'CHECK (years_of_experience >= 0)' },
      { name: 'current_position', type: 'VARCHAR(255)', nullable: 'NOT NULL', default: 'None' },
      { name: 'company', type: 'VARCHAR(255)', nullable: 'NOT NULL', default: 'None' },
      { name: 'linkedin_url', type: 'VARCHAR(500)', nullable: 'NULL', default: 'NULL' },
      { name: 'is_available', type: 'BOOLEAN', nullable: 'NOT NULL DEFAULT true', default: 'true' },
      { name: 'max_mentees', type: 'INT', nullable: 'NOT NULL DEFAULT 5', default: 'CHECK (max_mentees >= 0)' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: 'NOT NULL', default: 'CURRENT_TIMESTAMP' }
    ]
  },
  {
    name: 'graduate_profiles',
    desc: 'Educational details, credentials, and cumulative professional readiness rating.',
    columns: [
      { name: 'id', type: 'SERIAL (PK)', nullable: 'NOT NULL', default: 'Next value' },
      { name: 'user_id', type: 'INT (FK)', nullable: 'NOT NULL UNIQUE', default: 'REFERENCES users(id) ON DELETE CASCADE' },
      { name: 'university', type: 'VARCHAR(255)', nullable: 'NOT NULL', default: 'None' },
      { name: 'graduation_year', type: 'INT', nullable: 'NOT NULL', default: 'None' },
      { name: 'professional_score', type: 'INT', nullable: 'NOT NULL DEFAULT 0', default: 'CHECK (professional_score >= 0)' },
      { name: 'cv_url', type: 'VARCHAR(500)', nullable: 'NULL', default: 'NULL' },
      { name: 'portfolio_url', type: 'VARCHAR(500)', nullable: 'NULL', default: 'NULL' },
      { name: 'skills', type: 'TEXT[]', nullable: 'NULL', default: "'{}'::TEXT[]" },
      { name: 'certifications', type: 'TEXT[]', nullable: 'NULL', default: "'{}'::TEXT[]" },
      { name: 'created_at', type: 'TIMESTAMP', nullable: 'NOT NULL', default: 'CURRENT_TIMESTAMP' }
    ]
  },
  {
    name: 'mentorship_requests',
    desc: 'Tracks applications dispatched by graduate students to mentors.',
    columns: [
      { name: 'id', type: 'SERIAL (PK)', nullable: 'NOT NULL', default: 'Next value' },
      { name: 'graduate_id', type: 'INT (FK)', nullable: 'NOT NULL', default: 'REFERENCES users(id) ON DELETE CASCADE' },
      { name: 'mentor_id', type: 'INT (FK)', nullable: 'NOT NULL', default: 'REFERENCES users(id) ON DELETE CASCADE' },
      { name: 'message', type: 'TEXT', nullable: 'NULL', default: 'NULL' },
      { name: 'status', type: 'VARCHAR(50)', nullable: 'NOT NULL DEFAULT pending', default: "CHECK IN ('pending', 'accepted', 'rejected')" },
      { name: 'requested_at', type: 'TIMESTAMP', nullable: 'NOT NULL', default: 'CURRENT_TIMESTAMP' },
      { name: 'responded_at', type: 'TIMESTAMP', nullable: 'NULL', default: 'NULL' }
    ]
  },
  {
    name: 'mentorship_sessions_active',
    desc: 'Core links forming co-signed connection workspaces.',
    columns: [
      { name: 'id', type: 'SERIAL (PK)', nullable: 'NOT NULL', default: 'Next value' },
      { name: 'graduate_id', type: 'INT (FK)', nullable: 'NOT NULL', default: 'REFERENCES users(id) ON DELETE CASCADE' },
      { name: 'mentor_id', type: 'INT (FK)', nullable: 'NOT NULL', default: 'REFERENCES users(id) ON DELETE CASCADE' },
      { name: 'status', type: 'VARCHAR(50)', nullable: 'NOT NULL DEFAULT active', default: "CHECK IN ('active', 'completed', 'cancelled')" },
      { name: 'started_at', type: 'TIMESTAMP', nullable: 'NOT NULL', default: 'CURRENT_TIMESTAMP' },
      { name: 'completed_at', type: 'TIMESTAMP', nullable: 'NULL', default: 'NULL' }
    ]
  },
  {
    name: 'tasks',
    desc: 'Action items assigned to mentees to close identified tech gaps.',
    columns: [
      { name: 'id', type: 'SERIAL (PK)', nullable: 'NOT NULL', default: 'Next value' },
      { name: 'session_id', type: 'INT (FK)', nullable: 'NOT NULL', default: 'REFERENCES mentorship_sessions_active(id) ON DELETE CASCADE' },
      { name: 'title', type: 'VARCHAR(255)', nullable: 'NOT NULL', default: 'None' },
      { name: 'description', type: 'TEXT', nullable: 'NULL', default: 'NULL' },
      { name: 'due_date', type: 'TIMESTAMP', nullable: 'NULL', default: 'NULL' },
      { name: 'status', type: 'VARCHAR(50)', nullable: 'NOT NULL DEFAULT assigned', default: "CHECK IN ('assigned', 'submitted', 'approved', 'rejected', 'revision_requested')" },
      { name: 'created_at', type: 'TIMESTAMP', nullable: 'NOT NULL', default: 'CURRENT_TIMESTAMP' }
    ]
  },
  {
    name: 'task_submissions',
    desc: 'Contains graduate submissions with file proof, score, and feedback logs.',
    columns: [
      { name: 'id', type: 'SERIAL (PK)', nullable: 'NOT NULL', default: 'Next value' },
      { name: 'task_id', type: 'INT (FK)', nullable: 'NOT NULL', default: 'REFERENCES tasks(id) ON DELETE CASCADE' },
      { name: 'submitted_by', type: 'INT (FK)', nullable: 'NOT NULL', default: 'REFERENCES users(id) ON DELETE CASCADE' },
      { name: 'submission_url', type: 'VARCHAR(500)', nullable: 'NULL', default: 'NULL' },
      { name: 'submission_note', type: 'TEXT', nullable: 'NULL', default: 'NULL' },
      { name: 'submitted_at', type: 'TIMESTAMP', nullable: 'NOT NULL', default: 'CURRENT_TIMESTAMP' },
      { name: 'mentor_feedback', type: 'TEXT', nullable: 'NULL', default: 'NULL' },
      { name: 'reviewed_at', type: 'TIMESTAMP', nullable: 'NULL', default: 'NULL' },
      { name: 'review_status', type: 'VARCHAR(50)', nullable: 'NULL', default: "CHECK IN ('approved', 'rejected', 'revision_requested')" }
    ]
  },
  {
    name: 'sessions',
    desc: 'Scheduled Zoom or Google Meet meetings with automatic calendar entries.',
    columns: [
      { name: 'id', type: 'SERIAL (PK)', nullable: 'NOT NULL', default: 'Next value' },
      { name: 'mentor_id', type: 'INT (FK)', nullable: 'NOT NULL', default: 'REFERENCES users(id) ON DELETE CASCADE' },
      { name: 'mentee_id', type: 'INT (FK)', nullable: 'NOT NULL', default: 'REFERENCES users(id) ON DELETE CASCADE' },
      { name: 'title', type: 'VARCHAR(255)', nullable: 'NOT NULL', default: 'None' },
      { name: 'description', type: 'TEXT', nullable: 'NULL', default: 'NULL' },
      { name: 'meeting_platform', type: 'VARCHAR(50)', nullable: 'NOT NULL', default: "CHECK IN ('zoom', 'google_meet')" },
      { name: 'meeting_link', type: 'VARCHAR(500)', nullable: 'NULL', default: 'NULL' },
      { name: 'scheduled_at', type: 'TIMESTAMP', nullable: 'NOT NULL', default: 'None' },
      { name: 'duration_minutes', type: 'INT', nullable: 'NOT NULL DEFAULT 60', default: 'CHECK (duration_minutes > 0)' },
      { name: 'status', type: 'VARCHAR(50)', nullable: 'NOT NULL DEFAULT scheduled', default: "CHECK IN ('scheduled', 'completed', 'cancelled')" },
      { name: 'created_at', type: 'TIMESTAMP', nullable: 'NOT NULL', default: 'CURRENT_TIMESTAMP' }
    ]
  },
  {
    name: 'messages',
    desc: 'Binary/encrypted message transactions with attachments.',
    columns: [
      { name: 'id', type: 'SERIAL (PK)', nullable: 'NOT NULL', default: 'Next value' },
      { name: 'sender_id', type: 'INT (FK)', nullable: 'NOT NULL', default: 'REFERENCES users(id) ON DELETE CASCADE' },
      { name: 'receiver_id', type: 'INT (FK)', nullable: 'NOT NULL', default: 'REFERENCES users(id) ON DELETE CASCADE' },
      { name: 'session_id', type: 'INT (FK)', nullable: 'NULL', default: 'REFERENCES mentorship_sessions_active(id) ON DELETE SET NULL' },
      { name: 'content', type: 'TEXT', nullable: 'NULL', default: 'NULL' },
      { name: 'attachment_url', type: 'VARCHAR(500)', nullable: 'NULL', default: 'NULL' },
      { name: 'is_read', type: 'BOOLEAN', nullable: 'NOT NULL DEFAULT false', default: 'false' },
      { name: 'sent_at', type: 'TIMESTAMP', nullable: 'NOT NULL', default: 'CURRENT_TIMESTAMP' }
    ]
  },
  {
    name: 'notifications',
    desc: 'Immediate push notification tracking feeds.',
    columns: [
      { name: 'id', type: 'SERIAL (PK)', nullable: 'NOT NULL', default: 'Next value' },
      { name: 'user_id', type: 'INT (FK)', nullable: 'NOT NULL', default: 'REFERENCES users(id) ON DELETE CASCADE' },
      { name: 'type', type: 'VARCHAR(100)', nullable: 'NOT NULL', default: 'None' },
      { name: 'title', type: 'VARCHAR(255)', nullable: 'NOT NULL', default: 'None' },
      { name: 'body', type: 'TEXT', nullable: 'NOT NULL', default: 'None' },
      { name: 'reference_id', type: 'INT', nullable: 'NULL', default: 'NULL' },
      { name: 'reference_type', type: 'VARCHAR(100)', nullable: 'NULL', default: 'NULL' },
      { name: 'is_read', type: 'BOOLEAN', nullable: 'NOT NULL DEFAULT false', default: 'false' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: 'NOT NULL', default: 'CURRENT_TIMESTAMP' }
    ]
  }
];

const INDEXES_INFO = [
  {
    name: 'idx_messages_conversation_thread',
    table: 'messages',
    purpose: 'Optimizes chat history queries between mentor and mentee (Composite sorting).',
    sqlCode: 'CREATE INDEX idx_messages_conversation_thread ON messages (sender_id, receiver_id, sent_at DESC);'
  },
  {
    name: 'idx_notifications_user_unread',
    table: 'notifications',
    purpose: 'Partial index to speed up real-time unread alerts fetching.',
    sqlCode: 'CREATE INDEX idx_notifications_user_unread ON notifications (user_id, created_at DESC) WHERE is_read = false;'
  },
  {
    name: 'idx_active_mentorship_sessions',
    table: 'mentorship_sessions_active',
    purpose: 'Accelerates evaluation checks on active co-signed workspaces.',
    sqlCode: 'CREATE INDEX idx_active_mentorship_sessions ON mentorship_sessions_active (graduate_id, mentor_id, status);'
  },
  {
    name: 'idx_sessions_scheduling',
    table: 'sessions',
    purpose: 'Covering index to optimize date queries & overlapping event lookups on live calendar events.',
    sqlCode: 'CREATE INDEX idx_sessions_scheduling ON sessions (mentor_id, mentee_id, scheduled_at, status);'
  },
  {
    name: 'idx_mentorship_requests_status',
    table: 'mentorship_requests',
    purpose: 'Speeds up verification checkups on pending/accepted mentorship queues.',
    sqlCode: 'CREATE INDEX idx_mentorship_requests_status ON mentorship_requests (graduate_id, mentor_id, status);'
  }
];

const API_ENDPOINTS: any[] = [
  {
    group: 'AUTHENTICATION & PROFILES',
    routes: [
      {
        method: 'POST',
        path: '/api/auth/register',
        desc: 'Registers a graduate, mentor, or industry profile and compiles password bcrypt hash.',
        payload: { name: 'Alhaz Ali', email: 'alhaz@careerbridge.bd', role: 'graduate', password: 'secretpassword123' },
        response: { success: true, token: 'eyJJbW...zExNiJ9', user: { id: 14, name: 'Alhaz Ali', role: 'graduate' } }
      },
      {
        method: 'POST',
        path: '/api/auth/login',
        desc: 'Authenticates credentials and returns a secure cryptographic JWT token.',
        payload: { email: 'dr.faiz@careerbridge.bd', password: 'correctpassword789' },
        response: { success: true, token: 'eyJKV1...003mN2s', user: { id: 3, name: 'Dr. Faiz Rahman', role: 'mentor' } }
      },
      {
        method: 'GET',
        path: '/api/profiles/vitals',
        desc: 'Retrieves complete profile data including target role, CV node parsing, and skills.',
        payload: null,
        response: { id: 3, user_id: 3, university: 'BUET', graduation_year: 2025, professional_score: 72, skills: ['PostgreSQL', 'GoLang', 'System Design'] }
      }
    ]
  },
  {
    group: 'MENTORSHIP REQUEST ENGINE',
    routes: [
      {
        method: 'POST',
        path: '/api/mentorship/request',
        desc: 'Dispatches a connection entry proposing standard academic guided support.',
        payload: { mentorId: 3, message: 'I need to close system design architectural gaps for Junior backend positions.' },
        response: { success: true, request: { id: 45, graduate_id: 14, mentor_id: 3, status: 'pending', requested_at: '2026-06-10T12:00:00Z' } }
      },
      {
        method: 'POST',
        path: '/api/mentorship/respond',
        desc: 'Called by the mentor to accept or reject. If accepted, auto-provisions a secure Mentorship Active Workspace.',
        payload: { requestId: 45, action: 'accepted' },
        response: { success: true, activeSessionId: 12, status: 'accepted', activated_at: '2026-06-10T12:05:00Z' }
      }
    ]
  },
  {
    group: 'TASK & GOOGLE CLASSROOM SYSTEMS',
    routes: [
      {
        method: 'POST',
        path: '/api/tasks/create',
        desc: 'Enables a mentor to assign technical target tasks pointing to critical core gaps.',
        payload: { sessionId: 12, title: 'Optimizing Redis Indexes on Node.js', description: 'Address cache invalidation models with secure state cookies.', due_date: '2026-06-15T18:00:00Z' },
        response: { success: true, task: { id: 89, session_id: 12, title: 'Optimizing Redis Indexes...', status: 'assigned' } }
      },
      {
        method: 'POST',
        path: '/api/tasks/89/submit',
        desc: 'Fired by the graduate. Uploads code attachments base64 references & descriptive text notes.',
        payload: { submissionUrl: 'https://github.com/alhaz/redis-perf-worker', note: 'Enforced LRU eviction with auto-indexing logic.' },
        response: { success: true, submission: { id: 104, task_id: 89, submitted_by: 14, status: 'submitted' } }
      }
    ]
  },
  {
    group: 'REAL-TIME WIRE MESSAGING & SESSIONS',
    routes: [
      {
        method: 'POST',
        path: '/api/sessions/live',
        desc: 'Schedules a Zoom / Google Meet conference event. Auto-syncs to the recipient’s Google Calendar via Access Token.',
        payload: { title: 'Mid-Sprint Code Review', dateTime: '2026-06-12T14:30:00Z', durationMinutes: 45, meetingPlatform: 'google_meet', meetingLink: 'https://meet.google.com/xyz-abc-123' },
        response: { success: true, session: { id: 18, meeting_platform: 'google_meet', meeting_link: 'https://meet.google.com/xyz-abc-123', status: 'scheduled' } }
      }
    ]
  }
];

const SOCKET_CHANNELS = [
  { name: 'connection', direction: 'IN', desc: 'Fires when a client establishes a socket handshake.', payload: 'io.connect(SERVER_URL, { auth: { token: JWT_TOKEN } })' },
  { name: 'join_session_workspace', direction: 'IN', desc: 'Fires when active channels require isolation bounds.', payload: '{ sessionId: 12 }' },
  { name: 'send_secure_wire_msg', direction: 'IN/OUT', desc: 'Dispatches real-time message payloads instantly securely inside connected threads.', payload: '{ receiverId: 3, content: "Optimized response, sir!", attachmentUrl: null }' },
  { name: 'new_alert_notification', direction: 'OUT', desc: 'Instantly fires push alert objects down to connected user clients.', payload: '{ type: "task_assigned", title: "New Assignment", body: "Faiz Rahman assigned OAuth task." }' }
];

export function DevSchemaConsole() {
  const [activeSubTab, setActiveSubTab] = useState<'db' | 'api' | 'socket'>('db');
  const [selectedTable, setSelectedTable] = useState<string>('users');
  const [testedEndpoint, setTestedEndpoint] = useState<string>('/api/auth/login');
  const [simRes, setSimRes] = useState<any | null>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [mockTerminalLogs, setMockTerminalLogs] = useState<string[]>([
    '[SYSTEM] Initializing Capstone Backend Micro-engine...',
    '[POSTGRES] Connected to postgres://superuser@gcp-cloud-sql-db ...',
    '[SOCKET.IO] Listening securely for real-time events on port 3000...',
    '[SERVER] Express routing loaded: 14 distinct controller routes registered'
  ]);

  const handleSimulateCall = (routeObj: any) => {
    setSimLoading(true);
    setSimRes(null);
    
    // Append to live terminal logs
    const nowStr = new Date().toLocaleTimeString();
    const newLogs = [
      ...mockTerminalLogs,
      `[HTTP_REQUEST] ${nowStr} - ${routeObj.method} ${routeObj.path}`,
      `[SECURITY] JWT authentication parsed successfully from Headers...`
    ];
    setMockTerminalLogs(newLogs.slice(-10)); // Keep last 10 logs

    setTimeout(() => {
      setSimRes(routeObj.response);
      setSimLoading(false);
      setMockTerminalLogs(prev => [
        ...prev,
        `[HTTP_RESPONSE] HTTP 200 OK - Payload size: ${JSON.stringify(routeObj.response).length} bytes`
      ].slice(-10));
    }, 800);
  };

  const handleClearTerminal = () => {
    setMockTerminalLogs([
      '[SYSTEM] Terminal logs cleared.',
      '[SYSTEM] Standing by for incoming REST & WebSocket requests...'
    ]);
    setSimRes(null);
  };

  return (
    <div className="w-full bg-slate-900 text-slate-100 rounded-3xl p-6 lg:p-10 border border-slate-800 shadow-2xl space-y-8 font-sans">
      {/* Platform Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <p className="font-mono text-[10px] tracking-widest text-indigo-400 uppercase font-black">Backend System Architecture</p>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight mt-1.5 flex items-center gap-2.5">
            <Cpu className="w-8 h-8 text-indigo-400 stroke-[1.5]" />
            Development Control Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Visual workspace to analyze, simulate, and present the Express.js, PostgreSQL, and Socket.io architecture designed for the Bangladeshi university graduate mentorship capstone.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1.5 rounded-xl">
          <button 
            onClick={() => setActiveSubTab('db')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeSubTab === 'db' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <Database className="w-3.5 h-3.5" />
            PostgreSQL DB Schema
          </button>
          <button 
            onClick={() => setActiveSubTab('api')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeSubTab === 'api' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <Globe className="w-3.5 h-3.5" />
            REST Client simulation
          </button>
          <button 
            onClick={() => setActiveSubTab('socket')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeSubTab === 'socket' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <Radio className="w-3.5 h-3.5" />
            Socket.io Events
          </button>
        </div>
      </div>

      {/* Main Grid: Control panel + real-time server activity console */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Side: Selected Interactive Control Panel */}
        <div className="xl:col-span-7 min-w-0">
          <AnimatePresence mode="wait">
            
            {/* SUB TAB 1: POSTGRESQL TABLES */}
            {activeSubTab === 'db' && (
              <motion.div 
                key="db"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Database className="w-5 h-5 text-indigo-400" />
                      Relational PostgreSQL Data Models
                    </h3>
                    <p className="text-xs text-slate-400">
                      Constructed with serial PKs, foreign key cascades, checked constraints, and optimal composite indexes.
                    </p>
                  </div>
                </div>

                {/* Table Navigator Pills */}
                <div className="flex flex-wrap gap-2">
                  {POSTGRES_TABLES.map(table => (
                    <button
                      key={table.name}
                      onClick={() => setSelectedTable(table.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-tight font-bold transition-all ${selectedTable === table.name ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'}`}
                    >
                      {table.name}
                    </button>
                  ))}
                </div>

                {/* Active Table Schema Card */}
                {(() => {
                  const currentTableObj = POSTGRES_TABLES.find(t => t.name === selectedTable);
                  if (!currentTableObj) return null;
                  return (
                    <motion.div 
                      key={selectedTable}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-slate-950 rounded-2xl border border-slate-800 p-6 space-y-4"
                    >
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-mono font-bold tracking-widest text-[#EC4899] uppercase bg-[#EC4899]/10 border border-[#EC4899]/20 px-2 py-0.5 rounded-md">PostgreSQL Table</span>
                          <span className="font-mono text-lg font-black text-white">{currentTableObj.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 italic font-mono">
                          // Description: {currentTableObj.desc}
                        </p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono text-slate-300">
                          <thead>
                            <tr className="border-b border-slate-800 text-indigo-400 font-extrabold uppercase text-[10px] tracking-wider">
                              <th className="py-2.5 w-1/4">Column Name</th>
                              <th className="py-2.5 w-1/4">Data Type</th>
                              <th className="py-2.5 w-1/4">Nullability</th>
                              <th className="py-2.5">Default / Constraint</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900">
                            {currentTableObj.columns.map((col, index) => (
                              <tr key={index} className="hover:bg-slate-900/40">
                                <td className="py-3 font-bold text-white">{col.name}</td>
                                <td className="py-3 text-slate-300">{col.type}</td>
                                <td className={`py-3 ${col.nullable === 'NOT NULL' ? 'text-amber-500 font-semibold' : 'text-slate-500'}`}>
                                  {col.nullable}
                                </td>
                                <td className="py-3 text-slate-400 text-[11px] font-medium">{col.default}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* DB Performance Indexes Listing */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    SQL Secondary Performance Indexes Included ({INDEXES_INFO.length})
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {INDEXES_INFO.map(idx => (
                      <div key={idx.name} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="font-mono text-xs font-black text-emerald-400">{idx.name}</p>
                          <p className="text-xs text-slate-400">Target Table: <span className="font-mono font-bold text-slate-300">{idx.table}</span></p>
                          <p className="text-[11px] text-slate-400 mt-1.5 pr-2">{idx.purpose}</p>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-850 font-mono text-[10px] text-slate-300 shrink-0 select-all max-w-[280px] break-all">
                          {idx.sqlCode}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUB TAB 2: REST CLIENT SIMULATION */}
            {activeSubTab === 'api' && (
              <motion.div 
                key="api"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-400" />
                    Interactive REST Client Console
                  </h3>
                  <p className="text-xs text-slate-400">
                    Audit the structured Express endpoints, dispatch mock payloads, and inspect backend response outputs.
                  </p>
                </div>

                <div className="space-y-4">
                  {API_ENDPOINTS.map((groupObj, i) => (
                    <div key={i} className="space-y-3">
                      <p className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase font-mono pl-1">
                        // {groupObj.group}
                      </p>
                      
                      <div className="space-y-2">
                        {groupObj.routes.map(route => {
                          const isCurrentlyTested = testedEndpoint === route.path;
                          return (
                            <div 
                              key={route.path}
                              onClick={() => setTestedEndpoint(route.path)}
                              className={`p-4 rounded-xl border transition-all text-left cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${isCurrentlyTested ? 'bg-slate-950 border-indigo-500/50' : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'}`}
                            >
                              <div className="flex items-start gap-4 flex-1 min-w-0">
                                <span className={`px-2.5 py-1 text-[9px] font-bold rounded-lg font-mono tracking-wide ${route.method === 'POST' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-blue-500/10 text-blue-400 border border-blue-500/25'}`}>
                                  {route.method}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-mono text-xs font-bold text-slate-100 truncate">{route.path}</p>
                                  <p className="text-xs text-slate-400 font-medium mt-1 pr-2">{route.desc}</p>
                                </div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTestedEndpoint(route.path);
                                  handleSimulateCall(route);
                                }}
                                disabled={simLoading && isCurrentlyTested}
                                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:bg-indigo-800 transition-all text-xs font-bold text-white rounded-lg flex items-center gap-1.5 shrink-0"
                              >
                                {simLoading && isCurrentlyTested ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                Simulate HTTP
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mock Response Visualizer */}
                {(() => {
                  const currentRouteData: any = (API_ENDPOINTS.flatMap(g => g.routes) as any[]).find(r => r.path === testedEndpoint);
                  if (!currentRouteData) return null;
                  return (
                    <motion.div 
                      key={testedEndpoint}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">HTTP Simulation Inspection</span>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                          <span className="text-[10px] font-mono text-slate-400">MOCK REQUEST TEMPLATE</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-mono text-slate-400">// JSON Request Payload</p>
                          <pre className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 font-mono text-[11px] text-indigo-300 overflow-x-auto">
                            {currentRouteData.payload ? JSON.stringify(currentRouteData.payload, null, 2) : 'No request payload required (GET)'}
                          </pre>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[10px] font-mono text-slate-400">// JSON Express Response</p>
                          <pre className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 font-mono text-[11px] text-emerald-400 overflow-x-auto min-h-[96px]">
                            {simLoading ? (
                              <div className="flex items-center gap-2 text-slate-400">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Processing mock thread...
                              </div>
                            ) : simRes ? (
                              JSON.stringify(simRes, null, 2)
                            ) : (
                              'Click "Simulate HTTP" above to fire request'
                            )}
                          </pre>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </motion.div>
            )}

            {/* SUB TAB 3: SOCKET.IO CHANNELS */}
            {activeSubTab === 'socket' && (
              <motion.div 
                key="socket"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
                    Socket.io Real-time WebSocket Gateway
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time bidirectional event contracts assigned for sub-second communication channels (chat, live notifications, real-time markers).
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {SOCKET_CHANNELS.map(ch => (
                    <div key={ch.name} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-start justify-between gap-6 hover:border-slate-750 transition-all">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider ${ch.direction === 'IN' ? 'bg-[#EC4899]/10 text-[#EC4899] border border-[#EC4899]/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                            {ch.direction === 'IN' ? 'Emit to Server' : 'Broadcast to Client'}
                          </span>
                          <span className="font-mono text-sm font-black text-white">{ch.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-semibold">{ch.desc}</p>
                      </div>

                      <div className="space-y-1 md:w-80 shrink-0">
                        <p className="text-[9px] font-mono text-slate-500">// Event Signature Payload</p>
                        <pre className="bg-slate-900 border border-slate-850 p-3 rounded-lg font-mono text-[10px] text-indigo-300 select-all overflow-x-auto break-all">
                          {ch.payload}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex items-start gap-4">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
                    <Info className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-indigo-300">Socket.io Authentication Hook</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Our live Node.js gateway incorporates a custom auth middleware verifying standard JWT authorization scopes on initial handshake. Attempting to emit to connections without correct student/mentor parameters will auto-invoke disconnect filters!
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: Beautiful Unix Terminal Logs Streamer */}
        <div className="xl:col-span-5 flex flex-col h-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl min-h-[480px]">
          {/* Header */}
          <div className="bg-slate-900 px-5 py-3.5 border-b border-indigo-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-xs font-semibold text-slate-200 tracking-tight">Capstone Server Logs (Live Output)</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleClearTerminal}
                className="text-slate-400 hover:text-white px-2 py-1 bg-slate-950 border border-slate-800 rounded-md text-[10px] font-mono font-bold transition-all"
              >
                Clear
              </button>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EC4899]/30" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/30" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/30 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Core Logs Screen */}
          <div className="flex-1 p-5 font-mono text-[11px] text-slate-300 space-y-2.5 overflow-y-auto leading-relaxed h-[420px] custom-scrollbar bg-[#050510]">
            {mockTerminalLogs.map((log, index) => {
              let colorClasses = 'text-slate-400';
              if (log.startsWith('[SYSTEM]')) colorClasses = 'text-[#EC4899] font-bold';
              else if (log.startsWith('[POSTGRES]')) colorClasses = 'text-indigo-400 font-semibold';
              else if (log.startsWith('[SOCKET.IO]')) colorClasses = 'text-amber-400 font-semibold';
              else if (log.startsWith('[HTTP_REQUEST]')) colorClasses = 'text-emerald-400 font-medium';
              else if (log.startsWith('[HTTP_RESPONSE]')) colorClasses = 'text-emerald-500 font-bold';
              else if (log.startsWith('[SECURITY]')) colorClasses = 'text-purple-400';

              return (
                <div key={index} className="flex items-start gap-2.5 border-b border-slate-950 pb-1 font-mono">
                  <span className="text-slate-600 select-none text-[10px] mt-0.5">{(index + 1).toString().padStart(2, '0')}</span>
                  <span className={colorClasses}>{log}</span>
                </div>
              );
            })}
          </div>

          {/* Interactive SQL Schema Exporter Panel */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-bold flex items-center gap-1"><Database className="w-3.5 h-3.5 text-indigo-400" /> SCHEMA EXPORT</span>
              <span className="font-mono">POSTGRESQL DIALECT</span>
            </div>
            <p className="text-[11px] text-slate-300 font-bold leading-normal">
              Capstone mentor platform database has 10 schemas, and constraints are compiled fully inside Postgres.
            </p>
            <a 
              href="/backend/schema.sql" 
              target="_blank" 
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 mt-2"
            >
              <Code className="w-3.5 h-3.5" />
              DOWNLOAD FULL schema.sql
            </a>
          </div>
        </div>

      </div>

    </div>
  );
}
