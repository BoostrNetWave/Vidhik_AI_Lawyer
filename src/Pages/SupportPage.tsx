import React, { useEffect, useState } from "react";
import api from "../lib/api";
import {
  LifeBuoy,
  PlusCircle,
  Search,
  Filter,
  MoreVertical,
  Eye,
  XCircle,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ShieldAlert
} from "lucide-react";
import CreateTicketModal from "../Components/CreateTicketModal";
import ViewTicketModal from "../Components/ViewTicketModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmationContext";

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

interface ApiResponse {
  data: Ticket[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

export default function SupportPage() {
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modal, setModal] = useState<boolean>(false);
  const [viewModal, setViewModal] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);

  const { user, token } = useAuth();
  const userId = user?.userId || "";

  const fetchTickets = async (p: number = 1) => {
    if (!userId || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/support/tickets?userId=${userId}&page=${p}&limit=20`);
      if (res.status === 200) {
        const data: ApiResponse = res.data;
        setRows(Array.isArray(data?.data) ? data.data : []);
        setPages(data?.pagination?.pages || 1);
        setPage(data?.pagination?.page || p);
      } else {
        setRows([]); setPages(1); setPage(1);
      }
    } catch (e) {
      console.error(e);
      setRows([]); setPages(1); setPage(1);
    } finally {
      setLoading(false);
    }
  };

  const closeTicket = async (id: string) => {
    try {
      const res = await api.post(`/support/tickets/${id}/close`);
      if (res.status === 200) {
        success("Ticket closed successfully");
        fetchTickets(page);
      } else {
        error("Failed to close ticket");
      }
    } catch (e) {
      error("Network error");
    }
  };

  const handleCloseTicket = (id: string) => {
    confirm({
      title: "Close Ticket",
      message: "Are you sure you want to close this support ticket? This action will mark the ticket as resolved.",
      type: "info",
      confirmText: "Close Ticket",
      onConfirm: () => closeTicket(id)
    });
  };

  useEffect(() => { fetchTickets(1); }, []);

  // Derived Stats
  const stats = [
    { label: "Total Tickets", value: rows.length, icon: <MessageSquare className="text-primary" />, change: "+5" },
    { label: "Open Issues", value: rows.filter(t => t.status !== "Closed").length, icon: <AlertCircle className="text-orange-500" />, change: "-2" },
    { label: "Resolved", value: rows.filter(t => t.status === "Closed").length, icon: <CheckCircle2 className="text-green-500" />, change: "+8" },
    { label: "Urgent", value: rows.filter(t => t.priority === "Urgent").length, icon: <ShieldAlert className="text-red-500" />, change: "!" },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-primary rounded-lg text-white shadow-lg shadow-indigo-100">
                <LifeBuoy size={20} />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Support Center</h1>
            </div>
            <p className="text-slate-500">Manage your support requests and technical inquiries.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setModal(true)}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-primary/90 transition-all active:scale-[0.98] gap-2"
            >
              <PlusCircle size={20} />
              Create New Ticket
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  {stat.icon}
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full ${stat.change.startsWith("+") ? "bg-green-50 text-green-600" : stat.change === "!" ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"}`}>
                  {stat.change === "!" ? "ACTION REQ" : `${stat.change} THIS WEEK`}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tickets Table Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search tickets by ID or subject..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                />
              </div>
              <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                <Filter size={18} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">Displaying {rows.length} Tickets</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="font-bold py-4 px-6 text-slate-900 uppercase tracking-widest text-[10px]">Reference</th>
                  <th className="font-bold py-4 px-6 text-slate-900 uppercase tracking-widest text-[10px]">Issue Details</th>
                  <th className="font-bold py-4 px-6 text-slate-900 uppercase tracking-widest text-[10px]">Category</th>
                  <th className="font-bold py-4 px-6 text-slate-900 uppercase tracking-widest text-[10px]">Priority</th>
                  <th className="font-bold py-4 px-6 text-slate-900 uppercase tracking-widest text-[10px]">Status</th>
                  <th className="font-bold py-4 px-6 text-slate-900 uppercase tracking-widest text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="mt-4 text-slate-500 font-bold">Syncing Support Data...</p>
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50/50 transition-all duration-200 group">
                      <td className="py-5 px-6">
                        <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-1 rounded-lg text-slate-600 border border-slate-200 group-hover:bg-white group-hover:text-primary group-hover:border-indigo-100 transition-colors">
                          {t.ticketId}
                        </span>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 mb-0.5">{t.subject}</span>
                          <span className="text-[11px] text-slate-400 font-medium">Created {t.createdAt ? new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "-"}</span>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-[11px] font-bold border border-slate-100">
                          {t.category}
                        </span>
                      </td>
                      <td className="py-5 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm ring-1 ring-inset ${t.priority === "Urgent" ? "bg-red-50 text-red-700 ring-red-100" :
                          t.priority === "High" ? "bg-orange-50 text-orange-700 ring-orange-100" :
                            t.priority === "Medium" ? "bg-primary/10 text-blue-700 ring-blue-100" :
                              "bg-slate-50 text-slate-600 ring-slate-100"
                          }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-5 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${t.status === "Closed" ? "bg-green-100 text-green-700" : "bg-indigo-100 text-indigo-700"
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${t.status === "Closed" ? "bg-green-500" : "bg-primary/100 animate-pulse"}`}></span>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                            title="View Details"
                            onClick={() => {
                              setSelectedTicket(t);
                              setViewModal(true);
                            }}
                          >
                            <Eye size={18} />
                          </button>
                          {t.status !== "Closed" && (
                            <button
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              onClick={() => handleCloseTicket(t._id)}
                              title="Close Ticket"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
                          <button className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all">
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-32 text-center">
                      <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4 grayscale">
                        <LifeBuoy size={32} className="text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-bold text-lg">No active support tickets</p>
                      <p className="text-slate-400 text-sm mt-1">If you're having issues, our team is ready to help.</p>
                      <button
                        onClick={() => setModal(true)}
                        className="mt-6 px-6 py-2 bg-primary text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-primary/90 transition-all"
                      >
                        Create Your First Ticket
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Page {page} of {pages}</span>
              <div className="flex items-center gap-2">
                <button
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  onClick={() => fetchTickets(Math.max(1, page - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </button>
                <button
                  className="px-4 py-2 border border-indigo-200 bg-white rounded-xl text-sm font-bold text-primary hover:bg-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-100/20"
                  onClick={() => fetchTickets(Math.min(pages, page + 1))}
                  disabled={page >= pages}
                >
                  Next Page
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateTicketModal
        visible={modal}
        onClose={() => setModal(false)}
        onCreated={() => fetchTickets(1)}
      />

      <ViewTicketModal
        visible={viewModal}
        onClose={() => {
          setViewModal(false);
          setSelectedTicket(null);
        }}
        ticket={selectedTicket}
      />


    </div>
  );
}
