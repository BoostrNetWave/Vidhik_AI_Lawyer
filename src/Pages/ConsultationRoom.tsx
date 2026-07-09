import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Video, FileText, ArrowLeft, Download, ShieldCheck, 
    Clock, ExternalLink, Lock, RefreshCcw, Upload, File
} from 'lucide-react';
import { consultationService, IConsultation } from '../services/consultationService';
import { useToast } from '../context/ToastContext';

export default function ConsultationRoom() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { success, error } = useToast();
    const [consultation, setConsultation] = useState<IConsultation | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'details' | 'docs'>('details');

    // Document upload state
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchDetails();
    }, [id]);

    const fetchDetails = async () => {
        try {
            const data = await consultationService.getConsultationById(id!);
            setConsultation(data);
        } catch (err) {
            console.error(err);
            error("Failed to load room details");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingDoc(true);
        try {
            await consultationService.uploadDocument(id!, file);
            success("Document uploaded successfully!");
            fetchDetails();
        } catch (err: any) {
            console.error(err);
            error(err.response?.data?.message || "Failed to upload document");
        } finally {
            setUploadingDoc(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
                <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-semibold font-sans">Connecting to secure Jitsi consultation room...</p>
            </div>
        );
    }

    if (!consultation) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
                <h3 className="text-xl font-bold text-slate-900 font-sans">Consultation Room Not Found</h3>
                <button 
                    onClick={() => navigate('/consultations')} 
                    className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl text-sm"
                >
                    Back to Consultations
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <button
                    onClick={() => navigate('/consultations')}
                    className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Exit Consultation Room
                </button>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-inner">
                    <Lock className="w-4 h-4 text-primary" />
                    Secure Encrypted Jitsi Session
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[75vh]">
                {/* Left Column: Embedded Jitsi Video Call */}
                <div className="lg:col-span-8 flex flex-col bg-[#0F172A] rounded-3xl overflow-hidden border border-slate-800 shadow-xl relative h-full">
                    {/* Status bar */}
                    <div className="bg-[#1E293B] px-6 py-4 flex items-center justify-between border-b border-slate-800 z-10">
                        <div className="flex items-center gap-3">
                            <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-white font-extrabold text-sm tracking-tight">{consultation.title}</span>
                            <span className="text-[10px] text-slate-400 bg-[#0F172A] border border-slate-850 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                {consultation.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 bg-[#0F172A] px-3 py-1 rounded-lg border border-slate-800 text-[11px] font-bold text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            {consultation.scheduledTime}
                        </div>
                    </div>

                    {/* Embedded Jitsi Iframe */}
                    <div className="flex-1 w-full bg-slate-950 relative overflow-hidden">
                        {consultation.meetingLink ? (
                            <iframe
                                src={consultation.meetingLink}
                                allow="camera; microphone; fullscreen; display-capture; autoplay"
                                className="w-full h-full border-0"
                                title="Jitsi Video Conference"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 h-full text-slate-500">
                                <Video className="w-12 h-12 text-slate-600 animate-bounce" />
                                <p className="font-bold text-sm">Meeting Link is missing.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Interaction sidebar (details & shared files) */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col h-full">
                    {/* Tab header */}
                    <div className="bg-slate-50 border-b border-slate-200 flex items-center justify-start p-1.5 h-14 shrink-0">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`flex-1 rounded-xl text-xs font-bold transition-all h-full flex items-center justify-center ${
                                activeTab === 'details' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Consultation Details
                        </button>
                        <button
                            onClick={() => setActiveTab('docs')}
                            className={`flex-1 rounded-xl text-xs font-bold transition-all h-full flex items-center justify-center ${
                                activeTab === 'docs' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Shared Documents ({consultation.documents?.length || 0})
                        </button>
                    </div>

                    {/* Tab content area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {activeTab === 'details' ? (
                            <div className="space-y-6 animate-in fade-in duration-200">
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Details</span>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 font-bold">
                                            {consultation.client?.fullName?.[0] || 'C'}
                                        </div>
                                        <div>
                                            <h4 className="font-extrabold text-slate-900 text-sm leading-none">{consultation.client?.fullName}</h4>
                                            <p className="text-[10px] text-slate-400 mt-1">{consultation.client?.email}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Advocate (You)</span>
                                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs font-semibold text-slate-700">
                                        <p className="text-slate-955 font-bold">Adv. {consultation.lawyer?.fullName}</p>
                                        <p className="text-[10px] text-primary font-bold uppercase tracking-wider mt-0.5">{consultation.lawyer?.expertise || 'Advocate'}</p>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inquiry Description</span>
                                    <p className="text-xs text-slate-650 leading-relaxed bg-slate-50 border border-slate-100 p-4 rounded-2xl whitespace-pre-wrap font-medium">
                                        {consultation.description}
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled consultation time</span>
                                    <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold text-slate-750">
                                        <Clock className="w-4 h-4 text-primary" />
                                        <span>
                                            {new Date(consultation.scheduledDate).toLocaleDateString()} • {consultation.scheduledTime}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in duration-200 flex flex-col h-full">
                                <div className="flex justify-between items-center mb-1 shrink-0">
                                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider font-sans">Shared Files</h4>
                                    <button 
                                        onClick={fetchDetails}
                                        className="text-[10px] font-bold text-primary flex items-center gap-1"
                                    >
                                        <RefreshCcw size={10} /> Sync
                                    </button>
                                </div>

                                {/* Upload trigger */}
                                <div className="shrink-0">
                                    <input 
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        accept=".jpeg,.jpg,.png,.gif,.pdf,.doc,.docx"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingDoc}
                                        className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 h-11 transition-all"
                                    >
                                        <Upload className="h-4 w-4" />
                                        {uploadingDoc ? "Uploading..." : "Upload New File"}
                                    </button>
                                    <p className="text-[9px] text-slate-400 text-center mt-1.5 leading-relaxed font-sans">
                                        Supported: PDFs, Word, and images up to 10MB.
                                    </p>
                                </div>

                                <hr className="border-slate-100 shrink-0" />

                                <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
                                    {consultation.documents?.length === 0 ? (
                                        <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                                            <FileText size={28} className="mx-auto mb-2 text-slate-350" />
                                            <p className="font-bold text-xs">No documents uploaded yet</p>
                                        </div>
                                    ) : (
                                        consultation.documents.map((doc, idx) => (
                                            <div key={idx} className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-2.5 truncate">
                                                    <div className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 shrink-0">
                                                        <File className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div className="truncate">
                                                        <h5 className="font-bold text-slate-800 text-xs truncate" title={doc.name}>{doc.name}</h5>
                                                        <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">By {doc.uploadedBy}</span>
                                                    </div>
                                                </div>
                                                <a
                                                    href={`/lawyer${doc.url}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-500 hover:text-slate-900 shrink-0 transition-colors shadow-sm"
                                                >
                                                    <Download size={14} />
                                                </a>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
