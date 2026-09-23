import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Video, Calendar, Clock, RefreshCcw, Check, X, 
    FileText, ExternalLink, ArrowRight, CornerDownRight, Plus, Eye,
    ShieldCheck, Lock, AlertCircle
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

    // Completed summary modal
    const [selectedSummary, setSelectedSummary] = useState<IConsultation | null>(null);

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
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-secondary text-primary border border-border">Pending Your Approval</span>;
            case 'pending_user_approval':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-secondary text-primary border border-border">Counter proposed (Awaiting Client)</span>;
            case 'pending_payment':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-secondary text-primary border border-border">Awaiting Client Payment</span>;
            case 'scheduled':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-secondary text-primary border border-border">Scheduled</span>;
            case 'completed':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">Completed</span>;
            case 'cancelled':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-secondary text-primary border border-border">Cancelled/Declined</span>;
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
                                        {consultation.status === 'scheduled' && consultation.meetingJoinedByClient && (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                                                Client in Room
                                            </span>
                                        )}
                                        {consultation.status === 'scheduled' && consultation.meetingJoinedByLawyer && (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                You Joined
                                            </span>
                                        )}
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
                                                className="bg-primary hover:bg-primary text-white rounded-xl font-bold text-xs px-4 py-2 flex items-center gap-1 shadow-sm"
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
                                            className="bg-primary text-white hover:bg-primary/95 rounded-xl font-bold text-xs px-5 py-2 flex items-center gap-1.5 shadow-md shadow-primary/10"
                                        >
                                            <Video size={14} />
                                            {consultation.meetingJoinedByClient ? "Client Joined • Join Room" : "Join Video Room"}
                                        </button>
                                    )}

                                    {consultation.status === 'completed' && (
                                        <button 
                                            onClick={() => setSelectedSummary(consultation)}
                                            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm"
                                        >
                                            <FileText size={14} className="text-primary" />
                                            View Summary
                                        </button>
                                    )}

                                    {consultation.status !== 'completed' && consultation.status !== 'cancelled' && (
                                        <button 
                                            onClick={() => handleCancel(consultation._id)}
                                            className="text-primary hover:bg-secondary rounded-xl text-xs font-bold px-4 py-2"
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

            {/* Modal: View Meeting Summary */}
            {selectedSummary && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                                    Completed Session
                                </span>
                                <h3 className="text-xl font-extrabold text-slate-900">Consultation Summary</h3>
                            </div>
                            <button 
                                onClick={() => setSelectedSummary(null)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto flex-1 font-sans">
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Topic / Title</span>
                                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">{selectedSummary.title}</h4>
                                    </div>
                                    <span className="text-xs font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                                        ₹{selectedSummary.totalFee} Fee
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs">
                                    <div>
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase block">Client</span>
                                        <span className="font-bold text-slate-800">{selectedSummary.client?.fullName}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase block">Meeting Duration</span>
                                        <span className="font-bold text-slate-800">{selectedSummary.meetingDuration ? `${selectedSummary.meetingDuration} mins` : "Completed"}</span>
                                    </div>
                                </div>

                                <div className="text-xs text-slate-500 pt-1">
                                    Scheduled: {new Date(selectedSummary.scheduledDate).toLocaleDateString()} at {selectedSummary.scheduledTime}
                                </div>
                            </div>

                            {selectedSummary.meetingNotes ? (
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recorded Notes & Advice</span>
                                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                                        {selectedSummary.meetingNotes}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-xs text-slate-500 italic text-center">
                                    No meeting notes recorded.
                                </div>
                            )}

                            {selectedSummary.documents && selectedSummary.documents.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shared Documents ({selectedSummary.documents.length})</span>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {selectedSummary.documents.map((doc, idx) => (
                                            <div key={idx} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between gap-3 text-xs">
                                                <div className="flex items-center gap-2 truncate">
                                                    <FileText size={16} className="text-primary shrink-0" />
                                                    <span className="font-bold text-slate-800 truncate">{doc.name}</span>
                                                </div>
                                                <a
                                                    href={`/lawyer${doc.url}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-primary hover:underline font-bold text-[11px] shrink-0"
                                                >
                                                    Download
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-1">
                                <p className="font-bold flex items-center gap-1.5 text-slate-900">
                                    <Lock size={14} className="text-slate-500" />
                                    Session Finalized • Rejoin Disabled
                                </p>
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    This consultation is complete. If the client requires further sessions, they will book and pay for a new consultation.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100">
                            <button 
                                onClick={() => setSelectedSummary(null)}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl h-11 text-xs transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
