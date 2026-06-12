import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISystemConfig extends Document {
    key: string;
    value: any;
    category: 'landing' | 'lawyer_panel' | 'user_panel' | 'payments' | 'system';
    description: string;
    createdAt: Date;
    updatedAt: Date;
}

const SystemConfigSchema: Schema = new Schema({
    key: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    value: { 
        type: Schema.Types.Mixed, 
        required: true 
    },
    category: { 
        type: String, 
        enum: ['landing', 'lawyer_panel', 'user_panel', 'payments', 'system'],
        required: true 
    },
    description: { 
        type: String,
        default: '' 
    }
}, { 
    timestamps: true 
});

const SystemConfig: Model<ISystemConfig> = mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema);

export default SystemConfig;
