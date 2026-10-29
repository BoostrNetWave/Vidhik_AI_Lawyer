import { Response } from 'express';
import Case from '../models/Case.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Signal from '../models/Signal.js';
import SystemConfig from '../models/SystemConfig.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { sendEmail } from '../utils/emailService.js';
import { saveFileToGridFS } from '../utils/gridfsStorage.js';

/**
 * Get cases assigned to this lawyer or where this lawyer has applied
 */
export const getCases = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const cases = await Case.find({
            $or: [
                { lawyer: req.user.id },
                { 'interestedLawyers.lawyer': req.user.id }
            ]
        })
            .populate('client', 'fullName email phone location')
            .populate('interestedLawyers.lawyer', 'fullName email phone location title expertise avatar rating experience casesWon hourlyRate')
            .populate('aiRecommendedLawyer', 'fullName email phone location title expertise avatar rating experience')
            .populate('adminRecommendedLawyer', 'fullName email phone location title expertise avatar rating experience')
            .sort({ createdAt: -1 });
        res.json(cases);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get all open marketplace cases posted by clients
 */
export const getOpenCases = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const cases = await Case.find({ status: 'open' })
            .populate('client', 'fullName email phone location')
            .populate('interestedLawyers.lawyer', 'fullName email phone location title expertise avatar rating experience casesWon hourlyRate')
            .populate('aiRecommendedLawyer', 'fullName email phone location title expertise avatar rating experience')
            .populate('adminRecommendedLawyer', 'fullName email phone location title expertise avatar rating experience')
            .sort({ createdAt: -1 });
        res.json(cases);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCaseById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const kase = await Case.findOne({
            _id: id,
            $or: [
                { lawyer: req.user.id },
                { status: 'open' },
                { 'interestedLawyers.lawyer': req.user.id }
            ]
        })
            .populate('client', 'fullName email phone location')
            .populate('interestedLawyers.lawyer', 'fullName email phone location title expertise avatar rating experience casesWon hourlyRate')
            .populate('aiRecommendedLawyer', 'fullName email phone location title expertise avatar rating experience')
            .populate('adminRecommendedLawyer', 'fullName email phone location title expertise avatar rating experience');
        
        if (!kase) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }
        res.json(kase);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Lawyer applies / expresses interest in an open case
 */
