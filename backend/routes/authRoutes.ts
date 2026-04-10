import express from 'express';
import { register, login } from '../controllers/authController.js';
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 login/register requests per hour
    message: 'Too many accounts created from this IP, please try again after an hour'
});

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

export default router;
