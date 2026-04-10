import express, { Router } from 'express';
import { getPaymentSummary, getPaymentHistory, approvePayment } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router: Router = express.Router();

router.use(protect);

router.get('/summary', getPaymentSummary);
router.get('/history', getPaymentHistory);
router.post('/:id/approve', approvePayment);

export default router;
