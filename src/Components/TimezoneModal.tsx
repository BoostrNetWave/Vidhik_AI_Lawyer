import React, { useEffect, useState } from "react";
import { X, Globe, Clock, CheckCircle2, Navigation } from "lucide-react";

const ZONES = [
  "UTC",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney", "Asia/Kolkata"
];

interface TimezoneModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  current?: string;
  onSaved?: () => void;
}

export default function TimezoneModal({ visible, onClose, userId, current, onSaved }: TimezoneModalProps) {
  const [zone, setZone] = useState<string>(current || "UTC");
  const [nowPreview, setNowPreview] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => { setZone(current || "UTC"); }, [current]);

  useEffect(() => {
    let timer: any;
    const tick = () => {
      try {
        const fmt = new Intl.DateTimeFormat("en-US", {
          timeZone: zone, weekday: "long", year: "numeric", month: "long",
          day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
          hour12: true, timeZoneName: "short"
        });
        setNowPreview(fmt.format(new Date()));
      } catch {
        setNowPreview("");
      }
    };
    tick();
    timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [zone]);

  const autoDetect = () => {
    try {
      const detected = (Intl as any).DateTimeFormat().resolvedOptions().timeZone || "UTC";
      setZone(detected);
    } catch {
      setZone("UTC");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:5025/api/booking-prefs/timezone?userId=${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: zone })
      });
      if (res.ok) {
        onSaved && onSaved();
        onClose && onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Failed to save timezone");
      }
    } catch (e) {
      alert("Error saving timezone");
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="bg-white rounded-[2rem] w-full max-w-md relative shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Globe className="text-indigo-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Time Zone</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Localization</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-800 px-1">Select Jurisdiction</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                value={zone}
                onChange={e => setZone(e.target.value)}
              >
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <button
              className="w-full bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 rounded-xl px-4 py-3 flex items-center justify-center gap-3 transition-all group"
              type="button"
              onClick={autoDetect}
            >
              <Navigation size={18} className="text-indigo-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-slate-700">Auto-Detect Current Region</span>
            </button>
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <div className="text-slate-900 font-bold leading-relaxed">
                {nowPreview ? (
                  <>
                    <div className="text-base">{nowPreview.split(" at ")[0]}</div>
                    <div className="text-2xl text-indigo-600 mt-1">{nowPreview.split(" at ")[1] || nowPreview}</div>
                  </>
                ) : <span className="text-slate-400">Loading preview...</span>}
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100 flex gap-3">
            <button className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold" onClick={onClose}>Cancel</button>
            <button
              className="flex-[2] px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2"
              onClick={save}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <CheckCircle2 size={16} />}
              {saving ? "Saving..." : "Apply Local Time"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
import { Loader2 } from "lucide-react";
