import api from '../lib/api';

export interface IConsultationDoc {
    name: string;
    url: string;
    uploadedBy: 'client' | 'lawyer';
    uploadedAt: string;
}

export interface IConsultation {
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
    lawyer: {
        _id: string;
        fullName: string;
        email: string;
        phone?: string;
        location?: string;
        title?: string;
        expertise?: string;
        avatar?: string;
    };
    status: 'pending_lawyer_approval' | 'pending_user_approval' | 'pending_payment' | 'scheduled' | 'completed' | 'cancelled';
    scheduledDate: string;
    scheduledTime: string;
    proposedBy: 'client' | 'lawyer';
    totalFee: number;
    meetingLink?: string;
    documents: IConsultationDoc[];
    meetingJoinedByClient?: boolean;
    meetingJoinedByLawyer?: boolean;
    clientJoinedAt?: string;
    lawyerJoinedAt?: string;
    completedAt?: string;
    meetingDuration?: number;
    meetingNotes?: string;
    meetingSummary?: string;
    createdAt: string;
    updatedAt: string;
}

export const consultationService = {
    async getConsultations(): Promise<IConsultation[]> {
        const response = await api.get('/consultations');
        return response.data;
    },

    async getConsultationById(id: string): Promise<IConsultation> {
        const response = await api.get(`/consultations/${id}`);
        return response.data;
    },

    async acceptConsultation(id: string): Promise<IConsultation> {
        const response = await api.post(`/consultations/${id}/accept`);
        return response.data;
    },

    async proposeNewTime(id: string, data: { scheduledDate: string; scheduledTime: string }): Promise<IConsultation> {
        const response = await api.post(`/consultations/${id}/propose`, data);
        return response.data;
    },

    async uploadDocument(id: string, file: File): Promise<IConsultation> {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(`/consultations/${id}/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    async cancelConsultation(id: string): Promise<IConsultation> {
        const response = await api.post(`/consultations/${id}/cancel`);
        return response.data;
    },

    async joinConsultation(id: string): Promise<IConsultation> {
        const response = await api.post(`/consultations/${id}/join`);
        return response.data;
    },

    async endConsultation(id: string, data?: { meetingNotes?: string; meetingSummary?: string }): Promise<IConsultation> {
        const response = await api.post(`/consultations/${id}/end`, data || {});
        return response.data;
    },

    async sendSignal(id: string, signalData: any): Promise<any> {
        const response = await api.post(`/consultations/${id}/signals`, signalData);
        return response.data;
    },

    async getSignals(id: string): Promise<any[]> {
        const response = await api.get(`/consultations/${id}/signals`);
        return response.data;
    },

    async clearSignals(id: string): Promise<void> {
        await api.post(`/consultations/${id}/signals/clear`);
    }
};
