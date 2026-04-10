import express from 'express';
import { getAppointmentsHistory, createBooking } from '../controllers/appointmentController.js';

const router = express.Router();

router.post('/appointments', createBooking);
router.get('/appointments/history/:userId', getAppointmentsHistory);

export default router;
