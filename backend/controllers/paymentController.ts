import { Response } from 'express';
import Case from '../models/Case.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import SystemConfig from '../models/SystemConfig.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const getPaymentSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const lawyerId = req.user.id;

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

        const totalEarningsResult = await Case.aggregate([
            { $match: { lawyer: new mongoose.Types.ObjectId(lawyerId), status: { $in: ['active', 'completed'] } } },
            { $group: { _id: null, total: { $sum: '$totalFee' } } }
        ]);

        const totalGross = totalEarningsResult[0]?.total || 0;
        const totalEarnings = totalGross * (1 - commissionPercent / 100);

        // Calculate monthly earnings from completed/active cases in the current month (based on createdAt)
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
        const monthlyEarnings = monthlyGross * (1 - commissionPercent / 100);

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
        const lastMonthEarnings = lastMonthGross * (1 - commissionPercent / 100);

        res.json({
            totalEarnings,
            monthlyEarnings,
            lastMonthEarnings,
            commissionPercent
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPaymentHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const lawyerId = req.user.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;
        const status = req.query.status as string;
        const search = req.query.q as string;

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

        let query: any = { lawyer: lawyerId };

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
