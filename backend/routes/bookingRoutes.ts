import express from 'express';
import {
    getAvailability,
    addSlot,
    addBlackout,
    deleteSlot,
    deleteBlackout,
    getHours,
    getSettings,
    getTimezone,
    updateTimezone,
    getCalendarSyncSettings,
    updateSettings,
    updateHours
} from '../controllers/bookingController.js';

const router = express.Router();

// Booking Prefs Routes
router.get('/booking-prefs/availability', getAvailability);
router.post('/booking-prefs/availability/slots', addSlot);
router.delete('/booking-prefs/availability/slots', deleteSlot);
router.post('/booking-prefs/availability/blackouts', addBlackout);
router.delete('/booking-prefs/availability/blackouts', deleteBlackout);
router.get('/booking-prefs/hours', getHours);
router.put('/booking-prefs/hours', updateHours);
router.get('/booking-prefs/settings', getSettings);
router.put('/booking-prefs/settings', updateSettings);
router.get('/booking-prefs/timezone', getTimezone);
router.put('/booking-prefs/timezone', updateTimezone);

// Calendar Sync
router.get('/calendar-sync/settings', getCalendarSyncSettings);

export default router;
