import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISignal extends Document {
    caseId: mongoose.Types.ObjectId;
    sender: 'client' | 'lawyer';
    type: 'offer' | 'answer' | 'candidate';
    sdp?: string;
    candidate?: string;
    createdAt: Date;
}

const signalSchema = new Schema({
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    sender: { type: String, enum: ['client', 'lawyer'], required: true },
    type: { type: String, enum: ['offer', 'answer', 'candidate'], required: true },
    sdp: { type: String },
    candidate: { type: String },
    createdAt: { type: Date, default: Date.now, expires: 3600 } // Auto-delete after 1 hour
});

signalSchema.index({ caseId: 1, createdAt: 1 });

const Signal: Model<ISignal> = mongoose.models.Signal || mongoose.model<ISignal>('Signal', signalSchema);

export default Signal;
