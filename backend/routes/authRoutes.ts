import express from 'express';
import { register, login, verifyOTP, resendOTP } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // Relaxed from 10 to 100
    message: 'Too many accounts created from this IP, please try again after an hour'
});

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/resend-otp', authLimiter, resendOTP);
router.get('/me', protect, async (req: any, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({
            user: {
                id: user._id,
                userId: user.userId,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                subscription: user.subscription || 'Free'
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

import { getEmailConfig, verifyEmailConfiguration, sendEmail } from '../utils/emailService.js';

router.post('/test-smtp', async (req, res) => {
    try {
        const targetEmail = req.body?.email || process.env.SMTP_USER || 'sibsankar2727@gmail.com';
        const config = getEmailConfig();
        const verified = await verifyEmailConfiguration();

        if (!verified) {
            return res.status(500).json({
                success: false,
                message: 'SMTP connection verification failed. Please verify credentials or Google App Password.',
                config: {
                    host: config.host || config.service,
                    port: config.port,
                    secure: config.secure,
                    user: config.user
                }
            });
        }

        const sent = await sendEmail(
            targetEmail,
            'Vidhik AI Lawyer Admin - SMTP Diagnostics Test',
            `<h3>Lawyer Backend SMTP Test</h3>
             <p>This is a test email sent from the Vidhik AI Lawyer Backend server.</p>
             <p><strong>SMTP Host:</strong> ${config.host || config.service}</p>
             <p><strong>SMTP Port:</strong> ${config.port}</p>
             <p><strong>Sender:</strong> ${config.user}</p>
             <p>Everything is working as expected!</p>`
        );

        return res.json({
            success: sent,
            message: sent ? `Test email dispatched to ${targetEmail}` : 'Verification passed but sendMail failed.',
            config: {
                host: config.host || config.service,
                port: config.port,
                secure: config.secure,
                user: config.user
            }
        });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
