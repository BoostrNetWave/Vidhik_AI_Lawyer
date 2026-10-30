import express, { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
    getCases, 
    getOpenCases,
    getCaseById, 
    createCase, 
    applyToCase,
    submitPlan, 
    updateMilestoneStatus, 
    uploadProof, 
    requestPayout,
    confirmBooking,
    uploadMeetingSummary,
    joinMeeting,
    sendSignal,
    getSignals,
    clearSignals,
    reanalyzeCase
} from '../controllers/caseController.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for proof uploads
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt', '.rtf'];
        const allowedMimes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/octet-stream',
            'text/plain',
            'text/rtf'
        ];
        if (allowedExts.includes(ext) || allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images, PDFs, and Word documents are allowed'));
        }
    }
});

const router: Router = express.Router();

router.use(protect);

router.get('/open', getOpenCases);
router.get('/', getCases);
router.post('/', createCase);
router.post('/:id/apply', applyToCase);
router.put('/:id/confirm-booking', confirmBooking);
router.put('/:id/accept-case', confirmBooking);
router.get('/:id', getCaseById);
router.put('/:id/plan', submitPlan);
router.put('/:id/milestones/:index/status', updateMilestoneStatus);
router.post('/:id/milestones/:index/upload-proof', upload.single('proof'), uploadProof);
router.post('/:id/milestones/:index/request-payout', requestPayout);
router.post('/:id/meeting-summary', upload.single('summary'), uploadMeetingSummary);
router.post('/:id/join-meeting', joinMeeting);
router.post('/:id/signal', sendSignal);
router.get('/:id/signals', getSignals);
router.post('/:id/signals/clear', clearSignals);
router.post('/:id/reanalyze', reanalyzeCase);

export default router;
