import 'dotenv/config';

import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getFileFromGridFS, getMimeType, saveFileToGridFS, syncLocalUploadsToGridFS } from './utils/gridfsStorage.js';

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
import { verifyEmailConfiguration } from './utils/emailService.js';

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
// Serve uploads from local disk or central MongoDB GridFS across servers
const uploadDirectories = [
    path.resolve(__dirname, 'uploads'),
    path.resolve(__dirname, '../uploads'),
    path.resolve(__dirname, '../../user-admin2/server/uploads'),
    '/var/www/vidhik/lawyer-admin-main/backend/uploads',
    '/var/www/html/Vidhik_AI_Lawyer/backend/uploads',
    '/var/www/html/lawyer/backend/uploads'
];

// Universal file server (Disk -> GridFS Central Database -> Peer fallback)
const handleServeFile = async (req: Request, res: Response) => {
    try {
        const rawParam = req.params[0] || (req.params as any).filename || '';
        let filename = path.basename(rawParam.split('?')[0]);
        if (!filename) {
            return res.status(400).send('Filename required');
        }

        let decodedFilename = filename;
        try {
            decodedFilename = decodeURIComponent(filename);
        } catch {}

        // 1. Check local directories on disk first
        for (const dir of uploadDirectories) {
            if (fs.existsSync(dir)) {
                for (const candidate of [filename, decodedFilename]) {
                    const fullPath = path.join(dir, candidate);
                    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                        const mime = getMimeType(candidate);
                        res.setHeader('Content-Type', mime);
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
                        res.setHeader('Cache-Control', 'public, max-age=86400');
                        return res.sendFile(fullPath);
                    }
                }
            }
        }

        // 2. Not found on local disk: query central MongoDB GridFS!
        const gridResult = await getFileFromGridFS(filename);
        if (gridResult && gridResult.stream) {
            const mime = (gridResult.fileDoc as any)?.contentType || getMimeType(filename);
            res.setHeader('Content-Type', mime);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            if ((gridResult.fileDoc as any)?.length) {
                res.setHeader('Content-Length', (gridResult.fileDoc as any).length);
            }

            // Cache to local uploads dir asynchronously for super fast future loads
            const localCacheDir = path.resolve(__dirname, 'uploads');
            if (!fs.existsSync(localCacheDir)) {
                fs.mkdirSync(localCacheDir, { recursive: true });
            }
            const localCachePath = path.join(localCacheDir, filename);
            const cacheWriteStream = fs.createWriteStream(localCachePath);
            cacheWriteStream.on('error', (err) => console.warn('[GridFS Cache Write Error]:', err));
            gridResult.stream.pipe(cacheWriteStream);

            gridResult.stream.on('error', (err) => {
                console.error('[GridFS Stream Error]:', err);
                if (!res.headersSent) res.status(500).send('Stream error');
            });

            return gridResult.stream.pipe(res);
        }

        // 3. Fallback: try fetching from user peer server if running in production/dev
        const peerUrl = process.env.USER_SERVER_URL || 'http://localhost:5003';
        try {
            const peerResponse = await fetch(`${peerUrl}/uploads/${filename}`);
            if (peerResponse.ok && peerResponse.body) {
                const contentType = peerResponse.headers.get('content-type') || getMimeType(filename);
                res.setHeader('Content-Type', contentType);
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
                const arrayBuffer = await peerResponse.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                // Cache to local uploads & GridFS
                const localCacheDir = path.resolve(__dirname, 'uploads');
                if (!fs.existsSync(localCacheDir)) {
                    fs.mkdirSync(localCacheDir, { recursive: true });
                }
                const localCachePath = path.join(localCacheDir, filename);
                fs.writeFileSync(localCachePath, buffer);
                await saveFileToGridFS(filename, localCachePath, contentType);
                return res.send(buffer);
            }
        } catch (_peerErr) {
            // Ignore peer fetch failure and proceed to 404
        }

        res.status(404).send('File Not Found');
    } catch (err: any) {
        console.error('[File Serve Error]:', err);
        res.status(500).send('Error serving file');
    }
};

app.get([
    '/uploads/:filename',
    '/uploads/*',
    '/lawyer/uploads/:filename',
    '/lawyer/uploads/*',
    '/user/uploads/:filename',
    '/user/uploads/*',
    '/user/lawyer/uploads/:filename',
    '/user/lawyer/uploads/*',
    '/api/uploads/:filename',
    '/api/uploads/*'
], handleServeFile);

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

        // Sync local uploads to MongoDB GridFS for seamless cross-server access
        syncLocalUploadsToGridFS(path.resolve(__dirname, 'uploads')).catch(err => console.error(err));

        app.listen(PORT, () => {
            console.log(`\n=================================================`);
            console.log(`🚀 Lawyer Backend running on port ${PORT}`);
            console.log(`📡 MongoDB: Connected`);
            console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'MISSING'}`);
            console.log(`=================================================\n`);

            // Verify SMTP configuration on startup
            verifyEmailConfiguration().catch(err => {
                console.error('[Lawyer Startup] Email verification check error:', err);
            });
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
