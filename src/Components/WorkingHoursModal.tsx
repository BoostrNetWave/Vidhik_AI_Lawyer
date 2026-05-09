import React, { useEffect, useState } from "react";
import { X, Clock, CheckCircle2, AlertCircle } from "lucide-react";

const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface WorkingHoursModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  initialData?: any;
  onSaved?: () => void;
}

export default function WorkingHoursModal({ visible, onClose, userId, initialData, onSaved }: WorkingHoursModalProps) {
  const [weekly, setWeekly] = useState<Record<string, any>>({
    mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: []
  });
  const [enabled, setEnabled] = useState<boolean[]>([true, true, true, true, true, false, false]);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!initialData) return;
    const w = initialData.weekly || {};
    const next: Record<string, any> = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
    dayKeys.forEach(k => { next[k] = Array.isArray(w[k]) ? w[k] : []; });
    setWeekly(next);
    setEnabled(dayKeys.map((k) => next[k].length > 0));
  }, [initialData]);

  const setTime = (idx: number, field: string, value: string) => {
    const key = dayKeys[idx];
    setWeekly(prev => {
      const clone = { ...prev };
      const arr = clone[key] && clone[key].length ? [...clone[key]] : [{ start: "", end: "" }];
      arr[0] = { ...arr[0], [field]: value };
      clone[key] = arr;
      return clone;
    });
  };

  const toggleDay = (idx: number, val: boolean) => {
    const key = dayKeys[idx];
    setEnabled(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
    setWeekly(prev => {
      const clone = { ...prev };
      clone[key] = val ? (clone[key].length ? clone[key] : [{ start: "09:00", end: "17:00" }]) : [];
      return clone;
    });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload: any = { weekly: {} };
      dayKeys.forEach((k, i) => {
        payload.weekly[k] = enabled[i] ? (weekly[k] && weekly[k].length ? weekly[k] : [{ start: "09:00", end: "17:00" }]) : [];
      });

      const res = await fetch(`/lawyer/api/booking-prefs/hours?userId=${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onSaved && onSaved();
        onClose && onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err?.error || "Failed to save working hours");
      }
    } catch (e) {
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose}></div>

      <div className="bg-white rounded-[2rem] w-full max-w-3xl relative shadow-2xl shadow-slate-900/20 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Clock className="text-indigo-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Define Working Hours</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Weekly Consultation Schedule</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-colors shadow-sm ring-1 ring-slate-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl flex items-center gap-3 ring-1 ring-red-100 animate-in slide-in-from-top-2">
              <AlertCircle size={18} />
              <span className="text-sm font-bold">{error}</span>
            </div>
          )}

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {dayLabels.map((label, idx) => {
              const k = dayKeys[idx];
              const range = weekly[k] && weekly[k][0] ? weekly[k][0] : { start: "", end: "" };
              const isEnabled = enabled[idx];
              return (
                <div key={k} className={`group grid grid-cols-12 items-center gap-4 p-4 rounded-2xl transition-all duration-200 ${isEnabled ? "bg-slate-50 border border-slate-200" : "bg-white border border-slate-100 opacity-60"}`}>
                  <div className="col-span-12 md:col-span-4 flex items-center gap-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isEnabled}
                        onChange={e => toggleDay(idx, e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner"></div>
                    </label>
                    <span className={`font-bold transition-colors ${isEnabled ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
                  </div>

                  <div className="col-span-6 md:col-span-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Start Time</label>
                      <input
                        type="time"
                        className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400`}
                        value={range.start || ""}
                        onChange={e => setTime(idx, "start", e.target.value)}
                        disabled={!isEnabled}
                      />
                    </div>
                  </div>

                  <div className="col-span-6 md:col-span-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1">End Time</label>
                      <input
                        type="time"
                        className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400`}
                        value={range.end || ""}
                        onChange={e => setTime(idx, "end", e.target.value)}
                        disabled={!isEnabled}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-500 font-medium max-w-xs">Changes will be updated across your public profile and availability calendar.</p>
            <div className="flex gap-3">
              <button className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all" onClick={onClose}>Discard</button>
              <button
                className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center gap-2"
                onClick={save}
                disabled={saving}
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : <CheckCircle2 size={16} />}
                {saving ? "Saving..." : "Save Schedule"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
