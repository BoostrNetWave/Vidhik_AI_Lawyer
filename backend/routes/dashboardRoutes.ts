import express, { Router } from 'express';
import { getStats, getRevenue, getServiceDistribution, getTransactions } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router: Router = express.Router();

router.use(protect);

router.get('/stats', getStats);
router.get('/revenue', getRevenue);
router.get('/services', getServiceDistribution);
router.get('/transactions', getTransactions);

export default router;
