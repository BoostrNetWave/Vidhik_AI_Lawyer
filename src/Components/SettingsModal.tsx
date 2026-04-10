import React, { useEffect, useState } from "react";
import { X, Settings, CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";

interface SettingsForm {
  bufferMins: number;
  minNoticeMins: number;
  maxDailyBookings: number;
  advanceWindowDays: number;
  approval: { manual: boolean; autoConfirm: boolean };
  sessionDurations: number[];
}

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  initial?: any;
  onSaved?: () => void;
}

const clamp = (n: any, min: number, max: number) => Math.max(min, Math.min(max, Number(n || 0)));

export default function SettingsModal({ visible, onClose, userId, initial, onSaved }: SettingsModalProps) {
  const [form, setForm] = useState<SettingsForm>({
    bufferMins: 15,
    minNoticeMins: 60,
    maxDailyBookings: 10,
    advanceWindowDays: 30,
    approval: { manual: false, autoConfirm: false },
    sessionDurations: [30, 60]
  });
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!initial) return;
    setForm({
      bufferMins: initial.bufferMins ?? 15,
      minNoticeMins: initial.minNoticeMins ?? 60,
      maxDailyBookings: initial.maxDailyBookings ?? 10,
      advanceWindowDays: initial.advanceWindowDays ?? 30,
      approval: {
        manual: Boolean(initial?.approval?.manual),
        autoConfirm: Boolean(initial?.approval?.autoConfirm)
      },
      sessionDurations: Array.isArray(initial?.sessionDurations) && initial.sessionDurations.length > 0
        ? initial.sessionDurations
        : [30, 60]
    });
  }, [initial]);

  const update = (key: keyof SettingsForm, val: any) => setForm(prev => ({ ...prev, [key]: val }));
  const updateApproval = (key: keyof SettingsForm['approval'], val: boolean) => setForm(prev => ({ ...prev, approval: { ...prev.approval, [key]: val } }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        bufferMins: clamp(form.bufferMins, 0, 60),
        minNoticeMins: clamp(form.minNoticeMins, 0, 1440),
        maxDailyBookings: clamp(form.maxDailyBookings, 0, 100),
        advanceWindowDays: clamp(form.advanceWindowDays, 1, 365),
        approval: {
          manual: false,
          autoConfirm: true
        },
        sessionDurations: (form.sessionDurations || []).map(n => Number(n)).filter(Boolean)
      };

      const res = await fetch(`http://localhost:5025/api/booking-prefs/settings?userId=${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onSaved && onSaved();
        onClose && onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Failed to save settings");
      }
    } catch (e) {
      alert("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  const csv = (arr: number[]) => (arr || []).join(", ");
  const parseCsv = (str: string) =>
    String(str || "")
      .split(",")
      .map(s => Number(s.trim()))
      .filter(n => !Number.isNaN(n) && n > 0);

  const InputField = ({ label, hint, value, onChange, type = "number", suffix }: any) => (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col">
        <label className="text-sm font-bold text-slate-800">{label}</label>
        {hint && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{hint}</span>}
      </div>
      <div className="relative">
        <input
          type={type}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          value={value}
          onChange={onChange}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-slate-400">
            {suffix.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="bg-white rounded-[2rem] w-full max-w-2xl relative shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Settings className="text-indigo-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Booking Preferences</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">System Settings</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <InputField
              label="Buffer Time"
              hint="Rest time between sessions"
              value={form.bufferMins}
              onChange={(e: any) => update("bufferMins", e.target.value)}
              suffix="mins"
            />

            <InputField
              label="Daily Limit"
              hint="Max appointments per day"
              value={form.maxDailyBookings}
              onChange={(e: any) => update("maxDailyBookings", e.target.value)}
              suffix="count"
            />




            <div className="md:col-span-2">
              <InputField
                label="Available Session Durations"
                hint="Comma-separated values"
                value={csv(form.sessionDurations)}
                onChange={(e: any) => update("sessionDurations", parseCsv(e.target.value))}
                type="text"
                suffix="CSV"
              />
            </div>
          </div>
          <div className="mt-10 flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-bold" onClick={onClose}>Discard</button>
            <button
              className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg flex items-center gap-2"
              onClick={save}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 size={16} />}
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