export const applyToCase = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { proposalNote, proposedFee, estimatedTimeline } = req.body;
        const lawyerId = req.user.id;

        const lawyerUser = await User.findById(lawyerId);
        if (!lawyerUser) {
            res.status(404).json({ message: 'Lawyer profile not found' });
            return;
        }

        const kase = await Case.findById(id);
        if (!kase) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        if (kase.status !== 'open') {
            res.status(400).json({ message: 'This case is no longer open for new applications' });
            return;
        }

        const alreadyApplied = kase.interestedLawyers.some(
            (i: any) => i.lawyer.toString() === lawyerId.toString()
        );

        if (alreadyApplied) {
            res.status(400).json({ message: 'You have already applied to this case' });
            return;
        }

        kase.interestedLawyers.push({
            lawyer: lawyerId as any,
            appliedAt: new Date(),
            proposalNote: proposalNote || 'I am interested in taking this case and can provide dedicated legal representation.',
            proposedFee: Number(proposedFee) || kase.budget || kase.totalFee || 1500,
            estimatedTimeline: estimatedTimeline || 'Standard Timeline',
            status: 'applied'
        });

        await kase.save();

        const populated = await Case.findById(kase._id)
            .populate('client', 'fullName email phone location')
            .populate('interestedLawyers.lawyer', 'fullName email phone location title expertise avatar rating experience casesWon hourlyRate')
            .populate('aiRecommendedLawyer', 'fullName email phone location title expertise avatar rating experience')
            .populate('adminRecommendedLawyer', 'fullName email phone location title expertise avatar rating experience');

        // Notify client
        const clientUserId = kase.client.toString();
        await Notification.create({
            userId: clientUserId,
            userRole: 'user',
            title: 'Lawyer Approved Your Case',
            message: `Adv. ${lawyerUser.fullName} has approved and expressed interest in taking your case "${kase.title}".`,
            type: 'case',
            link: `/cases`
        });

        // Send email to client
        const clientEmail = (populated?.client as any)?.email;
        if (clientEmail) {
            await sendEmail(
                clientEmail,
                `Lawyer Expressed Interest: ${kase.title}`,
                `<h3>Adv. ${lawyerUser.fullName} Approved Your Case</h3>
                 <p>Advocate <strong>${lawyerUser.fullName}</strong> (${lawyerUser.expertise || 'Specialist'}) has reviewed your case <strong>${kase.title}</strong> and expressed interest in representing you.</p>
                 <p><strong>Proposed Fee:</strong> ₹${Number(proposedFee) || kase.budget || kase.totalFee || 1500}</p>
                 <p><strong>Proposal Note:</strong> ${proposalNote || 'Available to commence work immediately.'}</p>
                 <p>Log in to your <strong>Case Management</strong> dashboard to review all interested lawyers and confirm your selection.</p>`
            );
        }

        res.json(populated);
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

        const lawyerUser = await User.findById(req.user.id);
        if (!lawyerUser) {
            res.status(404).json({ message: 'Lawyer not found' });
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
            status: 'active',
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

        const kaseCheck = await Case.findOne({ _id: id, lawyer: req.user.id });
        if (!kaseCheck) {
            res.status(404).json({ message: 'Case not found' });
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

        const clientEmail = (kase.client as any)?.email;
        const clientName = (kase.client as any)?.fullName || 'Client';
        const lawyerName = req.user.fullName || 'Advocate';

        if (clientEmail) {
            await Promise.allSettled([
                sendEmail(
                    clientEmail,
                    `Action Roadmap Submitted: ${kase.title}`,
                    `<h2 style="color: #1e1b4b; margin-top: 0;">Case Action Roadmap Ready for Review</h2>
                     <p>Hello <strong>${clientName}</strong>,</p>
                     <p>Advocate <strong>Adv. ${lawyerName}</strong> has submitted the detailed <strong>Action Roadmap</strong> with <strong>${kase.milestones.length} milestones</strong> for your case: <strong>${kase.title}</strong>.</p>
                     <p>Please log in to your dashboard under <strong>Case Management</strong> to review and approve the roadmap so legal work can commence.</p>`
                ),
                req.user.email ? sendEmail(
                    req.user.email,
                    `Roadmap Submitted: ${kase.title}`,
                    `<h2 style="color: #1e1b4b; margin-top: 0;">Action Roadmap Submitted</h2>
                     <p>Hello <strong>Adv. ${lawyerName}</strong>,</p>
                     <p>You have successfully submitted the action roadmap for case: <strong>${kase.title}</strong> with ${kase.milestones.length} milestones.</p>
                     <p>The client <strong>${clientName}</strong> has been notified to review and approve.</p>`
                ) : Promise.resolve()
            ]);
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

        await saveFileToGridFS(req.file.filename, req.file.path, req.file.mimetype);

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

export const confirmBooking = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const kase = await Case.findOneAndUpdate(
            { _id: id, lawyer: req.user.id, status: 'pending_lawyer' },
            { 
                $set: { 
                    status: 'pending_payment',
                    meetingLink: `https://jitsi.hamburg.ccc.de/vidhik-meet-${Math.random().toString(36).substring(2, 10)}-${Date.now().toString(36)}`
                } 
            },
            { new: true }
        ).populate('client', 'fullName email phone location');

        if (!kase) {
            res.status(404).json({ message: 'Case request not found or not in pending lawyer confirmation state.' });
            return;
        }

        const clientEmail = (kase.client as any)?.email;
        const clientName = (kase.client as any)?.fullName || 'Client';
        const lawyerName = req.user.fullName || 'Advocate';

        // Notify client
        const clientUserId = (kase.client as any)?._id?.toString() || kase.client.toString();
        await Notification.create({
            userId: clientUserId,
            userRole: 'user',
            title: 'Lawyer Accepted Your Case',
            message: `Adv. ${lawyerName} accepted your case "${kase.title}". Please proceed with payment to start work.`,
            type: 'case',
            link: `/cases`
        });

        await Promise.allSettled([
            clientEmail ? sendEmail(
                clientEmail,
                `Case Accepted by Lawyer: ${kase.title}`,
                `<h2 style="color: #1e1b4b; margin-top: 0;">Case Accepted & Ready for Payment</h2>
                 <p>Hello <strong>${clientName}</strong>,</p>
                 <p>Advocate <strong>Adv. ${lawyerName}</strong> has confirmed acceptance of your case <strong>${kase.title}</strong>.</p>
                 <p>Please log in to your dashboard under <strong>Case Management</strong> and proceed with payment. Once paid, the case will be active and roadmap will begin.</p>`
            ) : Promise.resolve(),
            req.user.email ? sendEmail(
                req.user.email,
                `You Accepted Case: ${kase.title}`,
                `<h2 style="color: #1e1b4b; margin-top: 0;">Case Acceptance Confirmed</h2>
                 <p>Hello <strong>Adv. ${lawyerName}</strong>,</p>
                 <p>You have accepted case <strong>${kase.title}</strong>. The client has been prompted to make payment.</p>`
            ) : Promise.resolve()
        ]);

        res.json(kase);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const uploadMeetingSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        if (!req.file) {
            res.status(400).json({ message: 'No meeting summary file uploaded' });
            return;
        }

        const kase = await Case.findOne({ _id: id, lawyer: req.user.id });
        if (!kase) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        const summaryUrl = `/uploads/${req.file.filename}`;
        await saveFileToGridFS(req.file.filename, req.file.path, req.file.mimetype);

        kase.meetingSummaryUrl = summaryUrl;
        kase.meetingSummaryName = req.file.originalname;
        kase.meetingSummaryUploadedAt = new Date();

        await kase.save();
        res.json(kase);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const joinMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const kase = await Case.findOneAndUpdate(
            { _id: id, lawyer: req.user.id },
            { $set: { meetingJoinedByLawyer: true } },
            { new: true }
        ).populate('client', 'fullName email phone location');

        if (!kase) {
            res.status(404).json({ message: 'Case not found or unauthorized' });
            return;
        }
        res.json(kase);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const sendSignal = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { sender, type, sdp, candidate } = req.body;

        if (!sender || !type) {
            res.status(400).json({ message: 'Sender and type are required' });
            return;
        }

        const signal = await Signal.create({
            caseId: id,
            sender,
            type,
            sdp,
            candidate: typeof candidate === 'string' ? candidate : JSON.stringify(candidate)
        });

        res.status(201).json(signal);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSignals = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const signals = await Signal.find({ caseId: id }).sort({ createdAt: 1 });
        res.json(signals);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const clearSignals = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await Signal.deleteMany({ caseId: id });
        res.json({ message: 'Signals cleared successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const reanalyzeCase = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const apiPort = process.env.USER_API_PORT || 5003;
        try {
            const aiRes = await fetch(`http://localhost:${apiPort}/api/cases/${id}/reanalyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization || ''
                }
            });
            if (aiRes.ok) {
                const data = await aiRes.json();
                res.json(data);
                return;
            }
        } catch (fetchErr) {
            console.warn('[Lawyer reanalyze forward]:', fetchErr);
        }

        const kase = await Case.findById(id);
        res.json(kase);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
