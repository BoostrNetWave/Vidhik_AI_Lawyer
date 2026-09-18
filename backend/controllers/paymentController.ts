import { Response } from 'express';
import Case from '../models/Case.js';
import mongoose from 'mongoose';
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

export const getPaymentSummary = async (req: AuthRequest, res: Response): Promise<void> => {
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

        const totalEarningsResult = await Case.aggregate([
            { $match: { lawyer: { $in: list }, status: { $in: ['active', 'completed'] } } },
            { $group: { _id: null, total: { $sum: '$totalFee' } } }
        ]);

        const bookingEarningsResult = await Booking.aggregate([
            { $match: { userId: { $in: [userId, lawyerId.toString()] }, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const liveConsultEarnings = await LiveConsultation.aggregate([
            { $match: { lawyer: { $in: list }, status: { $in: ['completed', 'scheduled'] } } },
            { $group: { _id: null, total: { $sum: '$totalFee' } } }
        ]);

        const totalGross = (totalEarningsResult[0]?.total || 0) + (bookingEarningsResult[0]?.total || 0) + (liveConsultEarnings[0]?.total || 0);
        const totalEarnings = Math.round(totalGross * (1 - commissionPercent / 100));

        // Calculate monthly earnings from completed/active cases in the current month
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const monthStart = new Date(currentYear, currentMonth, 1);
        const nextMonthStart = new Date(currentYear, currentMonth + 1, 1);

        const monthlyEarningsResult = await Case.aggregate([
            {
                $match: {
                    lawyer: { $in: list },
                    status: { $in: ['active', 'completed'] },
                    createdAt: { $gte: monthStart, $lt: nextMonthStart }
                }
            },
            { $group: { _id: null, total: { $sum: '$totalFee' } } }
        ]);

        const monthlyBookingResult = await Booking.aggregate([
            {
                $match: {
                    userId: { $in: [userId, lawyerId.toString()] },
                    status: 'completed',
                    createdAt: { $gte: monthStart, $lt: nextMonthStart }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const monthlyGross = (monthlyEarningsResult[0]?.total || 0) + (monthlyBookingResult[0]?.total || 0);
        const monthlyEarnings = Math.round(monthlyGross * (1 - commissionPercent / 100));

        // Calculate last month earnings
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        const lastMonthNextDate = new Date(currentYear, currentMonth, 1);

        const lastMonthEarningsResult = await Case.aggregate([
            {
                $match: {
                    lawyer: { $in: list },
                    status: { $in: ['active', 'completed'] },
                    createdAt: { $gte: lastMonthDate, $lt: lastMonthNextDate }
                }
            },
            { $group: { _id: null, total: { $sum: '$totalFee' } } }
        ]);

        const lastMonthBookingResult = await Booking.aggregate([
            {
                $match: {
                    userId: { $in: [userId, lawyerId.toString()] },
                    status: 'completed',
                    createdAt: { $gte: lastMonthDate, $lt: lastMonthNextDate }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const lastMonthGross = (lastMonthEarningsResult[0]?.total || 0) + (lastMonthBookingResult[0]?.total || 0);
        const lastMonthEarnings = Math.round(lastMonthGross * (1 - commissionPercent / 100));

        res.json({
            totalEarnings,
            monthlyEarnings,
            lastMonthEarnings,
            commissionPercent
        });
    } catch (error: any) {
        console.error('getPaymentSummary error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getPaymentHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const lawyerId = req.user.id;
        const userId = req.user.userId;
        const { list } = getLawyerMatchList(lawyerId, userId);
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;
        const status = req.query.status as string;
        const search = req.query.q as string;

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

        let query: any = { lawyer: { $in: list } };

        // Filter by status if provided and not 'all'
        if (status && status !== 'all') {
            if (status === 'succeeded') {
                query.status = { $in: ['active', 'completed'] };
            } else if (status === 'failed') {
                query.status = 'cancelled';
            } else if (status === 'pending') {
                query.status = { $in: ['pending_lawyer', 'pending_payment'] };
            } else {
                query.status = status;
            }
        }

        // Search logic (Case Title or ID)
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { _id: mongoose.isValidObjectId(search) ? search : null }
            ].filter(c => c._id !== null || c.title);
        }

        const total = await Case.countDocuments(query);
        const bookings = await Case.find(query)
            .populate('client', 'fullName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Map Case to PaymentTransaction format expected by frontend
        const transactions = bookings.map(b => ({
            _id: b._id,
            razorpayOrderId: `ORD-${b._id.toString().slice(-6)}`, // Simulated Order ID
            paymentId: `PAY-${b._id.toString().slice(-6)}`,     // Simulated Payment ID
            method: 'UPI', 
            date: b.bookingDate || b.createdAt,
            amount: b.totalFee * (1 - commissionPercent / 100), // Net amount
            status: b.status === 'active' || b.status === 'completed' ? 'succeeded' : b.status === 'cancelled' ? 'failed' : 'pending',
            clientName: (b.client as any)?.fullName || 'Client',
            serviceType: b.title,
            duration: 60,
            userId: { fullName: (b.client as any)?.fullName || 'Client' } 
        }));

        res.json({
            data: transactions,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const approvePayment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const lawyerId = req.user.id;
        
        const kase = await Case.findOne({ _id: id, lawyer: lawyerId });
        if (!kase) {
            res.status(404).json({ message: 'Transaction not found or not owned by you' });
            return;
        }

        if (kase.status === 'pending_payment' || kase.status === 'pending_lawyer') {
            kase.status = 'active';
        } else {
            kase.status = 'completed';
        }

        await kase.save();

        res.json({ message: 'Payment approved successfully', status: 'succeeded' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
