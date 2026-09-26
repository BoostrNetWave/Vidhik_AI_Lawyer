import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWebsiteContent extends Document {
    section: string;         // e.g. 'hero', 'faq', 'pricing', 'testimonials', etc.
    page: string;            // e.g. 'landing', 'about', 'services', 'pricing', 'how_it_works'
    key: string;             // unique key per section field
    contentType: 'text' | 'image' | 'json' | 'richtext' | 'url';
    value: any;
    label: string;           // human-readable label for admin UI
    description?: string;
    isActive: boolean;
    order?: number;          // for ordering items in lists
    updatedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

const WebsiteContentSchema: Schema = new Schema({
    section: { type: String, required: true },
    page: { type: String, required: true, default: 'landing' },
    key: { type: String, required: true, unique: true, index: true },
    contentType: {
        type: String,
        enum: ['text', 'image', 'json', 'richtext', 'url'],
        required: true
    },
    value: { type: Schema.Types.Mixed, required: true },
    label: { type: String, required: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    updatedBy: { type: String, default: '' },
}, {
    timestamps: true
});

// Compound index for section+page queries
WebsiteContentSchema.index({ section: 1, page: 1 });

const WebsiteContent: Model<IWebsiteContent> = mongoose.model<IWebsiteContent>('WebsiteContent', WebsiteContentSchema);

export default WebsiteContent;
