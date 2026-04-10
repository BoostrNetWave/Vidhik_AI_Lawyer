import React, { useEffect, useState } from "react";
import { X, Calendar, Clock, AlertCircle, CheckCircle2, Save, CalendarDays, Ban, RefreshCcw } from "lucide-react";

interface ManageModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  refreshData?: () => void;
}

export default function ManageModal({ visible, onClose, userId, refreshData }: ManageModalProps) {
  const [activeTab, setActiveTab] = useState<"slots" | "blackout">("slots");
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  // Slot Form State
  const [isRecurring, setIsRecurring] = useState<boolean>(true);
  const [specificDate, setSpecificDate] = useState<string>("");
  const [slot, setSlot] = useState({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00", duration: 60, breakMinutes: 15 });

  // Blackout Form State
  const [blackout, setBlackout] = useState({ startDate: "", endDate: "", reason: "" });

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Reset on open
  useEffect(() => {
    if (visible) {
      setActiveTab("slots");
      setMessage(null);
      setIsRecurring(true);
      setSpecificDate("");
      setSlot({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00", duration: 60, breakMinutes: 15 });
      setBlackout({ startDate: "", endDate: "", reason: "" });
    }
  }, [visible]);

  // Auto clear messages
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  if (!visible) return null;

  const addSlot = async () => {
    if (!userId) return setMessage({ type: "error", text: "Missing user id" });
    if (!slot.startTime || !slot.endTime) return setMessage({ type: "error", text: "Start and end time required" });
    if (slot.startTime >= slot.endTime) return setMessage({ type: "error", text: "Start time must be before End time" });
    if (slot.duration < 10) return setMessage({ type: "error", text: "Duration must be at least 10 minutes" });
    if (!isRecurring && !specificDate) return setMessage({ type: "error", text: "Specific date is required" });

    try {
      // Prepare payload
      const payloadSlot: any = { ...slot };
      if (!isRecurring) {
        payloadSlot.date = specificDate;
        // Calculate dayOfWeek from date for consistency/indexing if needed, though backend schema makes dayOfWeek required so we should keep it or set it.
        // Let's set dayOfWeek to the correct day of the chosen date
        const d = new Date(specificDate);
        payloadSlot.dayOfWeek = d.getDay();
      }

      const res = await fetch(`http://localhost:5025/api/booking-prefs/availability/slots?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recurringSlots: [payloadSlot] })
      });
      if (!res.ok) throw new Error(await res.text());
      setMessage({ type: "success", text: "Consultation slot added successfully" });
      refreshData && refreshData();
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: "Failed to save slot" });
    }
  };

  const addBlackout = async () => {
    if (!userId) return setMessage({ type: "error", text: "Missing user id" });
    if (!blackout.startDate || !blackout.endDate) return setMessage({ type: "error", text: "Start and end dates required" });
    if (blackout.startDate > blackout.endDate) return setMessage({ type: "error", text: "Start date cannot be after End date" });

    try {
      const res = await fetch(`http://localhost:5025/api/booking-prefs/availability/blackouts?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateRange: { start: blackout.startDate, end: blackout.endDate }, reason: blackout.reason })
      });
      if (!res.ok) throw new Error(await res.text());
      setMessage({ type: "success", text: "Blackout period added successfully" });
      refreshData && refreshData();
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: "Failed to save blackout period" });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    if (activeTab === "slots") await addSlot();
    else await addBlackout();
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="bg-white rounded-3xl w-full max-w-2xl relative shadow-2xl shadow-slate-900/20 overflow-hidden animate-in zoom-in-95 duration-300 my-8">

        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Manage Availability</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Configure your weekly schedule and time off</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-colors shadow-sm ring-1 ring-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {/* Tabs */}
          <div className="bg-slate-100 p-1.5 rounded-xl inline-flex w-full mb-8 border border-slate-200/60">
            <button
              onClick={() => setActiveTab("slots")}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all text-sm font-bold ${activeTab === "slots"
                  ? "bg-white text-indigo-600 shadow-md ring-1 ring-black/5"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
            >
              <CalendarDays size={18} />
              Consultation Slots
            </button>
            <button
              onClick={() => setActiveTab("blackout")}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all text-sm font-bold ${activeTab === "blackout"
                  ? "bg-white text-indigo-600 shadow-md ring-1 ring-black/5"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
            >
              <Ban size={18} />
              Blackout Dates
            </button>
          </div>

          {/* Alert Messages */}
          {message && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
              } animate-in fade-in slide-in-from-top-2`}>
              {message.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <span className="font-semibold text-sm">{message.text}</span>
            </div>
          )}

          {/* Content */}
          <form onSubmit={handleSave} className="space-y-6">
            {activeTab === "slots" ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

                {/* Mode Selection */}
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="slotMode"
                      checked={isRecurring}
                      onChange={() => setIsRecurring(true)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-bold text-slate-700 text-sm flex items-center gap-1">
                      <RefreshCcw size={14} /> Recurring Weekly
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="slotMode"
                      checked={!isRecurring}
                      onChange={() => setIsRecurring(false)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-bold text-slate-700 text-sm flex items-center gap-1">
                      <Calendar size={14} /> Specific Date
                    </span>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
                    {isRecurring ? "Select Day" : "Select Date"}
                  </label>
                  {isRecurring ? (
                    <select
                      value={slot.dayOfWeek}
                      onChange={e => setSlot({ ...slot, dayOfWeek: Number(e.target.value) })}
                      className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  ) : (
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="date"
                        value={specificDate}
                        onChange={e => setSpecificDate(e.target.value)}
                        className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Start Time</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={e => setSlot({ ...slot, startTime: e.target.value })}
                        className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">End Time</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={e => setSlot({ ...slot, endTime: e.target.value })}
                        className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Duration (mins)</label>
                    <input
                      type="number"
                      min={10}
                      step={5}
                      value={slot.duration}
                      onChange={e => setSlot({ ...slot, duration: Number(e.target.value) })}
                      className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Break (mins)</label>
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={slot.breakMinutes}
                      onChange={e => setSlot({ ...slot, breakMinutes: Number(e.target.value) })}
                      className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Start Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="date"
                        value={blackout.startDate}
                        onChange={e => setBlackout({ ...blackout, startDate: e.target.value })}
                        className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">End Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="date"
                        value={blackout.endDate}
                        onChange={e => setBlackout({ ...blackout, endDate: e.target.value })}
                        className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Reason (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Conference, Vacation, Maintenance"
                    value={blackout.reason}
                    onChange={e => setBlackout({ ...blackout, reason: e.target.value })}
                    className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {activeTab === "slots" ? "Add Slot" : "Add Blackout"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
