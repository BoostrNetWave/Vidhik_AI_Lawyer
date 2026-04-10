import express, { Router } from 'express';
import { getTickets, createTicket, closeTicket, deleteTicket } from '../controllers/supportController.js';

const router: Router = express.Router();
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = 'uploads/support';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.get('/tickets', getTickets);
router.post('/tickets', upload.single('attachment'), createTicket);
router.post('/tickets/:id/close', closeTicket);
router.delete('/tickets/:id', deleteTicket);

export default router;
