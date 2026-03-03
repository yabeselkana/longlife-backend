import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    // Try to get token from cookies first, then fallback to Authorization header
    let token = req.cookies?.token;

    if (!token) {
        const authHeader = req.headers['authorization'];
        token = authHeader && authHeader.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: 'Access token missing or invalid' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: 'Token is invalid or expired' });
        req.user = user as { id: string; role: string };
        next();
    });
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};
