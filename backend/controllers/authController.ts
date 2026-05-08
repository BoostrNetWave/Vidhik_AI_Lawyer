import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be defined in production environment');
}

const FINAL_SECRET = JWT_SECRET || 'dev_secret_only';

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, fullName, userId } = req.body;
        console.log(`[LAWYER REGISTER] Attempt for email: ${email}`);

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            userId: userId || `user_${Date.now()}`,
            email,
            password: hashedPassword,
            fullName,
            role: 'admin' // Defaulting to admin for this dashboard
        });

        await newUser.save();

        // Create JWT
        const token = jwt.sign(
            { id: newUser._id, userId: newUser.userId, role: newUser.role },
            FINAL_SECRET,
            { expiresIn: '1d' }
        );

        res.status(201).json({
            token,
            user: {
                id: newUser._id,
                userId: newUser.userId,
                email: newUser.email,
                fullName: newUser.fullName,
                role: newUser.role
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        console.log(`[LAWYER LOGIN] Attempt for email: ${email}`);

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            console.log(`[LAWYER LOGIN] User not found: ${email}`);
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password!);
        if (!isMatch) {
            console.log(`[LAWYER LOGIN] Invalid password for email: ${email}`);
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }
        console.log(`[LAWYER LOGIN] Success for email: ${email}`);

        // Create JWT
        const token = jwt.sign(
            { id: user._id, userId: user.userId, role: user.role },
            FINAL_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                userId: user.userId,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        });
    } catch (error: any) {
        console.error('[LAWYER LOGIN] Error:', error);
        res.status(500).json({ message: error.message });
    }
};
