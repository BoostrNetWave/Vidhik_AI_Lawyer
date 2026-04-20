import React, { useState, useEffect } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  Calendar,
  Clock,
  Settings,
  CalendarCheck2,
  Users,
  ClipboardList,
  TrendingUp,
  CheckCircle2,
  PlusCircle,
  MoreVertical,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import ManageModal from "../Components/ManageModal";

// import AppointmentHistory from "../Components/AppointmentHistory"; // Not used in the return but imported originally

import SettingsModal from "../Components/SettingsModal";



const tabs = [
  { key: "availability", label: "Availability", icon: <Calendar size={18} /> },

  { key: "settings", label: "Settings", icon: <Settings size={18} /> },

];

interface Slot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  duration: number;
  date?: string;
}

interface Blackout {
  start: string;
  end: string;
  reason?: string;
}



interface Appointment {
  _id: string;
  clientName?: string;
  userId?: { fullName: string };
  date: string;
  duration?: number;
  amount?: number;
  status: string;
}

import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmationContext";

export default function BookingManagementPage() {
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<string>("availability");

  // Availability state
  const [slots, setSlots] = useState<Slot[]>([]);
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Settings state
  const [settingsModal, setSettingsModal] = useState<boolean>(false);
  const [settingsData, setSettingsData] = useState<any>(null);

  // Appointment history state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);

  const { user } = useAuth();
  const userId = user?.userId;

  const fetchAvailability = async () => {
    try {
      const res = await api.get(`/booking-prefs/availability?userId=${userId}`);
      const data = res.data;
      setSlots(Array.isArray(data?.slotsSummary?.slots) ? data.slotsSummary.slots : []);
      setBlackouts(Array.isArray(data?.blackoutsUpcoming) ? data.blackoutsUpcoming : []);
    } catch (err) {
      console.error("fetchAvailability error:", err);
      // error("Failed to load availability"); // Optional: don't annoy user on load if trivial
      setSlots([]);
      setBlackouts([]);
    }
  };

  const fetchAppointments = async () => {
    try {
      // Use Payment API for history to ensure consistency with revenue
      // Pass userId and high limit (or handle pagination properly in future)
      const res = await api.get(`/payments/history?userId=${userId}&limit=50`);
      const data = res.data;

      const rows = Array.isArray(data?.data) ? data.data : [];

      // Map payment transaction structure back to Appointment format if needed, 
      // but we updated the API to include necessary fields directly.
      // Payment API returns: { _id, clientName, serviceType, date, amount, status, duration, userId: { fullName ... } }
      // This matches what the table expects mostly.

      setAppointments(rows);
    } catch (err) {
      console.error("Error fetching appointment history:", err);
      setAppointments([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get(`/booking-prefs/settings?userId=${userId}`);
      if (res.status === 200) setSettingsData(res.data);
    } catch (e) { console.error("fetchSettings error", e); }
  };

  const handleApprovePayment = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.post(`/payments/${id}/approve`);
      if (res.status === 200) {
        success("Payment approved & booking completed");
        fetchAppointments(); // Refresh list
      } else {
        error("Failed to approve payment");
      }
    } catch (err) {
      console.error("Payment approval error", err);
      error("Error processing approval");
    }
  };

  // Revenue state
  const [totalRevenue, setTotalRevenue] = useState<number>(0);

  const fetchRevenue = async () => {
    try {
      const res = await api.get("/payments/summary");
      if (res.status === 200) {
        const data = res.data;
        setTotalRevenue(data.totalEarnings || 0);
      }
    } catch (err) {
      console.error("fetchRevenue error:", err);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchAppointments();
      fetchRevenue();
    }
  }, [userId]);

  useEffect(() => {
    if (activeTab === "availability") fetchAvailability();

    if (activeTab === "settings") fetchSettings();
  }, [activeTab]);

  // Derived Stats
  const stats = [
    { label: "Total Bookings", value: appointments.length.toString(), icon: <ClipboardList className="text-primary" />, change: "+12%" },
    { label: "Pending", value: appointments.filter(a => a.status !== "completed" && a.status !== "cancelled").length.toString(), icon: <Clock className="text-yellow-500" />, change: "-2%" },
    { label: "Completed", value: appointments.filter(a => a.status === "completed").length.toString(), icon: <CheckCircle2 className="text-green-500" />, change: "+8%" },
    { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: <TrendingUp className="text-purple-500" />, change: "+15%" },
  ];

  const deleteSlot = (idx: number) => {
    confirm({
      title: "Delete Slot",
      message: "Are you sure you want to remove this consultation slot?",
      type: "danger",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await api.delete(`/booking-prefs/availability/slots?userId=${userId}`, {
            data: { index: idx }
          });
          success("Slot deleted successfully");
          fetchAvailability();
        } catch (e) {
          console.error(e);
          error("Failed to delete slot");
        }
      }
    });
  };

  const deleteBlackout = (idx: number) => {
    confirm({
      title: "Remove Blackout Date",
      message: "Are you sure you want to remove this blackout period? Clients will be able to book slots during this time.",
      type: "danger",
      confirmText: "Remove",
      onConfirm: async () => {
        try {
          await api.delete(`/booking-prefs/availability/blackouts?userId=${userId}`, {
            data: { index: idx }
          });
          success("Blackout period removed");
          fetchAvailability();
        } catch (e) {
          console.error(e);
          error("Failed to remove blackout period");
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Booking Management</h1>
            <p className="text-slate-500 mt-1">Configure your availability, consultation sessions and view history.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-primary text-white font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-all duration-200 gap-2"
            >
              <PlusCircle size={18} />
              Manage Availability
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  {stat.icon}
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${stat.change.startsWith("+") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                  {stat.change}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Custom Tabs Navigation */}
          <div className="flex border-b border-slate-100 p-2 bg-slate-50/50">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${activeTab === tab.key
                  ? "bg-white text-primary shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 md:p-8">
            {/* Availability Tab */}
            {activeTab === "availability" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">Availability & Blackout Dates</h2>
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/90 bg-primary/10 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-all"
                  >
                    <Settings size={16} />
                    Manage Availability
                  </button>
                </div>


                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Slots Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                      <Clock size={18} className="text-indigo-500" />
                      <h3 className="font-bold text-slate-700">Active Consultation Slots</h3>
                    </div>
                    <div className="p-5 space-y-4">
                      {slots.length > 0 ? (
                        slots.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 group">
                            <div className="flex items-center gap-3">
                              {s.date ? (
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center border border-primary/20 shadow-sm group-hover:scale-105 transition-transform">
                                  <span className="font-bold text-primary text-xs uppercase">
                                    {new Date(s.date).toLocaleDateString('en-US', { day: 'numeric' })}
                                  </span>
                                  <span className="text-[9px] text-indigo-400 font-bold uppercase leading-none">
                                    {new Date(s.date).toLocaleDateString('en-US', { month: 'short' })}
                                  </span>
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-200 shadow-sm group-hover:scale-105 transition-transform">
                                  <span className="font-bold text-primary text-xs uppercase">
                                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][s.dayOfWeek]}
                                  </span>
                                </div>
                              )}

                              <div>
                                <p className="font-semibold text-slate-900">{s.startTime} - {s.endTime}</p>
                                <p className="text-xs text-slate-500">
                                  {s.date ? new Date(s.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric' }) + " • " : ""}
                                  {s.duration} mins session
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => deleteSlot(idx)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                              title="Delete Slot"
                            >
                              <MoreVertical size={16} className="rotate-90" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6">
                          <AlertCircle size={32} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-slate-500 text-sm">No consultation slots defined.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Blackouts Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                      <CalendarCheck2 size={18} className="text-red-500" />
                      <h3 className="font-bold text-slate-700">Upcoming Blackout Dates</h3>
                    </div>
                    <div className="p-5 space-y-4">
                      {blackouts.length > 0 ? (
                        blackouts.map((b, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-red-50/30 border border-red-100">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {new Date(b.start).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                <span className="mx-2 text-slate-400">-</span>
                                {new Date(b.end).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                              <p className="text-xs text-red-600 font-medium">{b.reason || "Scheduled maintenance"}</p>
                            </div>
                            <button
                              onClick={() => deleteBlackout(idx)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-100/50 text-red-400 hover:text-red-600 transition-colors"
                            >
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6">
                          <CheckCircle2 size={32} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-slate-500 text-sm">No upcoming blackout dates.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}



            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-slate-900">Booking Preferences</h2>
                  <button
                    onClick={() => setSettingsModal(true)}
                    className="text-sm font-semibold text-primary hover:text-primary/90 px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    Configure
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 text-primary/90 rounded-lg"><Clock size={20} /></div>
                      <h3 className="font-bold text-slate-900">Session Options</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Durations</span>
                        <span className="text-slate-900 font-semibold">{Array.isArray(settingsData?.sessionDurations) ? settingsData.sessionDurations.join(", ") : "—"} mins</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Buffer Time</span>
                        <span className="text-slate-900 font-semibold">{settingsData?.bufferMins ?? 0} mins</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><ClipboardList size={20} /></div>
                      <h3 className="font-bold text-slate-900">Booking Rules</h3>
                    </div>
                    <div className="space-y-3">

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Daily Max</span>
                        <span className="text-slate-900 font-semibold">{settingsData?.maxDailyBookings ?? "None"}</span>
                      </div>

                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle2 size={20} /></div>
                      <h3 className="font-bold text-slate-900">Approvals</h3>
                    </div>
                    <div className="space-y-3">

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Auto-Confirm</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${settingsData?.approval?.autoConfirm ? "bg-indigo-100 text-primary/90" : "bg-slate-100 text-slate-500"}`}>
                          {settingsData?.approval?.autoConfirm ? "YES" : "NO"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}




          </div>
        </div>

        {/* Appointment History Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Recent Appointments</h2>
              <p className="text-sm text-slate-500">List of all recent consultations and their current status.</p>
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
                    <th className="font-bold py-4 px-6 text-slate-900">Date & Time</th>
                    <th className="font-bold py-4 px-6 text-slate-900">Duration</th>
                    <th className="font-bold py-4 px-6 text-slate-900">Amount</th>
                    <th className="font-bold py-4 px-6 text-slate-900 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-slate-500 font-medium">Loading records...</p>
                      </td>
                    </tr>
                  ) : appointments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <Users size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-500 font-medium text-lg">No appointments found</p>
                        <p className="text-slate-400 text-sm">When you get bookings, they'll appear here.</p>
                      </td>
                    </tr>
                  ) : (
                    appointments.map((appt) => (
                      <tr key={appt._id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                              {(appt.userId?.fullName || appt.clientName || "CL").charAt(0)}
                            </div>
                            <span className="font-bold text-slate-900">{appt.userId?.fullName || appt.clientName || "Client"}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">{new Date(appt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                            <span className="text-xs text-slate-500">{new Date(appt.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-600">{appt.duration || 60} mins</td>
                        <td className="py-4 px-6 font-bold text-slate-900">₹{appt.amount || 0}</td>
                        <td className="py-4 px-6 text-right">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${appt.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : appt.status === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                              }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${appt.status === "completed" ? "bg-green-500" : appt.status === "cancelled" ? "bg-red-500" : "bg-yellow-500"
                              }`}></span>
                            {(appt.status || "pending").toUpperCase()}
                          </span>
                          {appt.status !== "completed" && appt.status !== "cancelled" && (
                            <button
                              onClick={(e) => handleApprovePayment(appt._id, e)}
                              className="ml-3 text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20 hover:bg-indigo-100 transition-colors uppercase tracking-wide"
                              title="Mark as Paid / Complete"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {appointments.length > 0 && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
                <button className="text-sm font-bold text-primary hover:text-primary/90 transition-colors">View All Appointments</button>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <ManageModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          userId={userId || ""}
          refreshData={fetchAvailability}
        />


        <SettingsModal
          visible={settingsModal}
          onClose={() => setSettingsModal(false)}
          userId={userId || ""}
          initial={settingsData}
          onSaved={fetchSettings}
        />


      </div>
    </div>
  );
}
