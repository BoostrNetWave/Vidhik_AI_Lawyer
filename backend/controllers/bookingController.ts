import { Request, Response } from 'express';
import BookingPrefs from '../models/BookingPrefs.js';

// Helper to get or create prefs
const getPrefs = async (userId: string) => {
    let prefs = await BookingPrefs.findOne({ userId });
    if (!prefs) {
        prefs = await BookingPrefs.create({
            userId,
            slots: [],
            blackouts: [],
            workingHours: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
            settings: { sessionDurations: [30, 60] },
            timezone: 'UTC',
            calendarSync: { googleEnabled: false, outlookEnabled: false }
        });
    }
    return prefs;
};

export const getAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        if (!userId) {
            res.status(400).json({ message: "userId is required" });
            return;
        }

        const prefs = await getPrefs(userId as string);
        res.json({
            slotsSummary: { slots: prefs.slots },
            blackoutsUpcoming: prefs.blackouts
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const addSlot = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        const { recurringSlots } = req.body; // Expects array of slots

        if (!userId) {
            res.status(400).json({ message: "userId is required" });
            return;
        }

        const prefs = await getPrefs(userId as string);

        if (recurringSlots && Array.isArray(recurringSlots)) {
            prefs.slots.push(...recurringSlots);
        }

        await prefs.save();
        res.json(prefs.slots);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const addBlackout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        const { dateRange, reason } = req.body;

        if (!userId) {
            res.status(400).json({ message: "userId is required" });
            return;
        }

        const prefs = await getPrefs(userId as string);

        if (dateRange && dateRange.start && dateRange.end) {
            prefs.blackouts.push({
                start: new Date(dateRange.start),
                end: new Date(dateRange.end),
                reason
            });
        }

        await prefs.save();
        res.json(prefs.blackouts);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};



export const deleteSlot = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        const { index } = req.body;

        if (!userId) {
            res.status(400).json({ message: "userId is required" });
            return;
        }

        const prefs = await getPrefs(userId as string);

        if (index >= 0 && index < prefs.slots.length) {
            prefs.slots.splice(index, 1);
            await prefs.save();
        }

        res.json(prefs.slots);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteBlackout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        const { index } = req.body;

        if (!userId) {
            res.status(400).json({ message: "userId is required" });
            return;
        }

        const prefs = await getPrefs(userId as string);

        if (index >= 0 && index < prefs.blackouts.length) {
            prefs.blackouts.splice(index, 1);
            await prefs.save();
        }

        res.json(prefs.blackouts);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getHours = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        if (!userId) {
            res.status(400).json({ message: "userId is required" });
            return;
        }
        const prefs = await getPrefs(userId as string);
        res.json({
            weekly: prefs.workingHours,
            updatedAt: (prefs as any).updatedAt
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        if (!userId) {
            res.status(400).json({ message: "userId is required" });
            return;
        }
        const prefs = await getPrefs(userId as string);
        res.json(prefs.settings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTimezone = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        if (!userId) {
            res.status(400).json({ message: "userId is required" });
            return;
        }
        const prefs = await getPrefs(userId as string);
        res.json({ timezone: prefs.timezone });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateTimezone = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        const { timezone } = req.body;

        if (!userId) {
            res.status(400).json({ message: "userId is required" });
            return;
        }

        const prefs = await getPrefs(userId as string);
        prefs.timezone = timezone || 'UTC';
        await prefs.save();

        res.json({ timezone: prefs.timezone });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCalendarSyncSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        if (!userId) {
            res.status(400).json({ message: "userId is required" });
            return;
        }
        const prefs = await getPrefs(userId as string);
        res.json(prefs.calendarSync);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        if (!userId) {
            res.status(400).json({ message: "userId is required" });
            return;
        }
        const prefs = await getPrefs(userId as string);

        // Merge updates
        if (req.body) {
            const updates = req.body;
            // Ensure sessionDurations are numbers
            if (updates.sessionDurations) {
                updates.sessionDurations = updates.sessionDurations.map((d: any) => Number(d)).filter((n: number) => !isNaN(n));
            }
            // Ensure approval object is properly structured
            if (updates.approval) {
                updates.approval = {
                    manual: Boolean(updates.approval.manual),
                    autoConfirm: Boolean(updates.approval.autoConfirm)
                };
            }


            // Safe update of settings fields
            if (updates.sessionDurations) prefs.settings.sessionDurations = updates.sessionDurations;
            if (updates.bufferMins !== undefined) prefs.settings.bufferMins = updates.bufferMins;
            if (updates.minNoticeMins !== undefined) prefs.settings.minNoticeMins = updates.minNoticeMins;
            if (updates.maxDailyBookings !== undefined) prefs.settings.maxDailyBookings = updates.maxDailyBookings;
            if (updates.advanceWindowDays !== undefined) prefs.settings.advanceWindowDays = updates.advanceWindowDays;

            if (updates.approval) {
                prefs.settings.approval = {
                    manual: Boolean(updates.approval.manual),
                    autoConfirm: Boolean(updates.approval.autoConfirm)
                };
            }

        }

        await prefs.save();
        res.json(prefs.settings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateHours = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        if (!userId) {
            res.status(400).json({ message: "userId is required" });
            return;
        }

        const prefs = await getPrefs(userId as string);

        if (req.body && req.body.weekly) {
            prefs.workingHours = req.body.weekly;
            // Mark as modified if necessary
            prefs.markModified('workingHours');
        }

        (prefs as any).updatedAt = new Date();

        await prefs.save();
        res.json({ weekly: prefs.workingHours, updatedAt: (prefs as any).updatedAt });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
