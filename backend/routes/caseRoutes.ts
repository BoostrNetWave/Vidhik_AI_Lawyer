import express, { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
    getCases, 
    getCaseById, 
    createCase, 
    submitPlan, 
    updateMilestoneStatus, 
    uploadProof, 
    requestPayout 
} from '../controllers/caseController.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for proof uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Save directly in uploads folder
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for proof documents
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

router.get('/', getCases);
router.post('/', createCase);
router.get('/:id', getCaseById);
router.put('/:id/plan', submitPlan);
router.put('/:id/milestones/:index/status', updateMilestoneStatus);
router.post('/:id/milestones/:index/upload-proof', upload.single('proof'), uploadProof);
router.post('/:id/milestones/:index/request-payout', requestPayout);

export default router;
