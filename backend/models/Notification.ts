import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
    userId: string;
    userRole: 'user' | 'lawyer' | 'admin';
    title: string;
    message: string;
    type: 'case' | 'consultation' | 'credit' | 'support' | 'system';
    link?: string;
    metadata?: Record<string, any>;
    read: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
    userId: {
        type: String,
        required: true,
        index: true
    },
    userRole: {
        type: String,
        enum: ['user', 'lawyer', 'admin'],
        default: 'lawyer',
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['case', 'consultation', 'credit', 'support', 'system'],
        default: 'system',
        index: true
    },
    link: {
        type: String,
        trim: true
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {}
    },
    read: {
        type: Boolean,
        default: false,
        index: true
    }
}, {
    timestamps: true
});

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
