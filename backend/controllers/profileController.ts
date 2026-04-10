import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User.js';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        let user = await User.findOne({ userId });

        if (!user) {
            res.status(404).json({ message: 'User profile not found' });
            return;
        }

        res.json(user);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const user = await User.findOneAndUpdate(
            { userId },
            { $set: req.body },
            { new: true }
        );
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getPayouts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ userId });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Returning bank info as payouts data for now
        res.json({
            bankName: user.bankName,
            accountNumber: user.accountNumber,
            ifsc: user.ifsc
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updatePayouts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.body;
        const user = await User.findOneAndUpdate(
            { userId },
            {
                $set: {
                    bankName: req.body.bankName,
                    accountNumber: req.body.accountNumber,
                    ifsc: req.body.ifsc
                }
            },
            { new: true, upsert: true }
        );
        res.json(user);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }

        const { userId } = req.body;
        const avatarUrl = `/uploads/${req.file.filename}`;

        // Update user with new avatar URL
        await User.findOneAndUpdate(
            { userId },
            { $set: { avatar: avatarUrl } },
            { upsert: true }
        );

        res.json({ avatarUrl });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};



export const updatePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword || newPassword.length < 6) {
            res.status(400).json({ message: 'Current password is required and new password must be at least 6 characters' });
            return;
        }

        const user = await User.findOne({ userId });
        if (!user || !user.password) {
            console.log("User not found or password missing for ID:", userId);
            res.status(404).json({ message: 'User not found or password not set' });
            return;
        }

        console.log("Input Current Password:", currentPassword);
        console.log("Stored Hash:", user.password);

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        console.log("Password Match Result:", isMatch);

        if (!isMatch) {
            res.status(400).json({ message: 'Incorrect current password' });
            return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.findOneAndUpdate(
            { userId },
            { $set: { password: hashedPassword } },
            { new: true }
        );

        res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
