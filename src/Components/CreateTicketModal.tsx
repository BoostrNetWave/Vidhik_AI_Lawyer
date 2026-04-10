import React, { useEffect, useState } from "react";
import { X, Send, AlertCircle, LifeBuoy, Tag, Zap, ChevronDown, Paperclip } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface CreateTicketModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface TicketForm {
  subject: string;
  category: string;
  priority: string;
  description: string;
}

export default function CreateTicketModal({ visible, onClose, onCreated }: CreateTicketModalProps) {
  const [form, setForm] = useState<TicketForm>({ subject: "", category: "General", priority: "Medium", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const { user, token } = useAuth();
  const userId = user?.userId || "";

  useEffect(() => {
    if (!visible) {
      setForm({ subject: "", category: "General", priority: "Medium", description: "" });
      setFile(null);
      setSaving(false);
      setError("");
    }
  }, [visible]);

  const set = (k: keyof TicketForm, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const create = async () => {
    if (!form.subject.trim()) return setError("Please enter a subject.");
    if (!form.description.trim()) return setError("Please provide a description of your issue.");
    if (!userId) return setError("User session not found.");

    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('subject', form.subject.trim());
      formData.append('category', form.category);
      formData.append('priority', form.priority);
      formData.append('description', form.description);
      if (file) {
        formData.append('attachment', file);
      }

      const res = await fetch("http://localhost:5025/api/support/tickets", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        onCreated && onCreated();
        onClose && onClose();
        return;
      }

      const text = await res.text();
      let err: any; try { err = JSON.parse(text); } catch { err = { error: text || `HTTP ${res.status}` }; }
      setError(err?.error || "Failed to create ticket.");
    } catch (e) {
      console.error("Create ticket network error:", e);
      setError("Unable to connect to support server.");
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose}></div>

      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl relative shadow-2xl shadow-slate-900/20 overflow-hidden animate-in zoom-in-95 duration-300 my-8">
        {/* Header */}
        <div className="px-10 py-8 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <LifeBuoy className="text-indigo-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">New Support Ticket</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Help & Technical Assistance</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-colors shadow-sm ring-1 ring-slate-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-10">
          {error && (
            <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-2xl flex items-center gap-3 ring-1 ring-red-100 animate-in slide-in-from-top-2">
              <AlertCircle size={18} />
              <span className="text-sm font-bold">{error}</span>
            </div>
          )}

          <div className="space-y-6">
            <Field label="Subject" hint="Brief summary of the issue">
              <div className="relative group">
                <input
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-semibold transition-all outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white placeholder:text-slate-400"
                  placeholder="e.g., Cannot access booking calendar"
                  value={form.subject}
                  onChange={e => set("subject", e.target.value)}
                />
                <div className="absolute inset-0 rounded-2xl border border-indigo-500/0 group-focus-within:border-indigo-500/10 pointer-events-none transition-all"></div>
              </div>
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Category" hint="Impact area">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                    <Tag size={18} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <select
                    className="w-full bg-gradient-to-br from-slate-50/50 to-white border-2 border-slate-200 rounded-2xl pl-12 pr-12 py-4 text-sm font-bold transition-all outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-100/50 cursor-pointer appearance-none hover:border-slate-300"
                    value={form.category}
                    onChange={e => set("category", e.target.value)}
                  >
                    <option value="General">📋 General</option>
                    <option value="Booking">📅 Booking</option>
                    <option value="Payments">💳 Payments</option>
                    <option value="Technical">⚙️ Technical</option>
                    <option value="Other">📌 Other</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown size={18} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-focus-within:from-indigo-500/5 group-focus-within:to-purple-500/5 pointer-events-none transition-all"></div>
                </div>
              </Field>

              <Field label="Priority" hint="Urgency level">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                    <Zap size={18} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <select
                    className="w-full bg-gradient-to-br from-slate-50/50 to-white border-2 border-slate-200 rounded-2xl pl-12 pr-12 py-4 text-sm font-bold transition-all outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-100/50 cursor-pointer appearance-none hover:border-slate-300"
                    value={form.priority}
                    onChange={e => set("priority", e.target.value)}
                  >
                    <option value="Low">🟢 Low Priority</option>
                    <option value="Medium">🟡 Medium Priority</option>
                    <option value="High">🟠 High Priority</option>
                    <option value="Urgent">🔴 Urgent</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown size={18} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-focus-within:from-indigo-500/5 group-focus-within:to-purple-500/5 pointer-events-none transition-all"></div>
                </div>
              </Field>
            </div>

            <Field label="Detailed Description" hint="Include steps to reproduce or relevant details">
              <div className="relative">
                <textarea
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium transition-all outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white placeholder:text-slate-400 min-h-[150px] resize-y"
                  placeholder="Explain the issue you're facing in detail..."
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                />
              </div>
            </Field>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Attachment</label>
              <div className="relative">
                <input
                  type="file"
                  id="ticket-attachment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                    }
                  }}
                />
                <label
                  htmlFor="ticket-attachment"
                  className="flex items-center gap-3 px-5 py-4 bg-slate-50 border border-slate-200 border-dashed rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Paperclip size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700">
                      {file ? file.name : "Click to upload a file"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {file ? `${(file.size / 1024).toFixed(1)} KB` : "Max file size: 5MB"}
                    </span>
                  </div>
                  {file && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                      }}
                      className="ml-auto p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <X size={18} />
                    </button>
                  )}
                </label>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-100 flex gap-4">
            <button
              className="flex-1 px-6 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
              onClick={onClose}
              disabled={saving}
            >
              Discard
            </button>
            <button
              className="flex-[2] px-8 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
              onClick={create}
              disabled={saving}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              {saving ? "Processing..." : "Submit Ticket"}
            </button>
          </div>
        </div>
      </div>
    </div >
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
}

const Field = ({ label, children, hint }: FieldProps) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-bold text-slate-700">{label}</label>
    {children}
    {hint && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">{hint}</span>}
  </div>
);
