import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit3, Calendar, Tag, User, Loader2, Lock } from "lucide-react";
import axios from "axios";

export default function ViewBlogPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [blog, setBlog] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchBlog = async () => {
            try {
                const res = await axios.get(`http://localhost:5025/api/blogs/${id}`);
                setBlog(res.data);
            } catch (err) {
                console.error("Error fetching blog:", err);
                alert("Failed to load blog post");
            } finally {
                setLoading(false);
            }
        };
        fetchBlog();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-slate-500">Blog not found</p>
                <button onClick={() => navigate("/blog-posts")} className="mt-4 text-indigo-600 hover:underline">
                    Back to Posts
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 min-h-screen font-sans bg-white pb-20">
            <header className="px-8 py-5 border-b bg-white flex items-center justify-between sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/blog-posts")}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">Preview Publication</h1>
                </div>
                <button
                    onClick={() => navigate(`/blogs/edit/${id}`)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-xl transition-all flex items-center gap-2 text-sm shadow-lg shadow-indigo-100"
                >
                    <Edit3 className="w-4 h-4" />
                    Edit Content
                </button>
            </header>

            <main className="max-w-4xl mx-auto mt-12 px-6 w-full">
                {blog.image && (
                    <div className="w-full aspect-video rounded-3xl overflow-hidden shadow-2xl mb-12">
                        <img src={`http://localhost:5025${blog.image}`} className="w-full h-full object-cover" alt={blog.title} />
                    </div>
                )}

                <div className="flex items-center gap-6 mb-8 text-slate-400">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                        <Calendar className="w-4 h-4" />
                        {new Date(blog.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                        <Tag className="w-4 h-4" />
                        {blog.type}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                        <User className="w-4 h-4" />
                        {blog.author}
                    </div>
                    {blog.premium && (
                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ml-auto">
                            Premium Content
                        </span>
                    )}
                </div>

                <h2 className="text-5xl font-extrabold text-slate-900 mb-10 leading-tight font-display tracking-tight">
                    {blog.title}
                </h2>

                <div className="prose prose-slate prose-lg max-w-none relative">
                    <div className={`text-slate-600 leading-relaxed whitespace-pre-wrap text-xl ${blog.premium ? 'blur-[2px] select-none h-[400px] overflow-hidden' : ''}`}>
                        {blog.premium ? blog.content.substring(0, 500) + "..." : blog.content}
                    </div>

                    {blog.premium && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-b from-white/30 to-white pt-20">
                            <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-indigo-100 shadow-2xl flex flex-col items-center max-w-md text-center">
                                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-200">
                                    <Lock className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Premium Content</h3>
                                <p className="text-slate-500 mb-8 font-medium">
                                    This publication is part of our premium collection. Unlock full access to continue reading.
                                </p>
                                <button
                                    onClick={() => navigate("/payments")}
                                    className="w-full bg-indigo-600 hover:bg-slate-900 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-xl shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2 group"
                                >
                                    <span>Unlock Full Access</span>
                                    <ArrowLeft className="w-5 h-5 rotate-180 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <p className="text-xs text-slate-400 mt-4 font-bold uppercase tracking-widest">
                                    One-time payment • Lifetime access
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {blog.excerpt && (
                    <div className="mt-16 p-8 bg-slate-50 rounded-3xl border border-slate-100 italic text-slate-500">
                        <span className="font-bold text-slate-900 not-italic block mb-2 uppercase tracking-widest text-[10px]">Snippet Preview</span>
                        "{blog.excerpt}"
                    </div>
                )}
            </main>
        </div>
    );
}
