import { Response } from 'express';
import Notification, { INotification } from '../models/Notification.js';
import Case from '../models/Case.js';
import LiveConsultation from '../models/LiveConsultation.js';
import Booking from '../models/Booking.js';
import SupportTicket from '../models/SupportTicket.js';

/**
 * Creates and saves a notification for lawyer
 */
export const createNotification = async (payload: {
    userId: string;
    userRole?: 'user' | 'lawyer' | 'admin';
    title: string;
    message: string;
    type: 'case' | 'consultation' | 'credit' | 'support' | 'system';
    link?: string;
    metadata?: Record<string, any>;
}): Promise<INotification | null> => {
    try {
        const notif = await Notification.create({
            userId: payload.userId.toString(),
            userRole: payload.userRole || 'lawyer',
            title: payload.title,
            message: payload.message,
            type: payload.type,
            link: payload.link || '',
            metadata: payload.metadata || {},
            read: false
        });

        return notif;
    } catch (err) {
        console.error('[Lawyer Notification] Error creating notification:', err);
        return null;
    }
};

/**
 * Get all notifications for the authenticated lawyer.
 * Synchronizes real activity from Cases, Consultations, Bookings, and Support.
 */
export const getNotifications = async (req: any, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId || req.user?._id?.toString() || req.user?.id;
        const userEmail = req.user?.email;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        let stored = await Notification.find({
            $or: [{ userId }, { userId: userEmail }]
        }).sort({ createdAt: -1 }).limit(50);

        // If stored notifications are few, auto-sync from real cases, consultations & bookings
        if (stored.length < 5) {
            const syncedNotifs: any[] = [];

            // A. Cases
            const lawyerCases = await Case.find({
                $or: [{ lawyerId: userId }, { lawyerEmail: userEmail }]
            }).sort({ updatedAt: -1 }).limit(5);

            for (const c of lawyerCases) {
                const caseId = c._id.toString();
                const exists = stored.some(n => n.metadata?.caseId === caseId);
                if (!exists) {
                    const activeMilestone = c.milestones?.find((m: any) => m.status === 'in_progress' || (m.status as any) === 'under_review');
                    const clientDisplay = (c as any).client?.fullName || (c as any).client?.email || (c as any).clientName || 'Client';
                    syncedNotifs.push({
                        userId,
                        userRole: 'lawyer',
                        title: `Case: ${c.title || 'Legal Case'}`,
                        message: activeMilestone
                            ? `Milestone "${activeMilestone.title}" is ${activeMilestone.status.replace('_', ' ')}. Total Fee: ₹${(c.totalFee || 0).toLocaleString('en-IN')}.`
                            : `Case with client ${clientDisplay} is ${c.status || 'Active'}.`,
                        type: 'case',
                        link: '/cases',
                        metadata: { caseId },
                        read: false,
                        createdAt: c.updatedAt || c.createdAt || new Date()
                    });
                }
            }

            // B. Live Consultations
            const consultations = await LiveConsultation.find({
                lawyer: userId
            }).sort({ updatedAt: -1 }).limit(5);

            for (const consult of consultations) {
                const consultId = consult._id.toString();
                const exists = stored.some(n => n.metadata?.consultationId === consultId);
                if (!exists) {
                    const clientName = (consult.client as any)?.fullName || 'Client';
                    const isLive = (consult.status as string) === 'in-progress' || (consult.status as string) === 'in_progress';
                    syncedNotifs.push({
                        userId,
                        userRole: 'lawyer',
                        title: `Live Consultation: ${consult.title || 'Client Session'}`,
                        message: isLive
                            ? `Video consultation with ${clientName} is currently LIVE. Join now!`
                            : `Consultation with ${clientName} scheduled for ${consult.scheduledTime || 'Upcoming'}.`,
                        type: 'consultation',
                        link: `/consultation-room/${consultId}`,
                        metadata: { consultationId: consultId },
                        read: false,
                        createdAt: consult.updatedAt || consult.createdAt || new Date()
                    });
                }
            }

            // C. Bookings / Appointments
            const bookings = await Booking.find({
                $or: [{ userId }, { email: userEmail }]
            }).sort({ createdAt: -1 }).limit(5);

            for (const b of bookings) {
                const bookingId = b._id.toString();
                const exists = stored.some(n => n.metadata?.bookingId === bookingId);
                if (!exists) {
                    syncedNotifs.push({
                        userId,
                        userRole: 'lawyer',
                        title: `Booking: ${b.clientName || 'New Client'}`,
                        message: `Service: ${b.serviceType || 'Legal Advice'}. Fee: ₹${(b.amount || 0).toLocaleString('en-IN')}. Status: ${b.status || 'Pending'}.`,
                        type: 'consultation',
                        link: '/bookings',
                        metadata: { bookingId },
                        read: b.status === 'completed',
                        createdAt: b.date || b.createdAt || new Date()
                    });
                }
            }

            // D. Support Tickets
            const tickets = await SupportTicket.find({
                userId
            }).sort({ updatedAt: -1 }).limit(3);

            for (const ticket of tickets) {
                const ticketId = ticket._id.toString();
                const exists = stored.some(n => n.metadata?.ticketId === ticketId);
                if (!exists) {
                    syncedNotifs.push({
                        userId,
                        userRole: 'lawyer',
                        title: `Support Ticket #${ticket.ticketId || ticketId.slice(-6)}`,
                        message: `Ticket "${ticket.subject}" status: ${ticket.status}.`,
                        type: 'support',
                        link: '/support',
                        metadata: { ticketId },
                        read: ticket.status === 'Closed',
                        createdAt: ticket.updatedAt || ticket.createdAt || new Date()
                    });
                }
            }

            if (syncedNotifs.length > 0) {
                await Notification.insertMany(syncedNotifs);
                stored = await Notification.find({
                    $or: [{ userId }, { userId: userEmail }]
                }).sort({ createdAt: -1 }).limit(50);
            }
        }

        const unreadCount = stored.filter(n => !n.read).length;

        res.json({
            success: true,
            count: stored.length,
            unreadCount,
            notifications: stored
        });
    } catch (error: any) {
        console.error('[Lawyer Notification Controller] getNotifications error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Mark a single notification as read
 */
export const markAsRead = async (req: any, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId || req.user?._id?.toString() || req.user?.id;

        const notif = await Notification.findOneAndUpdate(
            { _id: id, userId },
            { read: true },
            { new: true }
        );

        if (!notif) {
            res.status(404).json({ success: false, message: 'Notification not found' });
            return;
        }

        res.json({ success: true, notification: notif });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Mark all notifications as read for lawyer
 */
export const markAllAsRead = async (req: any, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId || req.user?._id?.toString() || req.user?.id;
        const userEmail = req.user?.email;

        await Notification.updateMany(
            { $or: [{ userId }, { userId: userEmail }], read: false },
            { read: true }
        );

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (req: any, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId || req.user?._id?.toString() || req.user?.id;

        await Notification.findOneAndDelete({ _id: id, userId });
        res.json({ success: true, message: 'Notification deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
