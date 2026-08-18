import { Server as SocketIOServer, Socket } from 'socket.io';
import http from 'http';

// Mapping from userId (stored as string) to active socket instances
const activeConnections = new Map<number, string>();

let io: SocketIOServer | null = null;

export const initSocket = (server: http.Server): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*', // Allow all origins for local preview / sandbox compliance
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Receive authentication binding when client logs in
    socket.on('authenticate', (userId: number) => {
      if (userId) {
        activeConnections.set(userId, socket.id);
        console.log(`User ${userId} authenticated on socket ${socket.id}`);
      }
    });

    socket.on('disconnect', () => {
      // Find and clean up socket mapping
      for (const [userId, socketId] of activeConnections.entries()) {
        if (socketId === socket.id) {
          activeConnections.delete(userId);
          console.log(`User ${userId} disconnected from socket.`);
          break;
        }
      }
    });
  });

  return io;
};

// Return the SocketServer instance
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io server is not initialized yet.');
  }
  return io;
};

// Send a real-time event to a specific user context
export const sendRealTimeNotification = (userId: number, eventName: string, payload: any): boolean => {
  if (!io) return false;
  const socketId = activeConnections.get(userId);
  if (socketId) {
    io.to(socketId).emit(eventName, payload);
    return true;
  }
  return false;
};
