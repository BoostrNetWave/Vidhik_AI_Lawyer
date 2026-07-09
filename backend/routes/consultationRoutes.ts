import express, { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
    getConsultationsForLawyer,
    getConsultationById,
    acceptConsultation,
    proposeConsultationTime,
    uploadConsultationDocument,
    cancelConsultation
} from '../controllers/consultationController.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer storage for lawyer uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'consult-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only images, PDFs, and Word documents are allowed'));
        }
    }
});

const router: Router = express.Router();

router.use(protect);

router.get('/', getConsultationsForLawyer);
router.get('/:id', getConsultationById);
router.post('/:id/accept', acceptConsultation);
router.post('/:id/propose', proposeConsultationTime);
router.post('/:id/upload', upload.single('file'), uploadConsultationDocument);
router.post('/:id/cancel', cancelConsultation);

export default router;
