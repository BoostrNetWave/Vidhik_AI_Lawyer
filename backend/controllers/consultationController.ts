import { Response } from 'express';
import LiveConsultation from '../models/LiveConsultation.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/emailService.js';

export const getConsultationsForLawyer = async (req: any, res: Response): Promise<void> => {
    try {
        const consultations = await LiveConsultation.find({ lawyer: req.user.id })
            .populate('client', 'fullName email phone location')
            .sort({ createdAt: -1 });
        res.json(consultations);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getConsultationById = async (req: any, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const consultation = await LiveConsultation.findOne({ _id: id, lawyer: req.user.id })
            .populate('client', 'fullName email phone location')
            .populate('lawyer', 'fullName email phone location title expertise avatar');

        if (!consultation) {
            res.status(404).json({ message: 'Consultation not found' });
            return;
        }
        res.json(consultation);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const acceptConsultation = async (req: any, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const consultation = await LiveConsultation.findOne({ _id: id, lawyer: req.user.id });

        if (!consultation) {
            res.status(404).json({ message: 'Consultation not found' });
            return;
        }

        if (consultation.status !== 'pending_lawyer_approval') {
            res.status(400).json({ message: 'No request pending lawyer approval' });
            return;
        }

        consultation.status = 'pending_payment';
        await consultation.save();

        const clientUser = await User.findById(consultation.client);
        if (clientUser) {
            await sendEmail(
                clientUser.email,
                `Consultation Request Approved: ${consultation.title}`,
                `<h3>Consultation Request Approved</h3>
                 <p>Hello ${clientUser.fullName},</p>
                 <p>Advocate <strong>${req.user.fullName}</strong> has approved your consultation request: <strong>${consultation.title}</strong>.</p>
                 <p><strong>Scheduled Date:</strong> ${new Date(consultation.scheduledDate).toLocaleDateString()}</p>
                 <p><strong>Scheduled Time:</strong> ${consultation.scheduledTime}</p>
                 <p>Please log in to your dashboard to complete the payment. The meeting details will be shared once the payment is completed.</p>`
            );
        }

        res.json(consultation);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const proposeConsultationTime = async (req: any, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { scheduledDate, scheduledTime } = req.body;

        if (!scheduledDate || !scheduledTime) {
            res.status(400).json({ message: 'Proposed date and time are required' });
            return;
        }

        const consultation = await LiveConsultation.findOne({ _id: id, lawyer: req.user.id });
        if (!consultation) {
            res.status(404).json({ message: 'Consultation not found' });
            return;
        }

        consultation.scheduledDate = new Date(scheduledDate);
        consultation.scheduledTime = scheduledTime;
        consultation.status = 'pending_user_approval';
        consultation.proposedBy = 'lawyer';

        await consultation.save();

        const clientUser = await User.findById(consultation.client);
        if (clientUser) {
            await sendEmail(
                clientUser.email,
                `New Date/Time Proposed by Lawyer for Consultation: ${consultation.title}`,
                `<h3>Proposed Changes from Advocate</h3>
                 <p>Hello ${clientUser.fullName},</p>
                 <p>Advocate <strong>${req.user.fullName}</strong> has proposed a new slot for the consultation: <strong>${consultation.title}</strong>.</p>
                 <p><strong>Proposed Date:</strong> ${new Date(scheduledDate).toLocaleDateString()}</p>
                 <p><strong>Proposed Time:</strong> ${scheduledTime}</p>
                 <p>Please log in to your dashboard to accept the proposed slot or make a counter-proposal.</p>`
            );
        }

        res.json(consultation);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const uploadConsultationDocument = async (req: any, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const file = req.file;

        if (!file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }

        const consultation = await LiveConsultation.findOne({ _id: id, lawyer: req.user.id });
        if (!consultation) {
            res.status(404).json({ message: 'Consultation not found' });
            return;
        }

        const docUrl = `/uploads/${file.filename}`;
        consultation.documents.push({
            name: file.originalname,
            url: docUrl,
            uploadedBy: 'lawyer',
            uploadedAt: new Date()
        });

        await consultation.save();
        res.json(consultation);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const cancelConsultation = async (req: any, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const consultation = await LiveConsultation.findOne({ _id: id, lawyer: req.user.id });

        if (!consultation) {
            res.status(404).json({ message: 'Consultation not found' });
            return;
        }

        consultation.status = 'cancelled';
        await consultation.save();

        const clientUser = await User.findById(consultation.client);
        if (clientUser) {
            await sendEmail(
                clientUser.email,
                `Live Consultation Request Cancelled/Declined: ${consultation.title}`,
                `<h3>Consultation Declined</h3>
                 <p>Hello ${clientUser.fullName},</p>
                 <p>Advocate <strong>${req.user.fullName}</strong> has declined or cancelled the consultation request: <strong>${consultation.title}</strong>.</p>`
            );
        }

        res.json(consultation);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
