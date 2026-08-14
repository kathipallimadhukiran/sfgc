import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { User, IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'] as string;
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Access denied. No authentication token provided.' });
    return;
  }

  try {
    // Check if token is mock or inapp demo token
    if (token.startsWith('inapp_token_')) {
      const parts = token.split('_');
      const userId = parts[2];
      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          req.user = user;
          return next();
        }
      }
    }

    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; role?: string };
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({ success: false, message: 'User belonging to this token no longer exists.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const role = (req.user.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'super admin') {
    res.status(403).json({ success: false, message: 'Admin privileges required for this action.' });
    return;
  }

  next();
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const userRole = (req.user.role || '').toLowerCase();
    const lowerAllowed = allowedRoles.map(r => r.toLowerCase());

    if (!lowerAllowed.includes(userRole) && userRole !== 'admin' && userRole !== 'super admin') {
      res.status(403).json({ success: false, message: `Access restricted to roles: ${allowedRoles.join(', ')}` });
      return;
    }

    next();
  };
};
