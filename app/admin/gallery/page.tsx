// app/admin/gallery/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Image as ImageIcon, Film, Plus, Edit3, Trash2, CheckCircle2, 
  AlertTriangle, Loader2, X, UploadCloud, Calendar, LayoutGrid, FileText, Settings
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminGallery() {
  const [posts, setPosts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | null }>({ message: "", type: null });
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: null }), 4000);
  };

  // 🔥 DYNAMIC CLOUDINARY CONFIG STATE 🔥
  const [cloudConfig, setCloudConfig] = useState({ cloudName: "", uploadPreset: "" });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Modals
  const [showPostModal, setShowPostModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Post Form
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [existingMedia, setExistingMedia] = useState<{url: string, type: string}[]>([]);
  const [newMediaFiles, setNewMediaFiles] = useState<{file: File, type: string, preview: string}[]>([]);
  
  // Event Form
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. Fetch Cloudinary Config
    const fetchConfig = async () => {
      try {
        const docSnap = await getDoc(doc(db, "settings", "cloudinary"));
        if (docSnap.exists()) {
          setCloudConfig({
            cloudName: docSnap.data().cloudName || "",
            uploadPreset: docSnap.data().uploadPreset || ""
          });
        }
      } catch (err) {
        console.error("Failed to load config", err);
      }
    };
    fetchConfig();

    // 2. Fetch Posts
    const qPosts = query(collection(db, "gallery_posts"), orderBy("createdAt", "desc"));
    const unsubPosts = onSnapshot(qPosts, (snap) => {
      setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // 3. Fetch Events
    const qEvents = query(collection(db, "gallery_events"), orderBy("date", "desc"));
    const unsubEvents = onSnapshot(qEvents, (snap) => {
      setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubPosts(); unsubEvents(); };
  }, []);

  // ─── CONFIG MANAGEMENT ───
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudConfig.cloudName || !cloudConfig.uploadPreset) {
      return showToast("Both fields are required", "error");
    }
    setIsSavingConfig(true);
    try {
      await setDoc(doc(db, "settings", "cloudinary"), cloudConfig);
      showToast("API Configuration saved successfully!", "success");
      setShowConfigModal(false);
    } catch (err) {
      showToast("Failed to save configuration", "error");
    } finally {
      setIsSavingConfig(false);
    }
  };

  // ─── EVENT MANAGEMENT ───
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !eventDate) return showToast("Name and Date required", "error");
    setIsProcessing(true);
    try {
      await addDoc(collection(db, "gallery_events"), {
        name: eventName,
        date: eventDate,
        createdAt: serverTimestamp()
      });
      setEventName(""); setEventDate("");
      setShowEventModal(false);
      showToast("Event created successfully", "success");
    } catch (err) {
      showToast("Failed to create event", "error");
    } finally { setIsProcessing(false); }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    await deleteDoc(doc(db, "gallery_events", id));
  };

  // ─── POST MANAGEMENT ───
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const mapped = files.map(file => ({
        file,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        preview: URL.createObjectURL(file)
      }));
      setNewMediaFiles(prev => [...prev, ...mapped]);
    }
  };

  const removeNewMedia = (index: number) => {
    setNewMediaFiles(prev => prev.filter((_, i) => i !== index));
  };
  const removeExistingMedia = (index: number) => {
    setExistingMedia(prev => prev.filter((_, i) => i !== index));
  };

  const openEditPost = (post: any) => {
    setEditingPostId(post.id);
    setCaption(post.caption || "");
    setSelectedEvent(post.eventId || "");
    setExistingMedia(post.media || []);
    setNewMediaFiles([]);
    setShowPostModal(true);
  };

  const resetPostForm = () => {
    setEditingPostId(null);
    setCaption("");
    setSelectedEvent("");
    setExistingMedia([]);
    setNewMediaFiles([]);
    setShowPostModal(false);
    setUploadProgress(0);
  };

  // 🔥 DIRECT CLOUDINARY UPLOAD ENGINE (Dynamic Config) 🔥
  const uploadToCloudinary = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const url = `https://api.cloudinary.com/v1_1/${cloudConfig.cloudName}/auto/upload`;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", cloudConfig.uploadPreset);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const prog = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(prog));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.secure_url);
        } else {
          console.error("Cloudinary Error:", xhr.responseText);
          reject("Upload failed");
        }
      };

      xhr.onerror = () => reject("Network error during upload");
      xhr.send(fd);
    });
  };

  const handleSavePost = async (status: "published" | "draft") => {
    if (!caption && newMediaFiles.length === 0 && existingMedia.length === 0) {
      return showToast("Cannot save empty post", "error");
    }

    if (!cloudConfig.cloudName || !cloudConfig.uploadPreset) {
      setShowConfigModal(true);
      return showToast("Please configure Cloudinary API details first.", "error");
    }

    setIsProcessing(true);
    setUploadProgress(0);
    try {
      let uploadedMediaUrls: {url: string, type: string}[] = [];
      
      // Upload New Files sequentially to update progress smoothly
      for (let i = 0; i < newMediaFiles.length; i++) {
        const item = newMediaFiles[i];
        const secureUrl = await uploadToCloudinary(item.file);
        uploadedMediaUrls.push({ url: secureUrl, type: item.type });
      }

      const finalMediaArray = [...existingMedia, ...uploadedMediaUrls];

      const payload = {
        caption,
        eventId: selectedEvent,
        eventName: events.find(e => e.id === selectedEvent)?.name || null,
        media: finalMediaArray,
        status,
        updatedAt: serverTimestamp()
      };

      if (editingPostId) {
        await updateDoc(doc(db, "gallery_posts", editingPostId), payload);
      } else {
        await addDoc(collection(db, "gallery_posts"), { ...payload, createdAt: serverTimestamp() });
      }

      showToast(`Post ${status} successfully`, "success");
      resetPostForm();
    } catch (err) {
      console.error(err);
      showToast("Failed to save post", "error");
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this post?")) return;
    await deleteDoc(doc(db, "gallery_posts", id));
    showToast("Post deleted", "success");
  };

  const filteredPosts = posts.filter(p => activeTab === "all" || p.status === activeTab);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 px-4 sm:px-6">
      <AnimatePresence>
        {toast.type && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-8 right-8 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm border backdrop-blur-xl ${toast.type === "success" ? "bg-gray-900 text-white border-gray-800" : "bg-red-50 text-red-600 border-red-200"}`}>
            {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-gray-900 rounded-3xl p-6 sm:p-10 shadow-2xl text-white flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-2">
            <LayoutGrid className="w-8 h-8 text-[#007AFF]"/> Gallery HQ
          </h1>
          <p className="text-gray-400 mt-2 font-medium">Manage official photos, videos, and event albums.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowConfigModal(true)} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors" title="API Settings">
            <Settings className="w-5 h-5"/>
          </button>
          <button onClick={() => setShowEventModal(true)} className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2">
            <Calendar className="w-4 h-4"/> Events
          </button>
          <button onClick={() => {resetPostForm(); setShowPostModal(true);}} className="px-5 py-3 bg-[#007AFF] hover:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4"/> New Post
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm min-h-[500px]">
        <div className="flex gap-2 overflow-x-auto pb-4 border-b border-gray-100 mb-6">
          {["all", "published", "draft"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
              {tab} Posts
            </button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" /></div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map(post => (
              <div key={post.id} className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow group bg-white flex flex-col">
                <div className="h-48 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                  {post.media?.length > 0 ? (
                    post.media[0].type === 'video' ? 
                      <Film className="w-10 h-10 text-gray-400" /> : 
                      <img src={post.media[0].url} className="w-full h-full object-cover" alt="cover"/>
                  ) : <FileText className="w-8 h-8 text-gray-300" />}
                  {post.media?.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                      1/{post.media.length}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button onClick={() => openEditPost(post)} className="w-10 h-10 bg-white text-gray-900 rounded-full flex items-center justify-center hover:scale-110 transition-transform"><Edit3 className="w-4 h-4"/></button>
                    <button onClick={() => handleDeletePost(post.id)} className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${post.status === 'published' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {post.status}
                    </span>
                    {post.eventName && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{post.eventName}</span>}
                  </div>
                  <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-relaxed flex-1">{post.caption || "No caption"}</p>
                  <p className="text-[10px] text-gray-400 mt-3">{post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString() : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── API CONFIGURATION MODAL ─── */}
      <AnimatePresence>
        {showConfigModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#007AFF]"/> API Settings
                </h2>
                <button onClick={() => setShowConfigModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleSaveConfig} className="p-6 space-y-5">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4">
                  <p className="text-xs text-blue-800 font-medium leading-relaxed">
                    Connect your free Cloudinary account to enable high-quality photo and video uploads. Ensure your upload preset is set to <strong>Unsigned</strong>.
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Cloud Name</label>
                  <input type="text" placeholder="e.g., dkfw69umo" value={cloudConfig.cloudName} onChange={e=>setCloudConfig({...cloudConfig, cloudName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-[#007AFF]"/>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Upload Preset (Unsigned)</label>
                  <input type="text" placeholder="e.g., dsa_gallery" value={cloudConfig.uploadPreset} onChange={e=>setCloudConfig({...cloudConfig, uploadPreset: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-[#007AFF]"/>
                </div>
                <button type="submit" disabled={isSavingConfig} className="w-full py-3.5 bg-gray-900 text-white font-bold text-sm rounded-xl shadow-md hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4">
                  {isSavingConfig ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>} 
                  {isSavingConfig ? "Saving..." : "Save Configuration"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── POST COMPOSER MODAL ─── */}
      <AnimatePresence>
        {showPostModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col my-8">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-3xl shrink-0">
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">{editingPostId ? 'Edit Post' : 'Create Post'}</h2>
                <button onClick={resetPostForm} disabled={isProcessing} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"><X className="w-5 h-5"/></button>
              </div>

              <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Caption</label>
                  <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write an engaging caption..." className="w-full h-24 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#007AFF] resize-none"/>
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Link Event Tag (Optional)</label>
                  <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-[#007AFF]">
                    <option value="">No Event (General Post)</option>
                    {events.map(e => <option key={e.id} value={e.id}>{e.name} ({e.date})</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Media Files</label>
                  
                  {/* File Previews */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                    {existingMedia.map((m, i) => (
                      <div key={`ext-${i}`} className="aspect-square relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100 group">
                        {m.type === 'video' ? <video src={m.url} className="w-full h-full object-cover"/> : <img src={m.url} className="w-full h-full object-cover"/>}
                        <button onClick={() => removeExistingMedia(i)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3"/></button>
                      </div>
                    ))}
                    {newMediaFiles.map((m, i) => (
                      <div key={`new-${i}`} className="aspect-square relative rounded-xl overflow-hidden border border-blue-200 bg-blue-50 group">
                        {m.type === 'video' ? <video src={m.preview} className="w-full h-full object-cover"/> : <img src={m.preview} className="w-full h-full object-cover"/>}
                        <button onClick={() => removeNewMedia(i)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3"/></button>
                      </div>
                    ))}
                    <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-[#007AFF] hover:border-[#007AFF] hover:bg-blue-50 transition-colors">
                      <Plus className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-bold uppercase">Add Media</span>
                    </button>
                  </div>
                  <input type="file" ref={fileInputRef} multiple accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
                </div>
                
                {isProcessing && uploadProgress > 0 && (
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#007AFF] h-full transition-all duration-300" style={{width: `${uploadProgress}%`}}></div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl flex gap-3 shrink-0">
                <button onClick={() => handleSavePost("draft")} disabled={isProcessing} className="flex-1 py-3 bg-white text-gray-700 font-bold text-sm border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50">
                  Save Draft
                </button>
                <button onClick={() => handleSavePost("published")} disabled={isProcessing} className="flex-1 py-3 bg-[#007AFF] text-white font-bold text-sm rounded-xl shadow-md hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <UploadCloud className="w-4 h-4"/>} 
                  {isProcessing ? `Uploading ${uploadProgress}%...` : "Publish Post"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── EVENT MANAGER MODAL ─── */}
      <AnimatePresence>
        {showEventModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                <h2 className="text-xl font-black text-gray-900">Manage Events</h2>
                <button onClick={() => setShowEventModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <form onSubmit={handleSaveEvent} className="bg-blue-50/50 p-4 border border-blue-100 rounded-2xl space-y-3">
                  <h3 className="text-xs font-bold text-blue-800 uppercase tracking-widest">Create New Event</h3>
                  <input type="text" placeholder="e.g., Independence Day 2026" value={eventName} onChange={e=>setEventName(e.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm outline-none focus:border-[#007AFF]"/>
                  <div className="flex gap-2">
                    <input type="date" value={eventDate} onChange={e=>setEventDate(e.target.value)} className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-sm outline-none focus:border-[#007AFF] text-gray-600"/>
                    <button type="submit" disabled={isProcessing} className="px-4 bg-[#007AFF] text-white font-bold text-xs rounded-lg hover:bg-blue-600 transition-colors">Add</button>
                  </div>
                </form>
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Existing Events Tag List</h3>
                  <div className="space-y-2">
                    {events.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No events found</p> : 
                      events.map(ev => (
                        <div key={ev.id} className="flex justify-between items-center bg-gray-50 border border-gray-100 p-3 rounded-xl">
                          <div>
                            <p className="font-bold text-sm text-gray-900">{ev.name}</p>
                            <p className="text-[10px] font-mono text-gray-500">{ev.date}</p>
                          </div>
                          <button onClick={() => handleDeleteEvent(ev.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}