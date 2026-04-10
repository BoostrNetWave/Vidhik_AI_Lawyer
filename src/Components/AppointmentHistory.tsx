import React, { useEffect, useState } from "react";
import { Users, Clock, Calendar, MoreVertical, ChevronRight } from "lucide-react";

interface Appointment {
  _id: string;
  clientName: string;
  service: string;
  date: string;
  time?: string;
  duration: number;
  amount: number;
  status: string;
  notes?: string;
}

interface AppointmentHistoryProps {
  consultantId: string;
}

export default function AppointmentHistory({ consultantId }: AppointmentHistoryProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5025/api/appointments/history/${consultantId}`);
      if (!res.ok) throw new Error("Failed to fetch appointments");
      const data = await res.json();

      setAppointments(
        Array.isArray(data) ? data.map((a: any) => ({
          _id: a._id,
          clientName: a.userId?.fullName || "Client",
          service: a.service,
          date: a.date,
          time: a.time,
          duration: a.duration || 60,
          amount: a.amount || 0,
          status: a.status,
          notes: a.notes || ""
        })) : []
      );
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (consultantId) fetchHistory();
  }, [consultantId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Recent Appointments</h2>
          <p className="text-sm text-slate-500">View and manage your consultation history.</p>
        </div>
        <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <MoreVertical size={20} />
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="font-bold py-4 px-6 text-slate-900">Client Name</th>
                <th className="font-bold py-4 px-6 text-slate-900">Service</th>
                <th className="font-bold py-4 px-6 text-slate-900">Date & Time</th>
                <th className="font-bold py-4 px-6 text-slate-900">Amount</th>
                <th className="font-bold py-4 px-6 text-slate-900 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-slate-500 font-medium">Retrieving records...</p>
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Users size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-500 font-medium text-lg">No appointments found</p>
                    <p className="text-slate-400 text-sm">New bookings will appear here automatically.</p>
                  </td>
                </tr>
              ) : (
                appointments.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 border border-indigo-100">
                          {a.clientName.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-900">{a.clientName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-600">{a.service || "Standard Consultation"}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{new Date(a.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        <span className="text-xs text-slate-500">{a.time || new Date(a.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} • {a.duration}m</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900">₹{a.amount}</td>
                    <td className="py-4 px-6 text-right">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${a.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : a.status === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                          }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${a.status === "completed" ? "bg-green-500" : a.status === "cancelled" ? "bg-red-500" : "bg-yellow-500"
                          }`}></span>
                        {(a.status || "pending").toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {appointments.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
            <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1 group">
              View Full History
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
