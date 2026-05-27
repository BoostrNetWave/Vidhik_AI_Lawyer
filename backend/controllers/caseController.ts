import { Response } from 'express';
import Case from '../models/Case.js';
import User from '../models/User.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const getCases = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const cases = await Case.find({ lawyer: req.user.id })
            .populate('client', 'fullName email phone location')
            .sort({ createdAt: -1 });
        res.json(cases);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCaseById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const kase = await Case.findOne({ _id: id, lawyer: req.user.id })
            .populate('client', 'fullName email phone location');
        
        if (!kase) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }
        res.json(kase);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createCase = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { clientEmail, title, description, totalFee } = req.body;

        if (!clientEmail || !title || !description || !totalFee) {
            res.status(400).json({ message: 'All fields are required' });
            return;
        }

        const clientUser = await User.findOne({ email: clientEmail.toLowerCase().trim(), role: 'user' });
        if (!clientUser) {
            res.status(404).json({ 
                message: 'Client not found with this email. Please check the spelling or ensure the client is registered.' 
            });
            return;
        }

        const newCase = await Case.create({
            title,
            description,
            client: clientUser._id,
            lawyer: req.user.id,
            totalFee: Number(totalFee),
            currentProgress: 0,
            planSubmitted: false,
            planApproved: false,
            milestones: []
        });

        res.status(201).json(newCase);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const submitPlan = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { milestones } = req.body;

        if (!milestones || !Array.isArray(milestones)) {
            res.status(400).json({ message: 'Milestones array is required' });
            return;
        }

        for (let i = 0; i < milestones.length; i++) {
            const m = milestones[i];
            if (!m.title || !m.title.trim() || !m.description || !m.description.trim()) {
                res.status(400).json({ message: `Milestone ${i + 1} must have a non-empty title and description.` });
                return;
            }
        }

        const totalProgress = milestones.reduce((sum: number, m: any) => sum + Number(m.progressIncrement), 0);
        if (totalProgress !== 100) {
            res.status(400).json({ message: 'The sum of progress increments for all milestones must equal exactly 100%.' });
            return;
        }

        const kase = await Case.findOneAndUpdate(
            { _id: id, lawyer: req.user.id },
            { 
                $set: { 
                    milestones: milestones.map((m: any) => ({
                        title: m.title,
                        description: m.description,
                        progressIncrement: Number(m.progressIncrement),
                        payoutAmount: Number(m.payoutAmount),
                        status: 'pending',
                        payoutStatus: 'pending',
                        proofDocs: []
                    })),
                    planSubmitted: true,
                    planApproved: false
                }
            },
            { new: true }
        ).populate('client', 'fullName email phone location');

        if (!kase) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        res.json(kase);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateMilestoneStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id, index } = req.params;
        const { status } = req.body;
        const milestoneIndex = parseInt(index as string);

        const kase = await Case.findOne({ _id: id, lawyer: req.user.id });
        if (!kase) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        if (isNaN(milestoneIndex) || milestoneIndex < 0 || milestoneIndex >= kase.milestones.length) {
            res.status(400).json({ message: 'Invalid milestone index' });
            return;
        }

        kase.milestones[milestoneIndex].status = status;
        if (status === 'completed') {
            kase.milestones[milestoneIndex].completedAt = new Date();
        } else {
            kase.milestones[milestoneIndex].completedAt = undefined;
        }

        // Re-calculate overall case progress
        let progress = 0;
        kase.milestones.forEach((m) => {
            if (m.status === 'completed') {
                progress += m.progressIncrement;
            }
        });
        kase.currentProgress = progress;

        await kase.save();
        res.json(kase);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const uploadProof = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id, index } = req.params;
        const milestoneIndex = parseInt(index as string);

        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }

        const kase = await Case.findOne({ _id: id, lawyer: req.user.id });
        if (!kase) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        if (isNaN(milestoneIndex) || milestoneIndex < 0 || milestoneIndex >= kase.milestones.length) {
            res.status(400).json({ message: 'Invalid milestone index' });
            return;
        }

        const { details } = req.body;
        const proofUrl = `/uploads/${req.file.filename}`;
        kase.milestones[milestoneIndex].proofDocs.push({
            name: req.file.originalname,
            url: proofUrl,
            uploadedAt: new Date(),
            details: details || ''
        });

        await kase.save();
        res.json(kase);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const requestPayout = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id, index } = req.params;
        const milestoneIndex = parseInt(index as string);

        const kase = await Case.findOne({ _id: id, lawyer: req.user.id });
        if (!kase) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        if (isNaN(milestoneIndex) || milestoneIndex < 0 || milestoneIndex >= kase.milestones.length) {
            res.status(400).json({ message: 'Invalid milestone index' });
            return;
        }

        const milestone = kase.milestones[milestoneIndex];
        if (milestone.status !== 'completed') {
            res.status(400).json({ message: 'Milestone must be completed before requesting payout.' });
            return;
        }

        if (milestone.proofDocs.length === 0) {
            res.status(400).json({ message: 'Please upload at least one proof of work document before requesting payout.' });
            return;
        }

        milestone.payoutStatus = 'requested';
        await kase.save();
        res.json(kase);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
