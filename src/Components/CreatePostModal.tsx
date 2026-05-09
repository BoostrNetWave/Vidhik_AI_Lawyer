import React, { useEffect, useState } from "react";

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
  authorId?: string;
}

export default function CreatePostModal({ visible, onClose, onCreated, authorId }: CreatePostModalProps) {
  const [form, setForm] = useState<any>({
    title: "",
    content: "",
    excerpt: "",
    premium: false,
    price: "",
    seoTitle: "",
    seoDescription: "",
    image: null
  });
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!visible) {
      setForm({
        title: "",
        content: "",
        excerpt: "",
        premium: false,
        price: "",
        seoTitle: "",
        seoDescription: "",
        image: null
      });
      setSaving(false);
    }
  }, [visible]);

  const set = (k: string, v: any) => setForm((prev: any) => ({ ...prev, [k]: v }));

  const create = async () => {
    if (!form.title.trim()) return alert("Title is required");
    if (form.premium && !Number(form.price)) return alert("Price is required for premium content");

    setSaving(true);

    try {
      const data = new FormData();
      data.append("title", form.title.trim());
      data.append("content", form.content);
      data.append("excerpt", form.excerpt);
      data.append("premium", String(form.premium));
      data.append("price", String(Number(form.price || 0)));
      data.append("status", "published");
      data.append("seoTitle", form.seoTitle);
      data.append("seoDescription", form.seoDescription);
      if (authorId) data.append("authorId", authorId);
      if (form.image) data.append("image", form.image);

      const res = await fetch("/lawyer/api/blogs", {
        method: "POST",
        body: data
      });

      if (res.ok) {
        onCreated && onCreated();
        onClose && onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Failed to create post");
      }
    } catch (e) {
      console.error(e);
      alert("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/40 overflow-auto">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-6 mt-8 md:mt-0 relative">
        <div className="text-lg font-semibold mb-4">Create New Blog Post</div>

        <div className="mb-4">
          <div className="text-sm font-medium mb-1">Title</div>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Enter post title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>

        <div className="mb-4">
          <div className="text-sm font-medium mb-1">Cover Image</div>
          <input
            type="file"
            accept="image/*"
            onChange={(e: any) => set("image", e.target.files[0])}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4">
          <div className="text-sm font-medium mb-1">Content</div>
          <textarea
            rows={6}
            className="w-full border rounded px-3 py-2"
            placeholder="Write your post content..."
            value={form.content}
            onChange={(e) => set("content", e.target.value)}
          />
        </div>

        <div className="mb-4">
          <div className="text-sm font-medium mb-1">Excerpt</div>
          <textarea
            rows={3}
            className="w-full border rounded px-3 py-2"
            placeholder="Brief summary..."
            value={form.excerpt}
            onChange={(e) => set("excerpt", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <label className="flex items-center gap-3 border rounded px-3 py-2">
            <input
              type="checkbox"
              checked={form.premium}
              onChange={(e) => set("premium", e.target.checked)}
            />
            <span className="text-sm font-medium">Premium Content</span>
          </label>
          <div>
            <div className="text-sm font-medium mb-1">Price (₹)</div>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              placeholder="Enter price"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              disabled={!form.premium}
              min={0}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 font-bold">
          <button className="px-4 py-2 rounded border" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="px-5 py-2 rounded bg-purple-600 text-white disabled:opacity-60"
            onClick={create}
            disabled={saving}
          >
            {saving ? "Creating..." : "Create Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
