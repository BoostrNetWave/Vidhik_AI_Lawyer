import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ILiveConsultation extends Document {
    title: string;
    description: string;
    client: mongoose.Types.ObjectId;
    lawyer: mongoose.Types.ObjectId;
    status: 'pending_lawyer_approval' | 'pending_user_approval' | 'pending_payment' | 'scheduled' | 'completed' | 'cancelled';
    scheduledDate: Date;
    scheduledTime: string;
    proposedBy: 'client' | 'lawyer';
    totalFee: number;
    meetingLink?: string;
    documents: {
        name: string;
        url: string;
        uploadedBy: 'client' | 'lawyer';
        uploadedAt: Date;
    }[];
    meetingJoinedByClient?: boolean;
    meetingJoinedByLawyer?: boolean;
    clientJoinedAt?: Date;
    lawyerJoinedAt?: Date;
    completedAt?: Date;
    meetingDuration?: number;
    meetingNotes?: string;
    meetingSummary?: string;
    createdAt: Date;
    updatedAt: Date;
}

const liveConsultationSchema = new Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    client: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lawyer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['pending_lawyer_approval', 'pending_user_approval', 'pending_payment', 'scheduled', 'completed', 'cancelled'],
        default: 'pending_lawyer_approval'
    },
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String, required: true },
    proposedBy: { type: String, enum: ['client', 'lawyer'], required: true },
    totalFee: { type: Number, required: true, default: 0 },
    meetingLink: { type: String },
    documents: [{
        name: { type: String, required: true },
        url: { type: String, required: true },
        uploadedBy: { type: String, enum: ['client', 'lawyer'], required: true },
        uploadedAt: { type: Date, default: Date.now }
    }],
    meetingJoinedByClient: { type: Boolean, default: false },
    meetingJoinedByLawyer: { type: Boolean, default: false },
    clientJoinedAt: { type: Date },
    lawyerJoinedAt: { type: Date },
    completedAt: { type: Date },
    meetingDuration: { type: Number, default: 0 },
    meetingNotes: { type: String, default: '' },
    meetingSummary: { type: String, default: '' }
}, {
    timestamps: true
});

const LiveConsultation: Model<ILiveConsultation> = mongoose.models.LiveConsultation || mongoose.model<ILiveConsultation>('LiveConsultation', liveConsultationSchema);

export default LiveConsultation;
