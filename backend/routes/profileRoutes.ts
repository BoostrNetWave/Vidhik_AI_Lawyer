import express, { Router } from 'express';
import { getProfile, updateProfile, getPayouts, updatePayouts, uploadAvatar, updatePassword } from '../controllers/profileController.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for avatar uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

const router: Router = express.Router();

// Profile routes
router.get('/profile/:userId', getProfile);
router.put('/profile/:userId', updateProfile);
router.post('/profile/upload-avatar', upload.single('avatar'), uploadAvatar);
router.post('/profile/password', updatePassword);

// Payout routes
router.get('/payouts/:userId', getPayouts);
router.post('/payouts', updatePayouts);

export default router;
