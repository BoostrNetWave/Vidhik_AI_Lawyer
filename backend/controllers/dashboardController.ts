import { Response } from 'express';
import mongoose from 'mongoose';
import Case from '../models/Case.js';
import Blog from '../models/Blog.js';
import SupportTicket from '../models/SupportTicket.js';
import User from '../models/User.js';
import SystemConfig from '../models/SystemConfig.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const lawyerId = req.user.id;
        const userId = req.user.userId; // string userId for support tickets

        // Fetch lawyer profile to determine subscription plan and commission
        const lawyerUser = await User.findById(lawyerId);
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

        const totalEarnings = await Case.aggregate([
            { $match: { lawyer: new mongoose.Types.ObjectId(lawyerId), status: { $in: ['active', 'completed'] } } },
            { $group: { _id: null, total: { $sum: '$totalFee' } } }
        ]);

        const grossEarnings = totalEarnings[0]?.total || 0;
        const netEarnings = grossEarnings * (1 - commissionPercent / 100);

        const upcomingConsultations = await Case.countDocuments({
            lawyer: lawyerId,
            status: { $in: ['pending_lawyer', 'pending_payment'] }
        });

        // Blogs and Tickets are filtered by lawyer (user)
        const publishedBlogs = await Blog.countDocuments({ authorId: userId, status: 'Published' });
        const draftBlogs = await Blog.countDocuments({ authorId: userId, status: 'Draft' });

        const openTickets = await SupportTicket.countDocuments({ userId, status: 'Open' });
        const closedTickets = await SupportTicket.countDocuments({ userId, status: 'Closed' });
        const urgentTickets = await SupportTicket.countDocuments({ userId, status: 'Open', priority: 'Urgent' });

        // Calculate monthly earnings from active/completed cases in the current month (based on createdAt)
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();

        const monthlyEarningsResult = await Case.aggregate([
            {
                $match: {
                    lawyer: new mongoose.Types.ObjectId(lawyerId),
                    status: { $in: ['active', 'completed'] },
                    createdAt: {
                        $gte: new Date(currentYear, currentMonth, 1),
                        $lt: new Date(currentYear, currentMonth + 1, 1)
                    }
                }
            },
            { $group: { _id: null, total: { $sum: '$totalFee' } } }
        ]);
        const monthlyGross = monthlyEarningsResult[0]?.total || 0;
        const monthlyNet = monthlyGross * (1 - commissionPercent / 100);

        // Calculate last month earnings
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        const lastMonthNextDate = new Date(currentYear, currentMonth, 1);

        const lastMonthEarningsResult = await Case.aggregate([
            {
                $match: {
                    lawyer: new mongoose.Types.ObjectId(lawyerId),
                    status: { $in: ['active', 'completed'] },
                    createdAt: {
                        $gte: lastMonthDate,
                        $lt: lastMonthNextDate
                    }
                }
            },
            { $group: { _id: null, total: { $sum: '$totalFee' } } }
        ]);
        const lastMonthGross = lastMonthEarningsResult[0]?.total || 0;
        const lastMonthNet = lastMonthGross * (1 - commissionPercent / 100);

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
        res.status(500).json({ message: error.message });
    }
};

export const getRevenue = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const lawyerId = req.user.id;
        // Group earnings by month
        const revenue = await Case.aggregate([
            { $match: { lawyer: new mongoose.Types.ObjectId(lawyerId), status: { $in: ['active', 'completed'] } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    earnings: { $sum: "$totalFee" },
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
        const lawyerId = req.user.id;
        const distribution = await Case.aggregate([
            { $match: { lawyer: new mongoose.Types.ObjectId(lawyerId) } },
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
        res.status(500).json({ message: error.message });
    }
};

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const lawyerId = req.user.id;
        const cases = await Case.find({ lawyer: lawyerId })
            .populate('client', 'fullName email')
            .sort({ createdAt: -1 })
            .limit(10);
            
        const recentTransactions = cases.map(c => ({
            _id: c._id,
            clientName: (c.client as any)?.fullName || 'Client',
            serviceType: c.title,
            date: c.bookingDate || c.createdAt,
            amount: c.totalFee,
            status: c.status === 'active' || c.status === 'completed' ? 'completed' : c.status === 'cancelled' ? 'cancelled' : 'pending'
        }));
        
        res.json({ recentTransactions });
    } catch (error: any) {
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
