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

export default router;
