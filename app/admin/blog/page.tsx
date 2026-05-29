// app/admin/blog/page.tsx
"use client";

import { useState } from "react";
import { FileText, Eye, Image as ImageIcon, Send, Archive, Plus, MoreVertical, Search, CheckCircle2, AlertCircle } from "lucide-react";
export default function PublishingHub() {
  const [activeTab, setActiveTab] = useState<"blog" | "watchdog">("blog");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Dummy data for recent posts
  const recentPosts = [
    { id: 1, title: "The Need for Educational Reform in UP", status: "Published", date: "May 28, 2026", type: "blog" },
    { id: 2, title: "Healthcare Budget Cuts Exposed", status: "Draft", date: "May 29, 2026", type: "watchdog" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* HEADER & TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Publishing Hub</h1>
          <p className="text-sm text-gray-500 mt-1">Manage official articles and Watchdog alerts.</p>
        </div>
        
        {/* Apple-style Segmented Control */}
        <div className="flex p-1 bg-gray-100 rounded-xl w-max">
          <button 
            onClick={() => setActiveTab("blog")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "blog" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <FileText className="w-4 h-4" /> Articles
          </button>
          <button 
            onClick={() => setActiveTab("watchdog")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "watchdog" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Eye className="w-4 h-4" /> Watchdog
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: THE EDITOR */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
          
          {/* Editor Toolbar */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-200 px-2 py-1 rounded-md">
                {activeTab === "blog" ? "New Article" : "New Watchdog Alert"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Save Draft</button>
              <button className="flex items-center gap-2 bg-[#007AFF] text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-600 transition-colors">
                <Send className="w-4 h-4" /> Publish
              </button>
            </div>
          </div>

          {/* Editor Canvas */}
          <div className="p-8 flex-1 flex flex-col">
            <input 
              type="text" 
              placeholder={activeTab === "blog" ? "Article Title..." : "Alert Headline..."}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-3xl font-black text-gray-900 placeholder:text-gray-300 outline-none w-full bg-transparent mb-6"
            />
            
            <textarea 
              placeholder="Start writing here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 w-full text-gray-700 text-lg leading-relaxed placeholder:text-gray-300 outline-none bg-transparent resize-none"
            />
          </div>
          
          {/* Bottom Attachment Bar */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-4">
            <button className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#007AFF] transition-colors p-2 rounded-lg hover:bg-blue-50">
              <ImageIcon className="w-5 h-5" /> Add Cover Image
            </button>
            {activeTab === "watchdog" && (
              <button className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50">
                <AlertCircle className="w-5 h-5" /> Attach Proof/Source
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT POSTS & SETTINGS */}
        <div className="space-y-6">
          
          {/* Quick Settings */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Post Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Author</label>
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#007AFF] to-[#34C759]"></div>
                  <span className="text-sm font-semibold text-gray-900">Admin Team</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Visibility</label>
                <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#007AFF]">
                  <option>Public (Visible to all)</option>
                  <option>Members Only (Requires Login)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Recent Posts Directory */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Recent Content</h3>
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <div className="divide-y divide-gray-100">
              {recentPosts.filter(p => p.type === activeTab).map(post => (
                <div key={post.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900 group-hover:text-[#007AFF] transition-colors line-clamp-1">{post.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{post.date}</span>
                        <span className="text-gray-300">&bull;</span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${post.status === 'Published' ? 'text-[#34C759]' : 'text-orange-500'}`}>
                          {post.status}
                        </span>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Fallback if no posts in category */}
              {recentPosts.filter(p => p.type === activeTab).length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No {activeTab} posts found.
                </div>
              )}
            </div>
            <div className="p-3 bg-gray-50 border-t border-gray-100">
              <button className="w-full text-center text-xs font-bold text-gray-500 hover:text-gray-900 uppercase tracking-widest">
                View Archive
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}