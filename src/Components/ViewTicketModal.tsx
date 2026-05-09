import React from "react";
import { X, Calendar, Tag, AlertCircle, User, FileText } from "lucide-react";

interface Ticket {
    _id: string;
    ticketId: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    description: string;
    attachment?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface ViewTicketModalProps {
    visible: boolean;
    onClose: () => void;
    ticket: Ticket | null;
}

export default function ViewTicketModal({ visible, onClose, ticket }: ViewTicketModalProps) {
    if (!visible || !ticket) return null;

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "Urgent": return "bg-red-50 text-red-700 ring-red-100";
            case "High": return "bg-orange-50 text-orange-700 ring-orange-100";
            case "Medium": return "bg-blue-50 text-blue-700 ring-blue-100";
            default: return "bg-slate-50 text-slate-600 ring-slate-100";
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-y-auto">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose}></div>

            <div className="bg-white rounded-[2.5rem] w-full max-w-3xl relative shadow-2xl shadow-slate-900/20 overflow-hidden animate-in zoom-in-95 duration-300 my-8">
                {/* Header */}
                <div className="px-10 py-8 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            <FileText className="text-indigo-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-900">Ticket Details</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest font-mono">{ticket.ticketId}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-colors shadow-sm ring-1 ring-slate-200">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-10 space-y-6">
                    {/* Subject */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Subject</label>
                        <h3 className="text-xl font-bold text-slate-900">{ticket.subject}</h3>
                    </div>

                    {/* Meta Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Tag size={16} className="text-slate-400" />
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Category</label>
                            </div>
                            <p className="text-sm font-bold text-slate-900">{ticket.category}</p>
                        </div>

                        <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle size={16} className="text-slate-400" />
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Priority</label>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm ring-1 ring-inset ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority}
                            </span>
                        </div>

                        <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <User size={16} className="text-slate-400" />
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</label>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${ticket.status === "Closed" ? "bg-green-100 text-green-700" : "bg-indigo-100 text-indigo-700"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${ticket.status === "Closed" ? "bg-green-500" : "bg-indigo-500 animate-pulse"}`}></span>
                                {ticket.status}
                            </span>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Description</label>
                        <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6">
                            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                                {ticket.description}
                            </div>
                        </div>
                    </div>

                    {/* Attachment */}
                    {ticket.attachment && (
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Attachment</label>
                            <a
                                href={`/lawyer/${ticket.attachment.replace(/\\/g, '/')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                    <FileText size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">View Attachment</span>
                                    <span className="text-xs text-slate-400">Click to open file</span>
                                </div>
                            </a>
                        </div>
                    )}

                    {/* Timestamps */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                            <Calendar size={16} className="text-slate-400" />
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Created</p>
                                <p className="text-sm font-bold text-slate-900">
                                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }) : "-"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar size={16} className="text-slate-400" />
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Last Updated</p>
                                <p className="text-sm font-bold text-slate-900">
                                    {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }) : "-"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Close Button */}
                    <div className="pt-6">
                        <button
                            onClick={onClose}
                            className="w-full px-6 py-3.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
