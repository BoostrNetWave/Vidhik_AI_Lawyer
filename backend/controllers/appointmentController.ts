import { Request, Response } from 'express';
import User from '../models/User.js';
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

        // 2. Fetch Lawyer user and Settings for Email Notifications
        const [lawyer, settings] = await Promise.all([
            User.findById(userId),
            Settings.findOne({ userId })
        ]);

        const lawyerEmail = settings?.general?.supportEmail || lawyer?.email;
        const lawyerName = lawyer?.fullName || 'Advocate';
        const formattedDate = new Date(date).toLocaleString('en-IN');

        const emailPromises: Promise<any>[] = [];

        // Send to LAWYER unless explicitly turned off
        const notifyLawyer = settings?.notifications?.newBooking !== false;
        if (notifyLawyer && lawyerEmail) {
            emailPromises.push(
                sendEmail(
                    lawyerEmail,
                    `New Booking Received: ${clientName} - ${serviceType}`,
                    `<h2 style="color: #1e1b4b; margin-top: 0;">New Appointment Booking Received</h2>
                     <p>Hello <strong>Adv. ${lawyerName}</strong>,</p>
                     <p>You have received a new consultation appointment booking from <strong>${clientName}</strong>.</p>
                     <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; border-radius: 4px; margin: 20px 0;">
                         <p style="margin: 0 0 8px 0;"><strong>Client Name:</strong> ${clientName}</p>
                         <p style="margin: 0 0 8px 0;"><strong>Client Email:</strong> ${email}</p>
                         <p style="margin: 0 0 8px 0;"><strong>Service:</strong> ${serviceType}</p>
                         <p style="margin: 0 0 8px 0;"><strong>Scheduled Time:</strong> ${formattedDate}</p>
                         ${amount ? `<p style="margin: 0 0 8px 0;"><strong>Fee:</strong> ₹${Number(amount).toLocaleString('en-IN')}</p>` : ''}
                         ${notes ? `<p style="margin: 0;"><strong>Notes:</strong> ${notes}</p>` : ''}
                     </div>
                     <p>Please log in to your Lawyer Admin Portal under Appointments to view details and manage this session.</p>`
                )
            );
        }

        // Send confirmation to CLIENT
        if (email) {
            emailPromises.push(
                sendEmail(
                    email,
                    `Booking Confirmation: ${serviceType}`,
                    `<h2 style="color: #1e1b4b; margin-top: 0;">Appointment Booking Received</h2>
                     <p>Hello <strong>${clientName}</strong>,</p>
                     <p>Your appointment booking for <strong>${serviceType}</strong> with <strong>Adv. ${lawyerName}</strong> has been received and is pending confirmation.</p>
                     <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 16px; border-radius: 4px; margin: 20px 0;">
                         <p style="margin: 0 0 8px 0;"><strong>Service:</strong> ${serviceType}</p>
                         <p style="margin: 0 0 8px 0;"><strong>Date & Time:</strong> ${formattedDate}</p>
                         <p style="margin: 0 0 8px 0;"><strong>Advocate:</strong> Adv. ${lawyerName}</p>
                         ${amount ? `<p style="margin: 0;"><strong>Amount:</strong> ₹${Number(amount).toLocaleString('en-IN')}</p>` : ''}
                     </div>
                     <p>You will be notified once your appointment is confirmed. Thank you for choosing Vidhik AI!</p>`
                )
            );
        }

        await Promise.allSettled(emailPromises);

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
