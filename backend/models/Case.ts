import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IMilestone {
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed';
    progressIncrement: number;
    payoutAmount: number;
    payoutStatus: 'pending' | 'requested' | 'approved' | 'rejected';
    proofDocs: {
        name: string;
        url: string;
        uploadedAt: Date;
        details?: string;
    }[];
    completedAt?: Date;
}

export interface IInterestedLawyer {
    lawyer: mongoose.Types.ObjectId;
    appliedAt: Date;
    proposalNote?: string;
    proposedFee?: number;
    estimatedTimeline?: string;
    status?: 'applied' | 'selected' | 'rejected';
}

export interface ICase extends Document {
    title: string;
    description: string;
    client: mongoose.Types.ObjectId;
    lawyer?: mongoose.Types.ObjectId;
    status: 'open' | 'pending_lawyer' | 'pending_payment' | 'active' | 'completed' | 'cancelled';
    budget?: number;
    totalFee: number;
    currentProgress: number;
    planSubmitted: boolean;
    planApproved: boolean;
    milestones: IMilestone[];
    category?: string;
    court?: string;
    filingNumber?: string;
    nextHearingDate?: Date;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    isLegalDocument?: boolean;
    nonLegalReason?: string;
    aiSummary?: string;
    aiKeyFacts?: string[];
    aiRecommendedSpecialization?: string;
    aiRecommendedLawyer?: mongoose.Types.ObjectId;
    aiRecommendationReason?: string;
    adminRecommendedLawyer?: mongoose.Types.ObjectId;
    adminRecommendationNote?: string;
    interestedLawyers: IInterestedLawyer[];
    notes?: {
        text: string;
        createdAt: Date;
        createdBy?: string;
    }[];
    documents?: {
        name: string;
        url: string;
        size?: number;
        uploadedAt: Date;
        docType?: string;
    }[];
    bookingDate?: Date;
    bookingTime?: string;
    meetingLink?: string;
    meetingSummaryUrl?: string;
    meetingSummaryName?: string;
    meetingSummaryUploadedAt?: Date;
    meetingJoinedByClient?: boolean;
    meetingJoinedByLawyer?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const milestoneSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'in_progress', 'completed'], 
        default: 'pending' 
    },
    progressIncrement: { type: Number, required: true, default: 0 },
    payoutAmount: { type: Number, required: true, default: 0 },
    payoutStatus: { 
        type: String, 
        enum: ['pending', 'requested', 'approved', 'rejected'], 
        default: 'pending' 
    },
    proofDocs: [{
        name: { type: String },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now },
        details: { type: String }
    }],
    completedAt: { type: Date }
});

const interestedLawyerSchema = new Schema({
    lawyer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appliedAt: { type: Date, default: Date.now },
    proposalNote: { type: String, default: '' },
    proposedFee: { type: Number, default: 0 },
    estimatedTimeline: { type: String, default: '' },
    status: { 
        type: String, 
        enum: ['applied', 'selected', 'rejected'], 
        default: 'applied' 
    }
});

const caseSchema = new Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    client: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lawyer: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    category: { type: String, default: 'General Legal' },
    court: { type: String },
    filingNumber: { type: String },
    nextHearingDate: { type: Date },
    priority: { 
        type: String, 
        enum: ['low', 'medium', 'high', 'urgent'], 
        default: 'medium' 
    },
    status: { 
        type: String, 
        enum: ['open', 'pending_lawyer', 'pending_payment', 'active', 'completed', 'cancelled'], 
        default: 'open' 
    },
    budget: { type: Number, default: 0 },
    totalFee: { type: Number, required: true, default: 0 },
    currentProgress: { type: Number, default: 0 },
    planSubmitted: { type: Boolean, default: false },
    planApproved: { type: Boolean, default: false },
    isLegalDocument: { type: Boolean, default: true },
    nonLegalReason: { type: String, default: '' },
    aiSummary: { type: String, default: '' },
    aiKeyFacts: [{ type: String }],
    aiRecommendedSpecialization: { type: String, default: '' },
    aiRecommendedLawyer: { type: Schema.Types.ObjectId, ref: 'User' },
    aiRecommendationReason: { type: String, default: '' },
    adminRecommendedLawyer: { type: Schema.Types.ObjectId, ref: 'User' },
    adminRecommendationNote: { type: String, default: '' },
    interestedLawyers: [interestedLawyerSchema],
    milestones: [milestoneSchema],
    notes: [{
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: String }
    }],
    documents: [{
        name: { type: String, required: true },
        url: { type: String, required: true },
        size: { type: Number },
        uploadedAt: { type: Date, default: Date.now },
        docType: { type: String, default: 'Case File' }
    }],
    bookingDate: { type: Date },
    bookingTime: { type: String },
    meetingLink: { type: String },
    meetingSummaryUrl: { type: String },
    meetingSummaryName: { type: String },
    meetingSummaryUploadedAt: { type: Date },
    meetingJoinedByClient: { type: Boolean, default: false },
    meetingJoinedByLawyer: { type: Boolean, default: false }
}, {
    timestamps: true
});

const Case: Model<ICase> = mongoose.models.Case || mongoose.model<ICase>('Case', caseSchema);

export default Case;
