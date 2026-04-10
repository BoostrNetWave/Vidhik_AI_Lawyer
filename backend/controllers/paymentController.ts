import { Response } from 'express';
import Booking from '../models/Booking.js';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const getPaymentSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user.userId;

        const totalEarningsResult = await Booking.aggregate([
            { $match: { userId, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const totalEarnings = totalEarningsResult[0]?.total || 0;

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
            totalEarnings,
            monthlyEarnings,
            lastMonthEarnings
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPaymentHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;
        const status = req.query.status as string;
        const search = req.query.q as string;

        let query: any = { userId };

        // Filter by status if provided and not 'all'
        if (status && status !== 'all') {
            if (status === 'succeeded') query.status = 'completed';
            else if (status === 'failed') query.status = 'cancelled';
            else query.status = status;
        }

        // Search logic (Client Name or ID)
        if (search) {
            query.$or = [
                { clientName: { $regex: search, $options: 'i' } },
                { _id: mongoose.isValidObjectId(search) ? search : null }
            ].filter(c => c._id !== null || c.clientName);
        }

        const total = await Booking.countDocuments(query);
        const bookings = await Booking.find(query)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        // Map Booking to PaymentTransaction format expected by frontend
        const transactions = bookings.map(b => ({
            _id: b._id,
            razorpayOrderId: `ORD-${b._id.toString().slice(-6)}`, // Simulated Order ID
            paymentId: `PAY-${b._id.toString().slice(-6)}`,     // Simulated Payment ID
            method: 'UPI', 
            date: b.date,
            amount: b.amount,
            status: b.status === 'completed' ? 'succeeded' : b.status === 'cancelled' ? 'failed' : 'pending',
            clientName: b.clientName,
            serviceType: b.serviceType,
            duration: b.duration || 60,
            userId: { fullName: b.clientName } 
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
        const userId = req.user.userId;
        
        // Ensure the lawyer owns this booking before approving
        const booking = await Booking.findOneAndUpdate(
            { _id: id, userId },
            { status: 'completed' },
            { new: true }
        );

        if (!booking) {
            res.status(404).json({ message: 'Transaction not found or not owned by you' });
            return;
        }

        res.json({ message: 'Payment approved successfully', status: 'succeeded' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
