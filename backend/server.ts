import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSocket } from './services/socketService.js';

// Import Modular API Routers
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import mentorshipRoutes from './routes/mentorshipRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Global Middlewares
app.use(cors({ origin: '*' })); // Allow all incoming browser origins for REST APIs
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Socket.io Server for Real-Time Notification & chat channels
const io = initSocket(server);

// Base health verification route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'Graduate Mentorship Platform API Engine' });
});

// Configure REST API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/mentorship', mentorshipRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);

// Global Error Handler Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Exception:', err);
  res.status(500).json({ error: 'Critical server error occurred.' });
});

// Port and Host binding
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Graduate Mentorship API Backend Engine running on port ${PORT}`);
});
