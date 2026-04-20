import React, { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon, Save, X, Layout, ChevronRight, Loader2, Type } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

interface BlogForm {
    title: string;
    content: string;
    excerpt: string;
    premium: boolean;
    price: string | number;
    seoTitle: string;
    seoDescription: string;
    image: File | null;
    author: string;
}

export default function EditBlogPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { success, error } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [form, setForm] = useState<BlogForm>({
        title: "",
        content: "",
        excerpt: "",
        premium: false,
        price: "",
        seoTitle: "",
        seoDescription: "",
        image: null,
        author: "",
    });
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const { user } = useAuth();
    const authorId = user?.userId || "";

    useEffect(() => {
        const fetchBlog = async () => {
            try {
                const res = await api.get(`/blogs/${id}`);
                const b = res.data;
                setForm({
                    title: b.title || "",
                    content: b.content || "",
                    excerpt: b.excerpt || "",
                    premium: b.premium || false,
                    price: b.price || "",
                    seoTitle: b.seoTitle || "",
                    seoDescription: b.seoDescription || "",
                    author: b.author || "",
                    image: null,
                });
                if (b.image) setPreview(`${api.defaults.baseURL?.replace('/api', '')}${b.image}`);
            } catch (err) {
                console.error("Error fetching blog:", err);
                error("Failed to load blog");
            } finally {
                setLoading(false);
            }
        };
        fetchBlog();
    }, [id]);

    const set = (k: keyof BlogForm, v: any) => setForm(prev => ({ ...prev, [k]: v }));

    const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            set("image", file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const submit = async () => {
        if (!form.title.trim()) return error("A compelling title is required");
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append("title", form.title);
            fd.append("content", form.content);
            fd.append("excerpt", form.excerpt);
            fd.append("premium", String(form.premium));
            fd.append("price", String(form.price || 0));
            fd.append("seoTitle", form.seoTitle);
            fd.append("seoDescription", form.seoDescription);
            fd.append("author", form.author);
            fd.append("authorId", authorId);
            if (form.image) fd.append("image", form.image);

            const res = await api.put(`/blogs/${id}`, fd, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (res.status === 200) {
                success("Update successful!");
                navigate("/blog-posts");
            }
        } catch (e) {
            console.error(e);
            error("Error saving blog");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 min-h-screen font-sans bg-slate-50/50">
            <header className="px-8 py-5 border-b bg-white flex items-center justify-between sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/90">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/blog-posts")}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 font-display">Edit Publication</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate("/blog-posts")}
                        className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={saving}
                        className="bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-8 rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center text-sm disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                    </button>
                </div>
            </header>

            <main className="flex-1 p-8">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group transition-all hover:border-slate-300 hover:shadow-md">
                            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    Cover Media
                                </h3>
                            </div>
                            {preview ? (
                                <div className="relative aspect-video w-full overflow-hidden">
                                    <img src={preview} className="w-full h-full object-cover" alt="Cover" />
                                    <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="bg-white hover:bg-slate-50 text-slate-900 font-bold py-2.5 px-6 rounded-xl text-xs shadow-2xl transition-all active:scale-95"
                                        >
                                            Change Image
                                        </button>
                                        <button
                                            onClick={() => { set("image", null); setPreview(null); }}
                                            className="bg-rose-500 hover:bg-rose-600 text-white font-bold p-2.5 rounded-xl shadow-2xl transition-all active:scale-95"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-video w-full flex flex-col items-center justify-center bg-slate-50 border-none hover:bg-primary/10/30 transition-all cursor-pointer group p-12"
                                >
                                    <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100 mb-5 text-slate-300">
                                        <ImageIcon className="w-10 h-10" />
                                    </div>
                                    <span className="text-sm font-extrabold text-slate-600 uppercase tracking-widest">Upload Header Image</span>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImage} />
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-12">
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                                    <Type className="w-4 h-4 text-primary" />
                                    Headline
                                </label>
                                <input
                                    value={form.title}
                                    onChange={e => set("title", e.target.value)}
                                    className="w-full text-4xl font-extrabold text-slate-900 border-none focus:ring-0 placeholder:text-slate-100 font-display"
                                    placeholder="Striking title..."
                                />
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                                        <Layout className="w-4 h-4 text-primary" />
                                        Narrative
                                    </label>
                                </div>
                                <textarea
                                    rows={15}
                                    value={form.content}
                                    onChange={e => set("content", e.target.value)}
                                    className="w-full text-lg leading-relaxed text-slate-600 border-none focus:ring-0 placeholder:text-slate-100 resize-none font-sans"
                                    placeholder="Continue your expertise..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="lg:sticky lg:top-28 space-y-8">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-8">
                            <div
                                onClick={() => set("premium", !form.premium)}
                                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${form.premium ? "bg-primary/10/50 border-primary/20" : "bg-white border-slate-100"}`}
                            >
                                <p className="text-xs font-bold text-slate-900">Premium Content</p>
                                <div className={`w-11 h-6 rounded-full relative flex items-center transition-all ${form.premium ? "bg-primary" : "bg-slate-200"}`}>
                                    <span className={`absolute w-4 h-4 bg-white rounded-full transition-all ${form.premium ? "left-6" : "left-1"}`}></span>
                                </div>
                            </div>

                            {form.premium && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Price (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                        <input
                                            type="number"
                                            value={form.price}
                                            onChange={e => set("price", e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-3.5 text-sm font-bold text-slate-900 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-[10px]">Author Name</label>
                                <input
                                    value={form.author}
                                    onChange={e => set("author", e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:outline-none"
                                    placeholder="Legal Admin"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-[10px]">Short Excerpt</label>
                                <textarea
                                    rows={4}
                                    value={form.excerpt}
                                    onChange={e => set("excerpt", e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold text-slate-600 focus:outline-none resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
