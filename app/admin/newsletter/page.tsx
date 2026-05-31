// app/admin/publishing/page.tsx
"use client";

import { useState } from "react";
import { Eye, Send, AlertTriangle, Globe, Loader2 } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PublishingHub() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Alert");
  const [content, setContent] = useState("");
  const [severity, setSeverity] = useState("Medium");
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return alert("Title and content are required.");
    
    setIsProcessing(true);
    try {
      await addDoc(collection(db, "watchdog"), {
        title,
        category,
        content,
        severity,
        author: "High Command",
        createdAt: serverTimestamp(),
      });
      alert("Alert Published Successfully to all Citizens!");
      setTitle(""); setContent("");
    } catch (error) {
      console.error("Error publishing:", error);
      alert("Failed to publish.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Eye className="w-6 h-6 text-[#007AFF]" /> Publishing Hub
        </h1>
        <p className="text-sm text-gray-500 mt-1">Broadcast official alerts and news to all citizens instantly.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm">
        <form onSubmit={handlePublish} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Alert Title</label>
              <input value={title} onChange={(e)=>setTitle(e.target.value)} type="text" placeholder="e.g., Massive Budget Scam Exposed" className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:border-[#007AFF] outline-none" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Category</label>
                <select value={category} onChange={(e)=>setCategory(e.target.value)} className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:border-[#007AFF] outline-none">
                  <option>Alert</option><option>News</option><option>Campaign</option><option>Achievement</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Severity</label>
                <select value={severity} onChange={(e)=>setSeverity(e.target.value)} className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:border-[#007AFF] outline-none">
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Detailed Content</label>
            <textarea value={content} onChange={(e)=>setContent(e.target.value)} rows={6} placeholder="Write the full report here..." className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-[#007AFF] outline-none" required />
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button type="submit" disabled={isPublishing} className="px-8 py-3.5 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2">
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
              {isPublishing ? "Broadcasting..." : "Broadcast Live"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}