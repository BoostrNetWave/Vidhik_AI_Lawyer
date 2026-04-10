import { Request, Response } from 'express';
import Booking from '../models/Booking.js';
import Settings from '../models/Settings.js';
import { sendEmail } from '../utils/emailService.js';

export const createBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, clientName, email, serviceType, date, amount, notes } = req.body;

        // 1. Create the booking
        const newBooking = await Booking.create({
            userId,
            clientName,
            email,
            serviceType,
            date,
            amount: amount || 0,
            notes,
            status: 'pending'
        });

        // 2. Check User Settings for Email Notifications
        const settings = await Settings.findOne({ userId });

        if (settings && settings.notifications.newBooking) {
            // Send email to the LAWYER (supportEmail or hardcoded for now)
            const lawyerEmail = settings.general.supportEmail; // Or fetch User.email

            await sendEmail(
                lawyerEmail,
                `New Booking Received: ${clientName}`,
                `<p>You have a new booking from <strong>${clientName}</strong> for <strong>${serviceType}</strong> on <strong>${new Date(date).toLocaleString()}</strong>.</p>`
            );

            // Optional: Send confirmation to CLIENT
            await sendEmail(
                email,
                `Booking Confirmation: ${serviceType}`,
                `<p>Hi ${clientName}, your booking for <strong>${serviceType}</strong> on <strong>${new Date(date).toLocaleString()}</strong> is pending confirmation.</p>`
            );
        }

        res.status(201).json(newBooking);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAppointmentsHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        if (!userId) {
            res.status(400).json({ message: "userId is required" });
            return;
        }

        // Fetch bookings for this user, sorted by date desc
        const bookings = await Booking.find({ userId }).sort({ date: -1 });
        res.json(bookings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
