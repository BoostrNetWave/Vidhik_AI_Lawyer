import { Response } from 'express';
import Booking from '../models/Booking.js';
import Blog from '../models/Blog.js';
import SupportTicket from '../models/SupportTicket.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user.userId;

        const totalEarnings = await Booking.aggregate([
            { $match: { userId, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const upcomingConsultations = await Booking.countDocuments({
            userId,
            status: 'pending',
            date: { $gte: new Date() }
        });

        // Blogs and Tickets also need to be filtered by lawyer (user)
        const publishedBlogs = await Blog.countDocuments({ status: 'Published' });
        const draftBlogs = await Blog.countDocuments({ status: 'Draft' });

        const openTickets = await SupportTicket.countDocuments({ userId, status: 'Open' });
        const closedTickets = await SupportTicket.countDocuments({ userId, status: 'Closed' });
        const urgentTickets = await SupportTicket.countDocuments({ userId, status: 'Open', priority: 'Urgent' });

        // Calculate monthly earnings from completed bookings in the current month (based on Service Date)
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();

        const monthlyEarningsResult = await Booking.aggregate([
            {
                $match: {
                    userId,
                    status: 'completed',
                    date: {
                        $gte: new Date(currentYear, currentMonth, 1),
                        $lt: new Date(currentYear, currentMonth + 1, 1)
                    }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const monthlyEarnings = monthlyEarningsResult[0]?.total || 0;

        // Calculate last month earnings
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        const lastMonthNextDate = new Date(currentYear, currentMonth, 1);

        const lastMonthEarningsResult = await Booking.aggregate([
            {
                $match: {
                    userId,
                    status: 'completed',
                    date: {
                        $gte: lastMonthDate,
                        $lt: lastMonthNextDate
                    }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const lastMonthEarnings = lastMonthEarningsResult[0]?.total || 0;

        res.json({
            stats: {
                totalEarnings: totalEarnings[0]?.total || 0,
                upcomingConsultations,
                publishedBlogs,
                draftBlogs,
                openTickets,
                closedTickets,
                urgentTickets,
                monthlyEarnings,
                lastMonthEarnings
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getRevenue = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user.userId;
        // Group earnings by month
        const revenue = await Booking.aggregate([
            { $match: { userId, status: 'completed' } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
                    earnings: { $sum: "$amount" },
                    consultations: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } },
            {
                $project: {
                    _id: 0,
                    month: "$_id",
                    earnings: 1,
                    consultations: 1
                }
            }
        ]);

        res.json({ monthlyRevenue: revenue });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getServiceDistribution = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user.userId;
        const distribution = await Booking.aggregate([
            { $match: { userId } },
            {
                $group: {
                    _id: "$serviceType",
                    revenue: { $sum: "$amount" }
                }
            },
            {
                $project: {
                    _id: 0,
                    serviceType: "$_id",
                    revenue: 1
                }
            }
        ]);
        res.json({ serviceDistribution: distribution });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user.userId;
        const recentTransactions = await Booking.find({ userId })
            .sort({ createdAt: -1 })
            .limit(10);
        res.json({ recentTransactions });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
