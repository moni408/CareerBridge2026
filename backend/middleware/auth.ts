import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_mentorship_jwt_token_key_bd_2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'student' | 'mentor' | 'admin';
  };
}

// Global Auth Guard to lock controllers strictly to authenticated users
export const authGuard = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Access denied. Bearer JWT Token missing or invalid.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: 'student' | 'mentor' | 'admin' };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token expired or compromised authentication. Re-login required.' });
  }
};

// Role-Gate to control specific routes matching 'student', 'mentor', or 'admin' roles
export const roleGuard = (roles: Array<'student' | 'mentor' | 'admin'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized credentials feed.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Forbidden access. Requires permissions: [${roles.join(', ')}]` });
      return;
    }

    next();
  };
};
