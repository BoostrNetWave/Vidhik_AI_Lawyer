import api from '../lib/api';

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
        uploadedAt: string;
        details?: string;
    }[];
    completedAt?: string;
}

export interface ICase {
    _id: string;
    title: string;
    description: string;
    client: {
        _id: string;
        fullName: string;
        email: string;
        phone?: string;
        location?: string;
    };
    lawyer: string;
    status: 'pending_lawyer' | 'pending_payment' | 'active' | 'completed' | 'cancelled';
    totalFee: number;
    currentProgress: number;
    planSubmitted: boolean;
    planApproved: boolean;
    milestones: IMilestone[];
    bookingDate?: string;
    bookingTime?: string;
    meetingLink?: string;
    meetingSummaryUrl?: string;
    meetingSummaryName?: string;
    meetingSummaryUploadedAt?: string;
    meetingJoinedByClient?: boolean;
    meetingJoinedByLawyer?: boolean;
    createdAt: string;
    updatedAt: string;
}

export const caseService = {
    async getCases(): Promise<ICase[]> {
        const response = await api.get('cases');
        return response.data;
    },

    async getCaseById(id: string): Promise<ICase> {
        const response = await api.get(`cases/${id}`);
        return response.data;
    },

    async createCase(data: { clientEmail: string; title: string; description: string; totalFee: number }): Promise<ICase> {
        const response = await api.post('cases', data);
        return response.data;
    },

    async confirmBooking(id: string): Promise<ICase> {
        const response = await api.put(`cases/${id}/confirm-booking`);
        return response.data;
    },

    async submitPlan(id: string, milestones: Partial<IMilestone>[]): Promise<ICase> {
        const response = await api.put(`cases/${id}/plan`, { milestones });
        return response.data;
    },

    async updateMilestoneStatus(id: string, index: number, status: string): Promise<ICase> {
        const response = await api.put(`cases/${id}/milestones/${index}/status`, { status });
        return response.data;
    },

    async uploadProof(id: string, index: number, file: File, details?: string): Promise<ICase> {
        const formData = new FormData();
        formData.append('proof', file);
        if (details) {
            formData.append('details', details);
        }
        const response = await api.post(`cases/${id}/milestones/${index}/upload-proof`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    async requestPayout(id: string, index: number): Promise<ICase> {
        const response = await api.post(`cases/${id}/milestones/${index}/request-payout`);
        return response.data;
    },

    async uploadMeetingSummary(id: string, file: File): Promise<ICase> {
        const formData = new FormData();
        formData.append('summary', file);
        const response = await api.post(`cases/${id}/meeting-summary`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    async joinMeeting(id: string): Promise<ICase> {
        const response = await api.post(`cases/${id}/join-meeting`);
        return response.data;
    },

    async sendSignal(id: string, signalData: { sender: 'client' | 'lawyer'; type: string; sdp?: string; candidate?: any }): Promise<any> {
        const response = await api.post(`cases/${id}/signal`, signalData);
        return response.data;
    },

    async getSignals(id: string): Promise<any[]> {
        const response = await api.get(`cases/${id}/signals`);
        return response.data;
    },

    async clearSignals(id: string): Promise<any> {
        const response = await api.post(`cases/${id}/signals/clear`);
        return response.data;
    }
};
