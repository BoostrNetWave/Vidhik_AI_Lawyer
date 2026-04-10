import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
    userId: string;
    general: {
        siteName: string;
        supportEmail: string;
        contactPhone: string;
        address: string;
    };
    notifications: {
        newBooking: boolean;
        paymentSuccess: boolean;
        systemUpdates: boolean;
        marketingEmails: boolean;
    };
}

const SettingsSchema: Schema = new Schema({
    userId: { type: String, required: true, unique: true },
    general: {
        siteName: { type: String, default: "Vidhik AI" },
        supportEmail: { type: String, default: "support@vidhik.ai" },
        contactPhone: { type: String, default: "+91 98765 43210" },
        address: { type: String, default: "Legal Tower, MG Road, Bangalore, India" }
    },
    notifications: {
        newBooking: { type: Boolean, default: true },
        paymentSuccess: { type: Boolean, default: true },
        systemUpdates: { type: Boolean, default: false },
        marketingEmails: { type: Boolean, default: false }
    }
}, { timestamps: true });

export default mongoose.model<ISettings>('Settings', SettingsSchema);
