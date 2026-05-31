// app/admin/blog/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Eye, Image as ImageIcon, Send, Search, AlertCircle, Loader2, Trash2, Archive, ArchiveRestore, X, Edit3, Filter } from "lucide-react";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PublishingHub() {
  const [activeTab, setActiveTab] = useState<"blog" | "watchdog">("blog");
  
  // Editor States
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("Public");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  
  // Logic States
  const [isPublishing, setIsPublishing] = useState(false);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("All"); // All, Published, Draft, Archived

  const fileInputRef = useRef<HTMLInputElement>(null);

  // FETCH LIVE POSTS
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts: any[] = [];
      snapshot.forEach((docSnap) => {
        posts.push({ id: docSnap.id, ...docSnap.data() });
      });
      setRecentPosts(posts);
      setLoadingPosts(false);
    });
    return () => unsubscribe();
  }, []);

  // IMAGE UPLOAD HANDLER (Base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // PUBLISH OR UPDATE POST
  const handlePublish = async (status: "Published" | "Draft") => {
    if (!title.trim() || !content.trim()) {
      alert("Title and content are required.");
      return;
    }
    setIsPublishing(true);

    try {
      if (editingPostId) {
        // Update existing post
        await updateDoc(doc(db, "posts", editingPostId), {
          title,
          content,
          type: activeTab,
          status: status,
          visibility: visibility,
          coverImage: coverImage,
          updatedAt: serverTimestamp(),
        });
        alert("Post updated successfully!");
      } else {
        // Create new post
        await addDoc(collection(db, "posts"), {
          title,
          content,
          type: activeTab,
          status: status,
          visibility: visibility,
          coverImage: coverImage,
          author: "Admin Team", 
          createdAt: serverTimestamp(),
        });
        alert(`${activeTab === 'blog' ? 'Article' : 'Watchdog Alert'} saved successfully!`);
      }
      
      // Reset form
      handleCancelEdit();
    } catch (error) {
      console.error("Error publishing post:", error);
      alert("Failed to save post.");
    } finally {
      setIsPublishing(false);
    }
  };

  // EDIT POST (Load data into editor)
  const handleEdit = (post: any) => {
    setEditingPostId(post.id);
    setTitle(post.title);
    setContent(post.content);
    setVisibility(post.visibility || "Public");
    setCoverImage(post.coverImage || null);
    setActiveTab(post.type);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top for editing
  };

  // CANCEL EDIT
  const handleCancelEdit = () => {
    setEditingPostId(null);
    setTitle("");
    setContent("");
    setCoverImage(null);
    setVisibility("Public");
  };

  // DELETE POST
  const handleDelete = async (postId: string) => {
    if (confirm("Are you sure you want to permanently delete this post?")) {
      try {
        await deleteDoc(doc(db, "posts", postId));
        if (editingPostId === postId) handleCancelEdit();
      } catch (error) {
        alert("Error deleting post.");
      }
    }
  };

  // ARCHIVE POST
  const handleArchive = async (postId: string) => {
    try {
      await updateDoc(doc(db, "posts", postId), { status: "Archived" });
      if (editingPostId === postId) handleCancelEdit();
    } catch (error) {
      alert("Error archiving post.");
    }
  };

  // UNARCHIVE POST (Restores to Draft safely)
  const handleUnarchive = async (postId: string) => {
    try {
      await updateDoc(doc(db, "posts", postId), { status: "Draft" });
      alert("Post restored to Drafts. You can now edit and publish it.");
    } catch (error) {
      alert("Error restoring post.");
    }
  };

  // FILTER LOGIC
  const filteredPosts = recentPosts
    .filter(p => p.type === activeTab)
    .filter(p => statusFilter === "All" ? true : p.status === statusFilter);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* HEADER & TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Publishing Hub</h1>
          <p className="text-sm text-gray-500 mt-1">Manage official articles and Watchdog alerts.</p>
        </div>
        
        <div className="flex p-1 bg-gray-100 rounded-xl w-max">
          <button 
            onClick={() => { setActiveTab("blog"); handleCancelEdit(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "blog" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <FileText className="w-4 h-4" /> Articles
          </button>
          <button 
            onClick={() => { setActiveTab("watchdog"); handleCancelEdit(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "watchdog" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Eye className="w-4 h-4" /> Watchdog
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: THE EDITOR */}
        <div className={`lg:col-span-2 bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[600px] transition-colors ${editingPostId ? 'border-[#007AFF]/50 ring-4 ring-[#007AFF]/5' : 'border-gray-200'}`}>
          
          {/* Editor Toolbar */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-md ${editingPostId ? 'bg-blue-100 text-[#007AFF]' : 'bg-gray-200 text-gray-500'}`}>
                {editingPostId ? `Editing ${activeTab}` : `New ${activeTab}`}
              </span>
              {editingPostId && (
                <button onClick={handleCancelEdit} className="text-xs font-bold text-red-500 hover:underline">Cancel Edit</button>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button 
                onClick={() => handlePublish("Draft")}
                disabled={isPublishing}
                className="flex-1 sm:flex-none text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors border sm:border-none border-gray-200 rounded-lg sm:rounded-none py-2 sm:py-0"
              >
                Save Draft
              </button>
              <button 
                onClick={() => handlePublish("Published")}
                disabled={isPublishing}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#007AFF] text-white px-4 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold shadow-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingPostId ? <Edit3 className="w-4 h-4" /> : <Send className="w-4 h-4" />)} 
                {editingPostId ? "Update Post" : "Publish Now"}
              </button>
            </div>
          </div>

          {/* Editor Canvas */}
          <div className="p-6 sm:p-8 flex-1 flex flex-col">
            {coverImage && (
              <div className="relative w-full h-48 sm:h-64 mb-6 rounded-xl overflow-hidden group">
                <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setCoverImage(null)}
                  className="absolute top-3 right-3 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors backdrop-blur-md"
                  title="Remove Image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <input 
              type="text" 
              placeholder={activeTab === "blog" ? "Article Title..." : "Alert Headline..."}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl sm:text-3xl font-black text-gray-900 placeholder:text-gray-300 outline-none w-full bg-transparent mb-6"
            />
            
            <textarea 
              placeholder="Start writing here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 w-full text-gray-700 text-base sm:text-lg leading-relaxed placeholder:text-gray-300 outline-none bg-transparent resize-none"
            />
          </div>
          
          {/* Bottom Attachment Bar */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-2 sm:gap-4 overflow-x-auto">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-500 hover:text-[#007AFF] transition-colors p-2 rounded-lg hover:bg-blue-50 whitespace-nowrap"
            >
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" /> {coverImage ? "Change Cover Image" : "Add Cover Image"}
            </button>
            {activeTab === "watchdog" && (
              <button className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-500 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 whitespace-nowrap">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" /> Attach Proof/Source
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
                <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Author</label>
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#007AFF] to-[#34C759]"></div>
                  <span className="text-sm font-semibold text-gray-900">Admin Team</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Visibility</label>
                <select 
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 sm:py-2 text-sm outline-none focus:border-[#007AFF]"
                >
                  <option value="Public">Public (Visible to all)</option>
                  <option value="Members Only">Members Only (Requires Login)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Recent Posts Directory */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[400px]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                Recent <Filter className="w-3.5 h-3.5 text-gray-400" />
              </h3>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-white border border-gray-200 rounded-md px-2 py-1 outline-none focus:border-[#007AFF] font-medium text-gray-600"
              >
                <option value="All">All Status</option>
                <option value="Published">Published</option>
                <option value="Draft">Drafts</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
            
            <div className="divide-y divide-gray-100 overflow-y-auto flex-1 bg-white">
              {loadingPosts ? (
                 <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#007AFF]"/></div>
              ) : filteredPosts.length === 0 ? (
                 <div className="p-8 text-center text-gray-400 text-sm">No {statusFilter !== "All" ? statusFilter.toLowerCase() : ""} posts found.</div>
              ) : (
                filteredPosts.map(post => (
                  <div key={post.id} className={`p-4 hover:bg-gray-50 transition-colors group relative ${editingPostId === post.id ? 'bg-blue-50/50' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      
                      {/* Post Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 leading-tight mb-1 truncate">{post.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500">
                            {post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                          </span>
                          <span className="text-gray-300">&bull;</span>
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${post.status === 'Published' ? 'text-[#34C759]' : post.status === 'Archived' ? 'text-gray-500' : 'text-orange-500'}`}>
                            {post.status}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0 bg-white md:bg-transparent rounded-lg shadow-sm md:shadow-none p-1 md:p-0">
                        
                        <button onClick={() => handleEdit(post)} className="p-1.5 text-gray-400 hover:text-[#007AFF] hover:bg-blue-50 rounded-md transition-colors" title="Edit Post">
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {post.status === "Archived" ? (
                          <button onClick={() => handleUnarchive(post.id)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Restore to Drafts">
                            <ArchiveRestore className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => handleArchive(post.id)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors" title="Archive Post">
                            <Archive className="w-4 h-4" />
                          </button>
                        )}

                        <button onClick={() => handleDelete(post.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Delete permanently">
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}