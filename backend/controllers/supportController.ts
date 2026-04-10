import { Request, Response } from 'express';
import SupportTicket from '../models/SupportTicket.js';

export const getTickets = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const query = userId ? { userId } : {};
        const total = await SupportTicket.countDocuments(query);
        const tickets = await SupportTicket.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            data: tickets,
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

export const createTicket = async (req: Request, res: Response): Promise<void> => {
    try {
        const ticketCount = await SupportTicket.countDocuments();
        const ticketId = `TKT-${Math.floor(10000 + Math.random() * 90000)}-${ticketCount + 1}`;

        const ticket = new SupportTicket({
            ...req.body,
            ticketId,
            attachment: req.file ? req.file.path : undefined
        });

        const newTicket = await ticket.save();
        res.status(201).json(newTicket);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const closeTicket = async (req: Request, res: Response): Promise<void> => {
    try {
        const ticket = await SupportTicket.findByIdAndUpdate(
            req.params.id,
            { status: 'Closed' },
            { new: true }
        );
        if (!ticket) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }
        res.json(ticket);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteTicket = async (req: Request, res: Response): Promise<void> => {
    try {
        const ticket = await SupportTicket.findByIdAndDelete(req.params.id);
        if (!ticket) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }
        res.json({ message: 'Ticket deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
