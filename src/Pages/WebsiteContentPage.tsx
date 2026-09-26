import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import {
  Globe, RefreshCw, Save, Plus, Trash2, Edit3, X, Check,
  ChevronDown, ChevronRight, AlertCircle, Loader2, Database,
  Monitor, Layout, Star, DollarSign, HelpCircle, Users, ArrowRight,
  Eye, Image, Type, Code, Link, Search, RotateCcw, Zap, FileText
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────
interface ContentItem {
  _id: string;
  section: string;
  page: string;
  key: string;
  contentType: 'text' | 'image' | 'json' | 'richtext' | 'url';
  value: any;
  label: string;
  description?: string;
  isActive: boolean;
  order?: number;
  updatedAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────────
const PAGES = [
  { id: 'landing', label: 'Landing Page', icon: Monitor },
  { id: 'about', label: 'About Page', icon: Users },
  { id: 'services', label: 'Services Page', icon: Zap },
  { id: 'pricing', label: 'Pricing Page', icon: DollarSign },
  { id: 'how_it_works', label: 'How It Works', icon: ArrowRight },
];

const SECTION_ICONS: Record<string, React.ReactNode> = {
  hero: <Monitor size={16} />,
  workflow: <ArrowRight size={16} />,
  audience: <Users size={16} />,
  testimonials: <Star size={16} />,
  pricing: <DollarSign size={16} />,
  faq: <HelpCircle size={16} />,
  navbar: <Layout size={16} />,
  footer: <FileText size={16} />,
  about_hero: <Users size={16} />,
  services_hero: <Zap size={16} />,
};

const CONTENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <Type size={13} />,
  image: <Image size={13} />,
  json: <Code size={13} />,
  richtext: <FileText size={13} />,
  url: <Link size={13} />,
};

// ─── JSON Editor Component ───────────────────────────────────────────────────────
const JsonEditor: React.FC<{
  value: any;
  onChange: (v: any) => void;
  label: string;
  description?: string;
}> = ({ value, onChange, label, description }) => {
  const [raw, setRaw] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState<string | null>(null);

  const handleChange = (text: string) => {
    setRaw(text);
    try {
      const parsed = JSON.parse(text);
      setError(null);
      onChange(parsed);
    } catch {
      setError('Invalid JSON — fix before saving');
    }
  };

  return (
    <div className="space-y-2">
      {description && <p className="text-xs text-slate-500">{description}</p>}
      <textarea
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        rows={12}
        className={`w-full font-mono text-xs p-3 border rounded-xl resize-y bg-slate-50 focus:outline-none focus:ring-2 ${
          error ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-primary/20 focus:border-primary/40'
        }`}
      />
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
};

// ─── Single Content Item Card ────────────────────────────────────────────────────
const ContentCard: React.FC<{
  item: ContentItem;
  onSave: (id: string, value: any) => Promise<void>;
  onDelete: (id: string) => void;
}> = ({ item, onSave, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(item._id, editValue);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(item.value);
    setIsEditing(false);
  };

  const renderViewer = () => {
    if (item.contentType === 'json') {
      const arr = Array.isArray(item.value) ? item.value : [item.value];
      return (
        <div className="mt-2 space-y-2">
          {arr.slice(0, 2).map((entry: any, i: number) => (
            <div key={i} className="text-[11px] text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-100 font-mono truncate">
              {JSON.stringify(entry).slice(0, 120)}…
            </div>
          ))}
          {arr.length > 2 && (
            <p className="text-[11px] text-slate-400">+{arr.length - 2} more items</p>
          )}
        </div>
      );
    }
    if (item.contentType === 'image' || item.contentType === 'url') {
      return (
        <p className="mt-1 text-xs text-primary font-medium truncate">
          {String(item.value || '(empty)').slice(0, 80)}
        </p>
      );
    }
    return (
      <p className="mt-1 text-sm text-slate-600 line-clamp-2">
        {String(item.value || '').slice(0, 150)}
      </p>
    );
  };

  const renderEditor = () => {
    if (item.contentType === 'json') {
      return (
        <JsonEditor
          value={editValue}
          onChange={setEditValue}
          label={item.label}
          description={item.description}
        />
      );
    }
    if (item.contentType === 'richtext' || (typeof editValue === 'string' && editValue.length > 120)) {
      return (
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          rows={5}
          className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 resize-y"
        />
      );
    }
    return (
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
      />
    );
  };

  return (
    <div className={`bg-white rounded-2xl border ${saved ? 'border-green-300' : 'border-slate-100'} p-5 transition-all duration-300 hover:shadow-sm group`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1 text-[10px] font-bold text-primary/70 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
              {CONTENT_TYPE_ICONS[item.contentType]}
              {item.contentType}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{item.key}</span>
          </div>
          <h4 className="font-semibold text-sm text-slate-900">{item.label}</h4>
          {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-primary transition-colors"
              title="Edit"
            >
              <Edit3 size={14} />
            </button>
          )}
          <button
            onClick={() => onDelete(item._id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Content preview or editor */}
      <div className="mt-3">
        {!isEditing ? renderViewer() : renderEditor()}
      </div>

      {/* Edit actions */}
      {isEditing && (
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-all"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-all"
          >
            <X size={13} /> Cancel
          </button>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-1 mt-3 text-xs text-green-600 font-semibold">
          <Check size={13} /> Saved & published to website!
        </div>
      )}
    </div>
  );
};

// ─── Section Group ───────────────────────────────────────────────────────────────
const SectionGroup: React.FC<{
  section: string;
  items: ContentItem[];
  onSave: (id: string, value: any) => Promise<void>;
  onDelete: (id: string) => void;
  onReset: (section: string, page: string) => void;
  page: string;
}> = ({ section, items, onSave, onDelete, onReset, page }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-6">
      <div
        className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            {SECTION_ICONS[section] || <Globe size={16} />}
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 capitalize">{section.replace(/_/g, ' ')} Section</h3>
            <p className="text-[11px] text-slate-500">{items.length} field{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onReset(section, page); }}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-slate-200"
            title="Reset to default content"
          >
            <RotateCcw size={11} /> Reset
          </button>
          {collapsed ? <ChevronRight size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {items.map(item => (
            <ContentCard key={item._id} item={item} onSave={onSave} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Add Content Modal ───────────────────────────────────────────────────────────
const AddContentModal: React.FC<{
  onClose: () => void;
  onAdd: (data: any) => Promise<void>;
  currentPage: string;
}> = ({ onClose, onAdd, currentPage }) => {
  const [form, setForm] = useState({
    section: '',
    page: currentPage,
    key: '',
    contentType: 'text',
    value: '',
    label: '',
    description: '',
    order: 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onAdd(form);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-900">Add Content Field</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Page</label>
              <select
                value={form.page}
                onChange={(e) => setForm({ ...form, page: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                {PAGES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Section</label>
              <input
                type="text"
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                placeholder="e.g. hero, pricing"
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Unique Key</label>
            <input
              type="text"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              placeholder="e.g. hero.custom_banner_text"
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Label (admin display name)</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. Custom Banner Text"
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Content Type</label>
              <select
                value={form.contentType}
                onChange={(e) => setForm({ ...form, contentType: e.target.value as any })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="text">Text</option>
                <option value="richtext">Rich Text</option>
                <option value="url">URL / Link</option>
                <option value="image">Image URL</option>
                <option value="json">JSON Array/Object</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Order</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Value</label>
            {form.contentType === 'json' ? (
              <textarea
                value={typeof form.value === 'string' ? form.value : JSON.stringify(form.value, null, 2)}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                rows={6}
                placeholder='[]'
                className="w-full font-mono text-xs p-3 border border-slate-200 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            ) : (
              <textarea
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                rows={3}
                className="w-full text-sm p-3 border border-slate-200 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description (optional)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Helpful hint for this field"
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-all text-sm"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {saving ? 'Creating…' : 'Create Field'}
            </button>
            <button type="button" onClick={onClose} className="px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all text-sm">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────────
export default function WebsiteContentPage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [activePage, setActivePage] = useState('landing');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`website-content?page=${activePage}`);
      setContent(res.data.data || []);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to load content', 'error');
    } finally {
      setLoading(false);
    }
  }, [activePage]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await api.post('website-content/seed');
      showToast(res.data.message, 'success');
      await fetchContent();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Seeding failed', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleSave = async (id: string, value: any) => {
    try {
      await api.put(`website-content/${id}`, { value });
      setContent(prev => prev.map(c => c._id === id ? { ...c, value } : c));
      showToast('Content updated & published!', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Save failed', 'error');
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this content field? This cannot be undone.')) return;
    try {
      await api.delete(`website-content/${id}`);
      setContent(prev => prev.filter(c => c._id !== id));
      showToast('Field deleted.', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const handleReset = async (section: string, page: string) => {
    if (!confirm(`Reset "${section}" section to defaults? All custom values will be overwritten.`)) return;
    try {
      const res = await api.put(`website-content/reset/${page}/${section}`);
      showToast(res.data.message, 'success');
      await fetchContent();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Reset failed', 'error');
    }
  };

  const handleAdd = async (data: any) => {
    try {
      let value = data.value;
      if (data.contentType === 'json') {
        try { value = JSON.parse(data.value); } catch { /* raw string */ }
      }
      const res = await api.post('website-content', { ...data, value });
      setContent(prev => [...prev, res.data.data]);
      showToast('Content field created!', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Create failed', 'error');
    }
  };

  // Group content by section
  const filteredContent = content.filter(c =>
    !search || c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.key.toLowerCase().includes(search.toLowerCase()) ||
    String(c.value).toLowerCase().includes(search.toLowerCase())
  );

  const sections: Record<string, ContentItem[]> = {};
  for (const item of filteredContent) {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  }

  const activePg = PAGES.find(p => p.id === activePage);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2 transition-all duration-300 ${
          toast.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Globe size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">Website Content Manager</h1>
                <p className="text-sm text-slate-500">Edit and publish landing page & all page content in real-time.</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-100 text-amber-700 font-semibold text-sm rounded-xl hover:bg-amber-200 disabled:opacity-60 transition-all border border-amber-200"
              title="Seed the database with default content from the live website"
            >
              {seeding ? <Loader2 size={15} className="animate-spin" /> : <Database size={15} />}
              {seeding ? 'Seeding…' : 'Seed Defaults'}
            </button>
            <button
              onClick={fetchContent}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all border border-slate-200 shadow-sm"
            >
              <RefreshCw size={15} /> Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary/90 transition-all shadow-sm"
            >
              <Plus size={15} /> Add Field
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-5 p-4 bg-blue-50 border border-blue-200/60 rounded-2xl flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <Eye size={13} className="text-blue-600" />
          </div>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-0.5">Live Publishing</p>
            <p className="text-blue-700 text-xs leading-relaxed">
              Changes saved here are immediately visible on the deployed website. The main website fetches content from the <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">/api/website-content/public/landing</code> endpoint on every page load.
              Use <strong>Seed Defaults</strong> if the database is empty to populate with the current website content.
            </p>
          </div>
        </div>
      </div>

      {/* Page Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {PAGES.map(page => {
          const Icon = page.icon;
          return (
            <button
              key={page.id}
              onClick={() => setActivePage(page.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activePage === page.id
                  ? 'bg-primary text-white shadow-sm shadow-primary/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon size={14} />
              {page.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search fields in ${activePg?.label}…`}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
          <Loader2 size={36} className="animate-spin text-primary" />
          <p className="text-sm font-medium">Loading content…</p>
        </div>
      ) : Object.keys(sections).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
            <Database size={28} />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-slate-800 text-lg mb-1">No content found</h3>
            <p className="text-slate-500 text-sm mb-6">
              {search ? 'No fields match your search.' : `No content fields for ${activePg?.label} yet.`}
            </p>
            {!search && (
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-all mx-auto"
              >
                {seeding ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                {seeding ? 'Seeding database…' : 'Seed Default Content'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{filteredContent.length}</span> field{filteredContent.length !== 1 ? 's' : ''} across{' '}
              <span className="font-semibold text-slate-700">{Object.keys(sections).length}</span> section{Object.keys(sections).length !== 1 ? 's' : ''}
            </p>
          </div>

          {Object.entries(sections)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([section, items]) => (
              <SectionGroup
                key={section}
                section={section}
                page={activePage}
                items={items.sort((a, b) => (a.order || 0) - (b.order || 0))}
                onSave={handleSave}
                onDelete={handleDelete}
                onReset={handleReset}
              />
            ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddContentModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAdd}
          currentPage={activePage}
        />
      )}
    </div>
  );
}
