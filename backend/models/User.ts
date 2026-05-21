import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IUser extends Document {
    userId: string;
    email: string;
    password?: string;
    role: 'admin' | 'user' | 'lawyer';
    fullName: string;
    title: string;
    expertise: string;
    hourlyRate: number;
    bio: string;
    avatar: string;
    bankName: string;
    accountNumber: string;
    ifsc: string;
    // New Lawyer Specific Fields
    practiceAreas: string[];
    languages: string[];
    workStatus: string;
    education: { degree: string; school: string; year: string }[];
    memberships: string[];
    location: string;
    experience: string;
    rating: number;
    reviews: number;
    isVerified: boolean;
    isApproved: boolean;
    verificationOTP?: string;
    otpExpires?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema: Schema = new Schema({
    // Identification & Auth
    userId: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'user', 'lawyer'],
        default: 'admin'
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    // Profile Information
    fullName: { type: String, default: "" },
    title: { type: String, default: "" },
    expertise: { type: String, default: "" },
    hourlyRate: { type: Number, default: 0 },
    bio: { type: String, default: "" },
    avatar: { type: String, default: "" },
    // Payment / Payout Information
    bankName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    ifsc: { type: String, default: "" },
    // Lawyer Specific Details
    practiceAreas: { type: [String], default: [] },
    languages: { type: [String], default: [] },
    workStatus: { type: String, default: "Available for Consultations" },
    education: [{
        degree: String,
        school: String,
        year: String
    }],
    memberships: { type: [String], default: [] },
    location: { type: String, default: "" },
    experience: { type: String, default: "" },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationOTP: {
        type: String
    },
    otpExpires: {
        type: Date
    }
}, {
    timestamps: true
});

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
