import React, { useEffect, useState } from "react";
import { Plus, Search, Eye, Trash2, Edit3, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

interface BlogPost {
  _id: string;
  title: string;
  status: 'Draft' | 'Published';
  type: string;
  premium: boolean;
  price?: number;
  createdAt?: string;
}

interface ApiResponse {
  data: BlogPost[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

export default function BlogPostsPage() {
  const [rows, setRows] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const [search, setSearch] = useState<string>("");

  const navigate = useNavigate();

  const fetchBlogs = async (p: number = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/blogs?page=${p}&limit=10`);
      const data: ApiResponse = res.data;
      setRows(Array.isArray(data?.data) ? data.data : []);
      setPages(data?.pagination?.pages || 1);
      setPage(data?.pagination?.page || p);
    } catch (e) {
      console.error("fetchBlogs error", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await api.delete(`/blogs/${id}`);
      if (res.status === 200) fetchBlogs(page);
      else alert("Failed to delete");
    } catch (e) {
      alert("Network error");
    }
  };

  const togglePublish = async (id: string) => {
    try {
      const res = await api.post(`/blogs/${id}/toggle`);
      if (res.status === 200) fetchBlogs(page);
      else alert("Failed to update status");
    } catch (e) {
      alert("Network error");
    }
  };

  useEffect(() => { fetchBlogs(1); }, []);

  const filteredRows = rows.filter(r => r.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col flex-1 min-h-screen font-sans">
      <header className="px-8 py-6 border-b bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 shadow-sm backdrop-blur-md bg-white/90">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">Blog Editorial</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Manage and publish your legal insights</p>
        </div>
        <button
          onClick={() => navigate("/blogs/create")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-indigo-200 active:scale-95 flex items-center text-sm"
        >
          <Plus size={18} className="mr-2" />
          New Publication
        </button>
      </header>

      <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
          <div className="p-6 border-b border-slate-100 bg-slate-50/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  placeholder="Search by title..."
                  className="pl-10 py-2.5 border-2 border-slate-100 focus:border-indigo-500 focus:outline-none rounded-xl text-sm font-semibold w-64 md:w-80 transition-all font-sans"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="w-full overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="pl-6 py-4 text-left font-bold text-slate-900 uppercase tracking-tight text-[11px]">Publication Details</th>
                  <th className="py-4 text-left font-bold text-slate-900 uppercase tracking-tight text-[11px]">Type</th>
                  <th className="py-4 text-left font-bold text-slate-900 uppercase tracking-tight text-[11px]">Subscription</th>
                  <th className="py-4 text-left font-bold text-slate-900 uppercase tracking-tight text-[11px]">Published Date</th>
                  <th className="pr-6 py-4 text-left font-bold text-slate-900 uppercase tracking-tight text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Loading Library...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="h-40 text-center">
                      <p className="text-slate-400 font-medium italic">No publications found</p>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((post) => (
                    <tr key={post._id} className="hover:bg-slate-50/40 transition-colors group">
                      <td className="pl-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 font-display tracking-tight text-base leading-none mb-1 group-hover:text-indigo-600 transition-colors cursor-pointer">{post.title}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{post.status}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest ${post.status === "Published"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm shadow-emerald-50/50"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${post.status === "Published" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></span>
                            {post.status}
                          </span>
                          <button
                            onClick={() => togglePublish(post._id)}
                            className={`p-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-tight transition-all ${post.status === "Published"
                              ? "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                              : "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100 shadow-sm"
                              }`}
                          >
                            {post.status === "Published" ? "Make Draft" : "Publish Now"}
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold ${post.premium ? "text-indigo-600" : "text-slate-400"}`}>
                            {post.premium ? "Premium Content" : "Free Access"}
                          </span>
                          {post.premium && <span className="text-[10px] font-bold text-slate-900">₹{post.price || 0}</span>}
                        </div>
                      </td>
                      <td className="text-slate-600 font-bold font-mono text-xs">
                        {post.createdAt ? new Date(post.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}
                      </td>
                      <td className="pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            title="View Publication"
                            onClick={() => navigate(`/blogs/view/${post._id}`)}
                            className="p-2 hover:text-indigo-600 text-slate-400 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title="Edit Publication"
                            onClick={() => navigate(`/blogs/edit/${post._id}`)}
                            className="p-2 hover:text-emerald-600 text-slate-400 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            title="Delete Publication"
                            onClick={() => deletePost(post._id)}
                            className="p-2 hover:text-rose-600 text-slate-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em]">Library Content {page} / {pages}</p>
              <div className="flex gap-3">
                <button
                  className="h-9 px-5 rounded-xl border-2 border-slate-100 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={() => fetchBlogs(page - 1)}
                  disabled={page <= 1}
                >
                  Previous
                </button>
                <button
                  className="h-9 px-5 rounded-xl border-2 border-slate-100 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={() => fetchBlogs(page + 1)}
                  disabled={page >= pages}
                >
                  Next Page
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
