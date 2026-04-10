import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBooking extends Document {
    clientName: string;
    email: string;
    userId: string; // The lawyer this booking is for
    serviceType: string;
    date: Date;
    status: 'pending' | 'completed' | 'cancelled';
    amount: number;
    notes?: string;
    duration?: number;
    createdAt: Date;
    updatedAt: Date;
}

const bookingSchema: Schema = new Schema({
    clientName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    userId: {
        type: String,
        required: true
    },
    serviceType: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'pending'
    },
    amount: {
        type: Number,
        required: true
    },
    notes: {
        type: String
    },
    duration: {
        type: Number,
        required: false
    }
}, {
    timestamps: true
});

const Booking: Model<IBooking> = mongoose.model<IBooking>('Booking', bookingSchema);

export default Booking;
