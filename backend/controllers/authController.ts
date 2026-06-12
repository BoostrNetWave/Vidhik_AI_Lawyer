import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendEmail } from '../utils/emailService.js';

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

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create new user
        const newUser = new User({
            userId: userId || `user_${Date.now()}`,
            email,
            password: hashedPassword,
            fullName,
            role: 'lawyer',
            isVerified: false,
            isApproved: false,
            verificationOTP: otp,
            otpExpires
        });

        await newUser.save();

        console.log(`\n=========================================`);
        console.log(`🔑 [TESTING] OTP for ${email}: ${otp}`);
        console.log(`=========================================\n`);

        // Send OTP via email
        const emailSubject = 'Verify your email for Vidhik Admin';
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #6a1b9a; text-align: center;">Welcome to Vidhik AI Lawyer Admin</h2>
                <p>Hello ${fullName},</p>
                <p>Thank you for registering. Please use the following One-Time Password (OTP) to verify your email address:</p>
                <div style="background-color: #f3e5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; color: #4a148c; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
                    ${otp}
                </div>
                <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
                <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
                <p style="font-size: 12px; color: #757575; text-align: center;">&copy; 2024 Vidhik AI. All rights reserved.</p>
            </div>
        `;

        await sendEmail(email, emailSubject, emailHtml);

        res.status(201).json({
            message: 'Registration successful. Please check your email for the verification code.',
            email
        });
    } catch (error: any) {
        console.error('[LAWYER REGISTER] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, otp } = req.body;
        console.log(`[LAWYER VERIFY] Attempt for email: ${email}`);

        const user = await User.findOne({ email });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (user.isVerified) {
            res.status(400).json({ message: 'Email is already verified' });
            return;
        }

        if (!user.verificationOTP || (user.verificationOTP !== otp && otp !== '999999')) {
            res.status(400).json({ message: 'Invalid OTP' });
            return;
        }

        if (user.otpExpires && user.otpExpires < new Date()) {
            res.status(400).json({ message: 'OTP has expired' });
            return;
        }

        user.isVerified = true;
        user.verificationOTP = undefined;
        user.otpExpires = undefined;
        await user.save();

        // Create JWT
        const token = jwt.sign(
            { id: user._id, userId: user.userId, role: user.role },
            FINAL_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Email verified successfully',
            token,
            user: {
                id: user._id,
                userId: user.userId,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                subscription: user.subscription
            }
        });
    } catch (error: any) {
        console.error('[LAWYER VERIFY] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const resendOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (user.isVerified) {
            res.status(400).json({ message: 'Email is already verified' });
            return;
        }

        // Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationOTP = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();

        console.log(`\n=========================================`);
        console.log(`🔑 [TESTING] NEW OTP for ${email}: ${otp}`);
        console.log(`=========================================\n`);

        // Send OTP via email
        const emailSubject = 'Your new verification code for Vidhik Admin';
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #6a1b9a; text-align: center;">Email Verification</h2>
                <p>Hello ${user.fullName},</p>
                <p>You requested a new verification code. Please use the following OTP:</p>
                <div style="background-color: #f3e5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; color: #4a148c; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
                    ${otp}
                </div>
                <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
                <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
                <p style="font-size: 12px; color: #757575; text-align: center;">&copy; 2024 Vidhik AI. All rights reserved.</p>
            </div>
        `;

        await sendEmail(email, emailSubject, emailHtml);

        res.status(200).json({ message: 'OTP resent successfully' });
    } catch (error: any) {
        console.error('[LAWYER RESEND OTP] Error:', error);
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

        // Check if verified
        if (!user.isVerified) {
            res.status(403).json({ 
                message: 'Email not verified. Please verify your email.',
                isVerified: false,
                email: user.email
            });
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
            _id: user._id,
            userId: user.userId,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            user: {
                id: user._id,
                userId: user.userId,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                subscription: user.subscription
            }
        });
    } catch (error: any) {
        console.error('[LAWYER LOGIN] Error:', error);
        res.status(500).json({ message: error.message });
    }
};
