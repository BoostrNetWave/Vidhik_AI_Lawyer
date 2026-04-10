import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const FINAL_SECRET = JWT_SECRET || 'dev_secret_only';

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.warn('WARNING: JWT_SECRET is not defined in production environment!');
}

export interface AuthRequest extends Request {
    user?: any;
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction): void => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, FINAL_SECRET);
            req.user = decoded;
            return next();
        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
            return;
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
        return;
    }
};
