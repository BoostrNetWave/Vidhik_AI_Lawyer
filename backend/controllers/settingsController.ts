import { Request, Response } from 'express';
import Settings from '../models/Settings.js';

export const getSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        let settings = await Settings.findOne({ userId });

        if (!settings) {
            // Return defaults if not found, but don't save yet to avoid junk data? 
            // Actually, for settings, it's often nicer to upsert or just return default structure.
            // Let's return the default structure defined in the schema (or frontend defaults).
            // Or better, let's just return a default JSON if null.
            res.json({
                userId,
                general: {
                    siteName: "Vidhik AI",
                    supportEmail: "support@vidhik.ai",
                    contactPhone: "+91 98765 43210",
                    address: "Legal Tower, MG Road, Bangalore, India"
                },
                notifications: {
                    newBooking: true,
                    paymentSuccess: true,
                    systemUpdates: false,
                    marketingEmails: false
                }
            });
            return;
        }

        res.json(settings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        // Using FindOneAndUpdate with upsert to handle both create and update
        const settings = await Settings.findOneAndUpdate(
            { userId },
            { $set: req.body },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        res.json(settings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
