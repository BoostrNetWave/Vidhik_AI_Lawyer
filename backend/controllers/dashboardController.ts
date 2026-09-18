import { Response } from 'express';
import mongoose from 'mongoose';
import Case from '../models/Case.js';
import Blog from '../models/Blog.js';
import SupportTicket from '../models/SupportTicket.js';
import User from '../models/User.js';
import SystemConfig from '../models/SystemConfig.js';
import Booking from '../models/Booking.js';
import LiveConsultation from '../models/LiveConsultation.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

// Helper to construct all valid matching identifiers for the lawyer
const getLawyerMatchList = (lawyerId: string, userId?: string) => {
    const lawyerObjId = mongoose.Types.ObjectId.isValid(lawyerId) ? new mongoose.Types.ObjectId(lawyerId) : null;
    const list: any[] = [];
    if (lawyerObjId) list.push(lawyerObjId);
    if (lawyerId) list.push(lawyerId.toString());
    if (userId) list.push(userId);
    return { lawyerObjId, list };
};

export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const lawyerId = req.user.id;
        const userId = req.user.userId;
        const { list } = getLawyerMatchList(lawyerId, userId);

        // Fetch lawyer profile to determine subscription plan and commission
        const lawyerUser = await User.findOne({
            $or: [
                ...(mongoose.Types.ObjectId.isValid(lawyerId) ? [{ _id: new mongoose.Types.ObjectId(lawyerId) }] : []),
                ...(userId ? [{ userId }] : [])
            ]
        });

        const lawyerPlanName = lawyerUser ? (lawyerUser.subscription || 'Free') : 'Free';
        const plansConfig = await SystemConfig.findOne({ key: 'LAWYER_PRICING_PLANS' });
        let commissionPercent = 15; // Default fallback for Free
        if (plansConfig && Array.isArray(plansConfig.value)) {
            const plan = plansConfig.value.find(
                (p: any) => p.name.toLowerCase() === lawyerPlanName.toLowerCase()
            ) || plansConfig.value.find((p: any) => p.name.toLowerCase() === 'free');
            if (plan && plan.limits && plan.limits.commissionPercent !== undefined) {
                commissionPercent = Number(plan.limits.commissionPercent);
            }
        }

        // 1. Total Revenue Calculation (Cases + LiveConsultations + Bookings)
        const caseEarnings = await Case.aggregate([
            { $match: { lawyer: { $in: list }, status: { $in: ['active', 'completed'] } } },
            { $group: { _id: null, total: { $sum: '$totalFee' } } }
        ]);

        const bookingEarnings = await Booking.aggregate([
            { $match: { userId: { $in: [userId, lawyerId.toString()] }, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const liveConsultEarnings = await LiveConsultation.aggregate([
            { $match: { lawyer: { $in: list }, status: { $in: ['completed', 'scheduled'] } } },
            { $group: { _id: null, total: { $sum: '$totalFee' } } }
        ]);

        const grossEarnings = (caseEarnings[0]?.total || 0) + (bookingEarnings[0]?.total || 0) + (liveConsultEarnings[0]?.total || 0);
        const netEarnings = Math.round(grossEarnings * (1 - commissionPercent / 100));

        // 2. Pending Bookings (Awaiting confirmation / payment across all booking models)
        const pendingCases = await Case.countDocuments({
            lawyer: { $in: list },
            status: { $in: ['pending_lawyer', 'pending_payment'] }
        });

        const pendingBookings = await Booking.countDocuments({
            userId: { $in: [userId, lawyerId.toString()] },
            status: 'pending'
        });

        const pendingLiveConsults = await LiveConsultation.countDocuments({
            lawyer: { $in: list },
            status: { $in: ['pending_lawyer_approval', 'pending_user_approval', 'pending_payment'] }
        });

        const upcomingConsultations = pendingCases + pendingBookings + pendingLiveConsults;

        // 3. Published Content (Filtered by lawyer's authorId, userId, or author name)
        const blogAuthorCriteria: any[] = [
            ...(userId ? [{ authorId: userId }] : []),
            ...(lawyerId ? [{ authorId: lawyerId.toString() }] : [])
        ];
        if (lawyerUser?.fullName) {
            blogAuthorCriteria.push({ author: lawyerUser.fullName });
        }

        const blogFilter = blogAuthorCriteria.length > 0 ? { $or: blogAuthorCriteria } : {};
        const publishedBlogs = await Blog.countDocuments({ ...blogFilter, status: 'Published' });
        const draftBlogs = await Blog.countDocuments({ ...blogFilter, status: 'Draft' });

        // 4. Ticket Status (Filtered by lawyer's userId / id)
        const ticketUserIds = [userId, lawyerId.toString(), lawyerUser?.email].filter(Boolean);
        const ticketFilter = ticketUserIds.length > 0 ? { userId: { $in: ticketUserIds } } : {};
        const openTickets = await SupportTicket.countDocuments({ ...ticketFilter, status: 'Open' });
        const closedTickets = await SupportTicket.countDocuments({ ...ticketFilter, status: 'Closed' });
        const urgentTickets = await SupportTicket.countDocuments({ ...ticketFilter, status: 'Open', priority: 'Urgent' });

        // Calculate monthly earnings from current month
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const monthStart = new Date(currentYear, currentMonth, 1);
        const nextMonthStart = new Date(currentYear, currentMonth + 1, 1);

        const monthlyCaseEarnings = await Case.aggregate([
            {
                $match: {
                    lawyer: { $in: list },
                    status: { $in: ['active', 'completed'] },
                    createdAt: { $gte: monthStart, $lt: nextMonthStart }
                }
            },
            { $group: { _id: null, total: { $sum: '$totalFee' } } }
        ]);

        const monthlyBookingEarnings = await Booking.aggregate([
            {
                $match: {
                    userId: { $in: [userId, lawyerId.toString()] },
                    status: 'completed',
                    createdAt: { $gte: monthStart, $lt: nextMonthStart }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const monthlyGross = (monthlyCaseEarnings[0]?.total || 0) + (monthlyBookingEarnings[0]?.total || 0);
        const monthlyNet = Math.round(monthlyGross * (1 - commissionPercent / 100));

        // Calculate last month earnings
        const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);
        const lastMonthEnd = new Date(currentYear, currentMonth, 1);

        const lastMonthCaseEarnings = await Case.aggregate([
            {
                $match: {
                    lawyer: { $in: list },
                    status: { $in: ['active', 'completed'] },
                    createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd }
                }
            },
            { $group: { _id: null, total: { $sum: '$totalFee' } } }
        ]);

        const lastMonthBookingEarnings = await Booking.aggregate([
            {
                $match: {
                    userId: { $in: [userId, lawyerId.toString()] },
                    status: 'completed',
                    createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const lastMonthGross = (lastMonthCaseEarnings[0]?.total || 0) + (lastMonthBookingEarnings[0]?.total || 0);
        const lastMonthNet = Math.round(lastMonthGross * (1 - commissionPercent / 100));

        res.json({
            stats: {
                totalEarnings: netEarnings, // Net earnings to lawyer
                grossEarnings,
                commissionPercent,
                upcomingConsultations,
                publishedBlogs,
                draftBlogs,
                openTickets,
                closedTickets,
                urgentTickets,
                monthlyEarnings: monthlyNet,
                lastMonthEarnings: lastMonthNet
            }
        });
    } catch (error: any) {
        console.error('getStats error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getRevenue = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const lawyerId = req.user.id;
        const userId = req.user.userId;
        const { list } = getLawyerMatchList(lawyerId, userId);

        // Fetch lawyer profile to determine commission
        const lawyerUser = await User.findOne({
            $or: [
                ...(mongoose.Types.ObjectId.isValid(lawyerId) ? [{ _id: new mongoose.Types.ObjectId(lawyerId) }] : []),
                ...(userId ? [{ userId }] : [])
            ]
        });

        const lawyerPlanName = lawyerUser ? (lawyerUser.subscription || 'Free') : 'Free';
        const plansConfig = await SystemConfig.findOne({ key: 'LAWYER_PRICING_PLANS' });
        let commissionPercent = 15;
        if (plansConfig && Array.isArray(plansConfig.value)) {
            const plan = plansConfig.value.find(
                (p: any) => p.name.toLowerCase() === lawyerPlanName.toLowerCase()
            ) || plansConfig.value.find((p: any) => p.name.toLowerCase() === 'free');
            if (plan && plan.limits && plan.limits.commissionPercent !== undefined) {
                commissionPercent = Number(plan.limits.commissionPercent);
            }
        }

        // Group case earnings by month
        const caseRevenue = await Case.aggregate([
            { $match: { lawyer: { $in: list }, status: { $in: ['active', 'completed'] } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    grossEarnings: { $sum: "$totalFee" },
                    consultations: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const monthlyRevenue = caseRevenue.map(r => ({
            month: r._id,
            earnings: Math.round(r.grossEarnings * (1 - commissionPercent / 100)),
            consultations: r.consultations
        }));

        res.json({ monthlyRevenue });
    } catch (error: any) {
        console.error('getRevenue error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getServiceDistribution = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const lawyerId = req.user.id;
        const userId = req.user.userId;
        const { list } = getLawyerMatchList(lawyerId, userId);

        const distribution = await Case.aggregate([
            { $match: { lawyer: { $in: list } } },
            {
                $group: {
                    _id: "$title",
                    revenue: { $sum: "$totalFee" }
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
        console.error('getServiceDistribution error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const lawyerId = req.user.id;
        const userId = req.user.userId;
        const { list } = getLawyerMatchList(lawyerId, userId);

        // Fetch lawyer profile for commission
        const lawyerUser = await User.findOne({
            $or: [
                ...(mongoose.Types.ObjectId.isValid(lawyerId) ? [{ _id: new mongoose.Types.ObjectId(lawyerId) }] : []),
                ...(userId ? [{ userId }] : [])
            ]
        });

        const lawyerPlanName = lawyerUser ? (lawyerUser.subscription || 'Free') : 'Free';
        const plansConfig = await SystemConfig.findOne({ key: 'LAWYER_PRICING_PLANS' });
        let commissionPercent = 15;
        if (plansConfig && Array.isArray(plansConfig.value)) {
            const plan = plansConfig.value.find(
                (p: any) => p.name.toLowerCase() === lawyerPlanName.toLowerCase()
            ) || plansConfig.value.find((p: any) => p.name.toLowerCase() === 'free');
            if (plan && plan.limits && plan.limits.commissionPercent !== undefined) {
                commissionPercent = Number(plan.limits.commissionPercent);
            }
        }

        const cases = await Case.find({ lawyer: { $in: list } })
            .populate('client', 'fullName email')
            .sort({ createdAt: -1 })
            .limit(10);
            
        const recentTransactions = cases.map(c => ({
            _id: c._id,
            clientName: (c.client as any)?.fullName || 'Client',
            serviceType: c.title,
            date: c.bookingDate || c.createdAt,
            amount: Math.round(c.totalFee * (1 - commissionPercent / 100)),
            status: c.status === 'active' || c.status === 'completed' ? 'completed' : c.status === 'cancelled' ? 'cancelled' : 'pending'
        }));
        
        res.json({ recentTransactions });
    } catch (error: any) {
        console.error('getTransactions error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getSubscriptionStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const lawyerId = req.user.id;
        const userId = req.user.userId;

        const lawyerUser = await User.findById(lawyerId);
        if (!lawyerUser) {
            res.status(404).json({ message: 'Lawyer not found' });
            return;
        }

        const subscription = lawyerUser.subscription || 'Free';
        const plansConfig = await SystemConfig.findOne({ key: 'LAWYER_PRICING_PLANS' });
        const plans = plansConfig ? plansConfig.value : [];

        // Count current usage
        const activeCases = await Case.countDocuments({
            lawyer: lawyerId,
            status: { $in: ['active', 'pending_lawyer', 'pending_payment'] }
        });

        const now = new Date();
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const blogsThisWeek = await Blog.countDocuments({
            authorId: userId,
            createdAt: { $gte: startOfWeek }
        });

        // Current plan limits
        let activeCasesLimit = 5;
        let blogsPerWeekLimit = 2;
        let commissionPercent = 15;

        if (plansConfig && Array.isArray(plansConfig.value)) {
            const plan = plansConfig.value.find(
                (p: any) => p.name.toLowerCase() === subscription.toLowerCase()
            ) || plansConfig.value.find((p: any) => p.name.toLowerCase() === 'free');
            if (plan && plan.limits) {
                if (plan.limits.activeCases !== undefined) activeCasesLimit = Number(plan.limits.activeCases);
                if (plan.limits.blogsPerWeek !== undefined) blogsPerWeekLimit = Number(plan.limits.blogsPerWeek);
                if (plan.limits.commissionPercent !== undefined) commissionPercent = Number(plan.limits.commissionPercent);
            }
        }

        res.json({
            success: true,
            data: {
                subscription,
                plans,
                usage: {
                    activeCases,
                    blogsThisWeek
                },
                limits: {
                    activeCases: activeCasesLimit,
                    blogsPerWeek: blogsPerWeekLimit,
                    commissionPercent
                }
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
