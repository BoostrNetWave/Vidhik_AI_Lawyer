import 'dotenv/config';

import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Route Imports
import blogRoutes from './routes/blogRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import authRoutes from './routes/authRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import caseRoutes from './routes/caseRoutes.js';
import consultationRoutes from './routes/consultationRoutes.js';
import websiteContentRoutes from './routes/websiteContentRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5025;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security & Logging Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased from 100 to 1000
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes - Mounted with /api prefix as well as root & plural aliases for Nginx proxy compatibility
const registerRoute = (basePath: string, router: any) => {
    app.use(`/api${basePath}`, router);
    app.use(basePath, router);
};

registerRoute('/blogs', blogRoutes);
registerRoute('/dashboard', dashboardRoutes);
registerRoute('/support', supportRoutes);
registerRoute('/auth', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', bookingRoutes);
app.use('/api', appointmentRoutes);
app.use('/', profileRoutes);
app.use('/', bookingRoutes);
app.use('/', appointmentRoutes);
registerRoute('/settings', settingsRoutes);
registerRoute('/payments', paymentRoutes);
registerRoute('/payment', paymentRoutes);
registerRoute('/subscription', paymentRoutes);
registerRoute('/subscriptions', paymentRoutes);
registerRoute('/cases', caseRoutes);
registerRoute('/consultations', consultationRoutes);
registerRoute('/website-content', websiteContentRoutes);

// Database connection & Server start
const startServer = async () => {
    try {
        console.log('Connecting to MongoDB...');
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        app.listen(PORT, () => {
            console.log(`\n=================================================`);
            console.log(`🚀 Lawyer Backend running on port ${PORT}`);
            console.log(`📡 MongoDB: Connected`);
            console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'MISSING'}`);
            console.log(`=================================================\n`);
        });
    } catch (error: any) {
        console.error('Initial startup error:', error.message);
        process.exit(1);
    }
};

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: NODE_ENV === 'production' ? '🥞' : err.stack,
    });
});

// Root route
app.get('/', (req: Request, res: Response) => {
    res.send('Legal Admin API is running...');
});

startServer();
