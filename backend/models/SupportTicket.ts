import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISupportTicket extends Document {
    ticketId: string;
    userId: string;
    subject: string;
    category: 'General' | 'Booking' | 'Payments' | 'Technical' | 'Other';
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
    description: string;
    attachment?: string;
    status: 'Open' | 'Closed' | 'Pending';
    createdAt: Date;
    updatedAt: Date;
}

const supportTicketSchema: Schema = new Schema({
    ticketId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['General', 'Booking', 'Payments', 'Technical', 'Other'],
        default: 'General'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium'
    },
    description: {
        type: String,
        required: true
    },
    attachment: {
        type: String
    },
    status: {
        type: String,
        enum: ['Open', 'Closed', 'Pending'],
        default: 'Open'
    },
    // Automatically delete documents 30 days after creation
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 2592000 // 30 days in seconds
    }
}, {
    timestamps: { createdAt: false, updatedAt: true } // Disable createdAt here since we defined it manually above
});

const SupportTicket: Model<ISupportTicket> = mongoose.model<ISupportTicket>('SupportTicket', supportTicketSchema);

export default SupportTicket;
