import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Video, Calendar, Clock, RefreshCcw, Check, X, 
    FileText, ExternalLink, ArrowRight, CornerDownRight, Plus, Eye
} from 'lucide-react';
import { consultationService, IConsultation } from '../services/consultationService';
import { useToast } from '../context/ToastContext';

export default function ConsultationsPage() {
    const navigate = useNavigate();
    const { success, error } = useToast();
    const [consultations, setConsultations] = useState<IConsultation[]>([]);
    const [loading, setLoading] = useState(true);

    // Counter proposal modal states
    const [counterConsult, setCounterConsult] = useState<IConsultation | null>(null);
    const [counterDate, setCounterDate] = useState("");
    const [counterTime, setCounterTime] = useState("");
    const [submittingCounter, setSubmittingCounter] = useState(false);

    useEffect(() => {
        fetchConsultations();
    }, []);

    const fetchConsultations = async () => {
        try {
            setLoading(true);
            const data = await consultationService.getConsultations();
            setConsultations(data);
        } catch (err) {
            console.error(err);
            error("Failed to fetch consultations");
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (id: string) => {
        try {
            await consultationService.acceptConsultation(id);
            success("Consultation request accepted!");
            fetchConsultations();
        } catch (err: any) {
            console.error(err);
            error(err.response?.data?.message || "Failed to accept consultation");
        }
    };

    const handleProposeCounter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!counterConsult || !counterDate || !counterTime) return;

        setSubmittingCounter(true);
        try {
            await consultationService.proposeNewTime(counterConsult._id, {
                scheduledDate: counterDate,
                scheduledTime: counterTime
            });
            success("Counter-proposal sent to client.");
            setCounterConsult(null);
            fetchConsultations();
        } catch (err: any) {
            console.error(err);
            error(err.response?.data?.message || "Failed to propose counter time");
        } finally {
            setSubmittingCounter(false);
        }
    };

    const handleCancel = async (id: string) => {
        if (!window.confirm("Are you sure you want to decline/cancel this consultation?")) return;
        try {
            await consultationService.cancelConsultation(id);
            success("Consultation declined/cancelled.");
            fetchConsultations();
        } catch (err: any) {
            console.error(err);
            error(err.response?.data?.message || "Failed to cancel consultation");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_lawyer_approval':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">Pending Your Approval</span>;
            case 'pending_user_approval':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-100">Counter proposed (Awaiting Client)</span>;
            case 'pending_payment':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">Awaiting Client Payment</span>;
            case 'scheduled':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">Scheduled</span>;
            case 'completed':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">Completed</span>;
            case 'cancelled':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-100">Cancelled/Declined</span>;
            default:
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100">{status}</span>;
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Live Consultations</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage private scheduled legal counseling slots with your clients.</p>
                </div>
                <button
                    onClick={fetchConsultations}
                    className="flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 px-5 py-2.5 rounded-xl text-sm transition-all"
                >
                    <RefreshCcw size={16} />
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                    <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-semibold">Loading consultations...</p>
                </div>
            ) : consultations.length === 0 ? (
                <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl p-8 max-w-xl mx-auto space-y-4 shadow-sm">
                    <div className="h-16 w-16 bg-slate-50 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                        <Video size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">No consultations scheduled yet</h3>
                    <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto">
                        Client video call requests will appear here once booked via the client directory.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {consultations.map((consultation) => (
                        <div key={consultation._id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow p-6 sm:p-8 space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h3 className="text-xl font-extrabold text-slate-900 leading-tight">{consultation.title}</h3>
                                        {getStatusBadge(consultation.status)}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-500">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar size={14} className="text-primary" />
                                            {new Date(consultation.scheduledDate).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock size={14} className="text-primary" />
                                            {consultation.scheduledTime}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            ₹{consultation.totalFee} Fee
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                                    {consultation.status === 'pending_lawyer_approval' && (
                                        <>
                                            <button 
                                                onClick={() => handleAccept(consultation._id)}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs px-4 py-2 flex items-center gap-1 shadow-sm"
                                            >
                                                <Check size={14} /> Accept Request
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setCounterConsult(consultation);
                                                    setCounterDate(consultation.scheduledDate.split('T')[0]);
                                                    setCounterTime(consultation.scheduledTime);
                                                }}
                                                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs px-4 py-2"
                                            >
                                                Propose Counter
                                            </button>
                                        </>
                                    )}

                                    {consultation.status === 'scheduled' && (
                                        <button 
                                            onClick={() => navigate(`/consultations/${consultation._id}/meet`)}
                                            className="bg-primary text-white hover:bg-primary/95 rounded-xl font-bold text-xs px-5 py-2 flex items-center gap-1.5 shadow-md shadow-violet-100"
                                        >
                                            <Video size={14} /> Join Jitsi Call
                                        </button>
                                    )}

                                    {consultation.status !== 'completed' && consultation.status !== 'cancelled' && (
                                        <button 
                                            onClick={() => handleCancel(consultation._id)}
                                            className="text-red-500 hover:bg-red-50 rounded-xl text-xs font-bold px-4 py-2"
                                        >
                                            Decline/Cancel
                                        </button>
                                    )}
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-3">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Description / Inquiry Details</span>
                                    <p className="text-sm text-slate-650 leading-relaxed bg-slate-50 border border-slate-100 p-4 rounded-2xl whitespace-pre-wrap font-medium">
                                        {consultation.description}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Client Info</span>
                                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                                        <div className="h-10 w-10 bg-slate-200 rounded-xl overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-500">
                                            {consultation.client?.fullName?.[0] || 'C'}
                                        </div>
                                        <div>
                                            <h4 className="font-extrabold text-slate-900 text-sm leading-none">{consultation.client?.fullName}</h4>
                                            <p className="text-[10px] text-slate-400 mt-1.5 font-bold truncate max-w-[150px]">{consultation.client?.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Shared files list */}
                            {['scheduled', 'completed'].includes(consultation.status) && consultation.documents && consultation.documents.length > 0 && (
                                <div className="border-t border-slate-100 pt-6 space-y-3">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Shared Documents ({consultation.documents.length})</span>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {consultation.documents.map((doc, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-150 rounded-xl">
                                                <div className="flex items-center gap-2 truncate">
                                                    <FileText size={16} className="text-primary shrink-0" />
                                                    <div className="truncate">
                                                        <p className="text-xs font-bold text-slate-800 truncate" title={doc.name}>{doc.name}</p>
                                                        <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Uploaded by {doc.uploadedBy}</p>
                                                    </div>
                                                </div>
                                                <a 
                                                    href={`/lawyer${doc.url}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 shrink-0 shadow-sm"
                                                >
                                                    <ExternalLink size={13} />
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal: Counter Proposal */}
            {counterConsult && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden border border-slate-200 shadow-2xl flex flex-col p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-base font-bold text-slate-900">Propose Counter Date/Time</h3>
                            <button onClick={() => setCounterConsult(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleProposeCounter} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Choose Date</label>
                                <input 
                                    type="date"
                                    value={counterDate}
                                    onChange={(e) => setCounterDate(e.target.value)}
                                    required
                                    className="w-full h-11 border border-slate-200 rounded-xl px-3 text-sm font-semibold focus:outline-none"
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Choose Time</label>
                                <input 
                                    type="time"
                                    value={counterTime}
                                    onChange={(e) => setCounterTime(e.target.value)}
                                    required
                                    className="w-full h-11 border border-slate-200 rounded-xl px-3 text-sm font-semibold focus:outline-none"
                                />
                            </div>

                            <button 
                                type="submit"
                                disabled={submittingCounter}
                                className="w-full bg-primary text-white hover:bg-primary/95 rounded-xl h-11 font-bold shadow-sm"
                            >
                                {submittingCounter ? "Submitting Counter..." : "Propose Counter Time"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
