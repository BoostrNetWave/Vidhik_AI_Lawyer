import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBlog extends Document {
    title: string;
    content: string;
    status: 'Draft' | 'Published';
    type: 'Legal News' | 'Insights';
    premium: boolean;
    price: number;
    image?: string;
    author: string;
    createdAt: Date;
    updatedAt: Date;
}

const blogSchema: Schema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Draft', 'Published'],
        default: 'Draft'
    },
    type: {
        type: String,
        enum: ['Legal News', 'Insights'],
        default: 'Insights'
    },
    premium: {
        type: Boolean,
        default: false
    },
    price: {
        type: Number,
        default: 0
    },
    image: {
        type: String // URL or path to uploaded image
    },
    author: {
        type: String,
        default: 'Legal Admin'
    }
}, {
    timestamps: true
});

const Blog: Model<IBlog> = mongoose.model<IBlog>('Blog', blogSchema);

export default Blog;
