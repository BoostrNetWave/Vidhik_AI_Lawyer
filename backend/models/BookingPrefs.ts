import mongoose, { Schema, Document } from 'mongoose';

export interface IBookingPrefs extends Document {
    userId: string;
    slots: Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        duration: number;
        breakMinutes: number;
        date?: string; // Optional specific date (YYYY-MM-DD)
    }>;
    blackouts: Array<{
        start: Date;
        end: Date;
        reason?: string;
    }>;
    workingHours: {
        mon: Array<{ start: string; end: string }>;
        tue: Array<{ start: string; end: string }>;
        wed: Array<{ start: string; end: string }>;
        thu: Array<{ start: string; end: string }>;
        fri: Array<{ start: string; end: string }>;
        sat: Array<{ start: string; end: string }>;
        sun: Array<{ start: string; end: string }>;
    };
    settings: {
        sessionDurations: number[];
        bufferMins: number;
        minNoticeMins: number;
        maxDailyBookings: number;
        advanceWindowDays: number;
        approval: {
            manual: boolean;
            autoConfirm: boolean;
        };
    };
    timezone: string;
    calendarSync: {
        googleEnabled: boolean;
        outlookEnabled: boolean;
    };
}

const BookingPrefsSchema: Schema = new Schema({
    userId: { type: String, required: true, unique: true },
    slots: [{
        dayOfWeek: { type: Number, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        duration: { type: Number, default: 60 },
        breakMinutes: { type: Number, default: 0 },
        date: { type: String } // Optional specific date
    }],
    blackouts: [{
        start: { type: Date, required: true },
        end: { type: Date, required: true },
        reason: { type: String }
    }],
    workingHours: {
        mon: [{ start: String, end: String }],
        tue: [{ start: String, end: String }],
        wed: [{ start: String, end: String }],
        thu: [{ start: String, end: String }],
        fri: [{ start: String, end: String }],
        sat: [{ start: String, end: String }],
        sun: [{ start: String, end: String }]
    },
    settings: {
        sessionDurations: [{ type: Number }],
        bufferMins: { type: Number, default: 15 },
        minNoticeMins: { type: Number, default: 60 },
        maxDailyBookings: { type: Number },
        advanceWindowDays: { type: Number, default: 30 },
        approval: {
            manual: { type: Boolean, default: false },
            autoConfirm: { type: Boolean, default: true }
        }
    },
    timezone: { type: String, default: 'UTC' },
    calendarSync: {
        googleEnabled: { type: Boolean, default: false },
        outlookEnabled: { type: Boolean, default: false }
    }
}, { timestamps: true });

export default mongoose.model<IBookingPrefs>('BookingPrefs', BookingPrefsSchema);
