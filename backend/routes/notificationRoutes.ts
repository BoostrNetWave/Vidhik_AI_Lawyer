import { Router } from 'express';
import { 
    getNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.post('/mark-all-read', markAllAsRead);
router.delete('/:id', deleteNotification);

export default router;
