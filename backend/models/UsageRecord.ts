import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IUsageRecord extends Document {
    userId: mongoose.Types.ObjectId;
    featureType: 'document_generation' | 'document_review' | 'legal_research' | 'lawyer_booking';
    createdAt: Date;
}

const UsageRecordSchema: Schema = new Schema({
    userId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },
    featureType: { 
        type: String, 
        enum: ['document_generation', 'document_review', 'legal_research', 'lawyer_booking'], 
        required: true, 
        index: true 
    }
}, { 
    timestamps: { createdAt: true, updatedAt: false }
});

const UsageRecord: Model<IUsageRecord> = mongoose.model<IUsageRecord>('UsageRecord', UsageRecordSchema);

export default UsageRecord;
