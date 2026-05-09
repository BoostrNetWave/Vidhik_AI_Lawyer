import React, { useEffect, useState } from "react";
import { X, CalendarCheck2, CheckCircle2, ShieldCheck, Calendar, Info, Loader2 } from "lucide-react";

interface CalendarSyncForm {
  googleEnabled: boolean;
  googleCalendarId: string;
  outlookEnabled: boolean;
  outlookCalendarId: string;
  syncAppointments: boolean;
  syncBlackouts: boolean;
}

interface CalendarSyncModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  initial?: any;
  onSaved?: () => void;
}

export default function CalendarSyncModal({ visible, onClose, userId, initial, onSaved }: CalendarSyncModalProps) {
  const [form, setForm] = useState<CalendarSyncForm>({
    googleEnabled: false,
    googleCalendarId: "",
    outlookEnabled: false,
    outlookCalendarId: "",
    syncAppointments: true,
    syncBlackouts: true
  });
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!initial) return;
    setForm({
      googleEnabled: !!initial.googleEnabled,
      googleCalendarId: initial.googleCalendarId || "",
      outlookEnabled: !!initial.outlookEnabled,
      outlookCalendarId: initial.outlookCalendarId || "",
      syncAppointments: initial.syncAppointments ?? true,
      syncBlackouts: initial.syncBlackouts ?? true
    });
  }, [initial]);

  const set = (k: keyof CalendarSyncForm, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/lawyer/api/calendar-sync/settings?userId=${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        onSaved && onSaved();
        onClose && onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Failed to save sync settings");
      }
    } catch (e) {
      alert("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl relative shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 my-8">
        <div className="px-10 py-8 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <CalendarCheck2 className="text-indigo-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Calendar Sync</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">External Integrations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400 font-bold">
            <X size={20} />
          </button>
        </div>

        <div className="p-10">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-6 rounded-3xl border-2 transition-all ${form.googleEnabled ? "border-indigo-100 bg-indigo-50/20 shadow-sm" : "border-slate-50 bg-slate-50/50"}`}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-900">Google Calendar</h3>
                  <input type="checkbox" checked={form.googleEnabled} onChange={e => set("googleEnabled", e.target.checked)} />
                </div>
                <input
                  type="text"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold"
                  placeholder="example@gmail.com"
                  value={form.googleCalendarId}
                  onChange={e => set("googleCalendarId", e.target.value)}
                  disabled={!form.googleEnabled}
                />
              </div>

              <div className={`p-6 rounded-3xl border-2 transition-all ${form.outlookEnabled ? "border-blue-100 bg-blue-50/20 shadow-sm" : "border-slate-50 bg-slate-50/50"}`}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-900">Outlook Calendar</h3>
                  <input type="checkbox" checked={form.outlookEnabled} onChange={e => set("outlookEnabled", e.target.checked)} />
                </div>
                <input
                  type="text"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold"
                  placeholder="user@outlook.com"
                  value={form.outlookCalendarId}
                  onChange={e => set("outlookCalendarId", e.target.value)}
                  disabled={!form.outlookEnabled}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer bg-slate-50/50">
                <span className="block text-sm font-bold text-slate-900">Sync Appointments</span>
                <input type="checkbox" checked={form.syncAppointments} onChange={e => set("syncAppointments", e.target.checked)} />
              </label>
              <label className="flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer bg-slate-50/50">
                <span className="block text-sm font-bold text-slate-900">Sync Blackouts</span>
                <input type="checkbox" checked={form.syncBlackouts} onChange={e => set("syncBlackouts", e.target.checked)} />
              </label>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-100 flex gap-3">
            <button className="flex-1 px-6 py-3 rounded-2xl border border-slate-200 text-sm font-bold" onClick={onClose}>Discard</button>
            <button
              className="flex-[2] px-8 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-3"
              onClick={save}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck size={20} />}
              {saving ? "Authorizing..." : "Authorize & Sync"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
