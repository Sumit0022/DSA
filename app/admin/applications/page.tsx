// app/admin/applications/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ShieldCheck, XCircle, CheckCircle, Send, MessageSquare, MapPin, Paperclip, Info, Phone, Mail, Calendar, User, Loader2, X, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, doc, updateDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ApplicationsInbox() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // THE FIX: Hum object ki jagah sirf ID store karenge, taaki real-time data hamesha fresh rahe
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive the active application live from the state
  const activeApp = applications.find(app => app.id === selectedAppId);

  // ==========================================
  // FETCH ACTUAL DATA FROM FIREBASE (100% REAL-TIME LIVE)
  // ==========================================
  useEffect(() => {
    const appsRef = collection(db, "applications");
    const q = query(appsRef, orderBy("appliedAt", "desc"));
    
    // onSnapshot automatically listens for any new message or application 24/7
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedApps: any[] = [];
      snapshot.forEach((doc) => {
        fetchedApps.push({ id: doc.id, ...doc.data() });
      });
      setApplications(fetchedApps);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching live applications:", error);
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, []);

  // Auto-scroll chat to bottom whenever activeApp messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeApp?.messages]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeApp) return;

    const newMessage = { 
      id: Date.now(), // Unique key to avoid React map errors
      sender: "admin", 
      text: chatInput, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString()
    };
    
    const updatedMessages = [...(activeApp.messages || []), newMessage];

    // Optimistically clear input
    setChatInput("");

    try {
      // Live update to Firebase - the onSnapshot will automatically update the UI
      await updateDoc(doc(db, "applications", activeApp.id), {
        messages: updatedMessages
      });
    } catch (error) {
      console.error("Failed to send message", error);
      alert("Failed to send message. Please try again.");
    }
  };

  const handleAction = async (status: "approved" | "rejected") => {
    if (!activeApp) return;
    const confirmMsg = status === "approved" 
      ? "Are you sure you want to APPROVE this application? You will still need to assign them a post from the Ledger."
      : "Are you sure you want to REJECT? This will put the user on a 90-day cooldown.";
    
    if (confirm(confirmMsg)) {
      try {
        await updateDoc(doc(db, "applications", activeApp.id), { status });
      } catch (error) {
        console.error("Failed to update status", error);
      }
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`File selected: ${file.name}\n(Firebase Storage integration pending)`);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden relative">
      
      {/* ========================================== */}
      {/* LEFT PANE: INBOX LIST                      */}
      {/* ========================================== */}
      <div className="w-full md:w-1/3 border-r border-gray-200 flex flex-col bg-gray-50/50">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#007AFF]" />
            Screening Inbox
            <span className="ml-auto text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Live
            </span>
          </h2>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search applications..." className="w-full pl-9 pr-4 py-2.5 bg-gray-100 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#007AFF]/20 transition-all" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#007AFF]" />
              <p className="text-sm font-medium">Fetching live applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
              <ShieldCheck className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">No applications found.</p>
            </div>
          ) : (
            applications.map((app) => (
              <div 
                key={app.id} 
                onClick={() => setSelectedAppId(app.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${selectedAppId === app.id ? "bg-blue-50 border-l-4 border-l-[#007AFF]" : "hover:bg-gray-100 bg-white border-l-4 border-l-transparent"}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-gray-900">{app.name}</h4>
                  <span className="text-[10px] text-gray-400 font-semibold">
                    {app.appliedAt ? new Date(app.appliedAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "New"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3" /> {app.district}
                </p>
                {app.status === "pending" ? (
                  <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-widest rounded-md">Pending Review</span>
                ) : app.status === "approved" ? (
                  <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-md">Approved</span>
                ) : (
                  <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-widest rounded-md">Rejected</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* RIGHT PANE: CHAT & ACTION PANE             */}
      {/* ========================================== */}
      {activeApp ? (
        <div className="w-full md:w-2/3 flex flex-col bg-white h-full relative">
          
          {/* Header */}
          <div className="h-20 border-b border-gray-200 px-6 flex items-center justify-between bg-white shrink-0 z-10">
            <div 
              className="cursor-pointer group flex items-center gap-3"
              onClick={() => setShowProfile(true)}
              title="View full profile"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-[#007AFF] transition-colors">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#007AFF] transition-colors flex items-center gap-2">
                  {activeApp.name} <Info className="w-4 h-4 opacity-50" />
                </h3>
                <p className="text-xs text-gray-500">AppID: {activeApp.id} • {activeApp.district}</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            {activeApp.status === "pending" && (
              <div className="flex gap-2">
                <button onClick={() => handleAction("rejected")} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button onClick={() => handleAction("approved")} className="px-4 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
              </div>
            )}
            {activeApp.status === "approved" && <span className="text-green-600 font-bold text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Cleared</span>}
            {activeApp.status === "rejected" && <span className="text-red-600 font-bold text-sm flex items-center gap-1"><XCircle className="w-4 h-4"/> Cooldown Active</span>}
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#efeae2]" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-solid-color-pattern.jpg")', backgroundSize: 'cover', backgroundBlendMode: 'soft-light' }}>
            {activeApp.messages?.length > 0 ? (
              activeApp.messages.map((msg: any, index: number) => (
                <div key={msg.id || index} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2 shadow-sm relative ${msg.sender === "admin" ? "bg-[#d9fdd3] rounded-tr-none text-gray-900" : "bg-white rounded-tl-none text-gray-900"}`}>
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <span className="text-[10px] text-gray-400 font-medium block text-right mt-1.5">{msg.time}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 bg-white/60 p-3 rounded-lg w-max mx-auto text-sm backdrop-blur-sm">
                No messages yet. Start the screening interview.
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-gray-50 border-t border-gray-200 shrink-0">
            <form onSubmit={handleSendReply} className="flex gap-2 items-center">
              
              <button 
                type="button"
                onClick={handleAttachmentClick}
                disabled={activeApp.status !== "pending"}
                className="w-12 h-12 bg-white border border-gray-200 text-gray-500 rounded-xl flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-50 shrink-0"
                title="Attach Document/Image"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*,.pdf,.doc,.docx"
              />

              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={activeApp.status !== "pending"}
                placeholder={activeApp.status === "pending" ? "Type reply to applicant..." : "Chat locked. Application is closed."} 
                className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#007AFF] text-sm disabled:bg-gray-100 disabled:text-gray-400"
              />
              <button 
                type="submit" 
                disabled={!chatInput.trim() || activeApp.status !== "pending"}
                className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center hover:bg-black transition-colors disabled:opacity-50 disabled:bg-gray-300 shadow-sm shrink-0"
              >
                <Send className="w-5 h-5 ml-1" />
              </button>
            </form>
          </div>

        </div>
      ) : (
        <div className="w-full md:w-2/3 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
          <ShieldCheck className="w-16 h-16 mb-4 opacity-20" />
          <p className="font-medium">Select an application to view live screening chat</p>
        </div>
      )}

      {/* ========================================== */}
      {/* PROFILE DETAILS MODAL (WITH MEMBER DATE)   */}
      {/* ========================================== */}
      <AnimatePresence>
        {showProfile && activeApp && (
          <motion.div 
            initial={{ opacity: 0, x: 50 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 50 }} 
            className="absolute top-0 right-0 h-full w-full md:w-80 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Applicant Profile</h3>
              <button onClick={() => setShowProfile(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-tr from-[#007AFF] to-blue-400 text-white rounded-full flex items-center justify-center mx-auto shadow-md mb-4 text-2xl font-black">
                  {activeApp.name.charAt(0)}
                </div>
                <h2 className="text-xl font-black text-gray-900">{activeApp.name}</h2>
                <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-widest rounded-md mt-2">
                  ID: {activeApp.memberId || "VERIFIED"}
                </span>
              </div>

              <div className="space-y-4 pt-6 border-t border-gray-100">
                
                {/* NEW: Membership Joining Date */}
                <div className="flex items-start gap-3 text-sm">
                  <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">DSA Member Since</p>
                    <p className="font-medium text-gray-900">
                      {/* Falls back to active status if specific date isn't linked yet */}
                      {activeApp.memberJoinedAt ? new Date(activeApp.memberJoinedAt.toDate()).toLocaleDateString() : "Active Member"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Region</p>
                    <p className="font-medium text-gray-900">{activeApp.district}, {activeApp.state}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 text-sm">
                  <Phone className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone Number</p>
                    <a href={`tel:${activeApp.phone}`} className="font-medium text-[#007AFF] hover:underline">+91 {activeApp.phone || "N/A"}</a>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <Mail className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</p>
                    {activeApp.email ? (
                      <a href={`mailto:${activeApp.email}`} className="font-medium text-[#007AFF] hover:underline break-all">{activeApp.email}</a>
                    ) : (
                      <p className="font-medium text-gray-500">Not provided</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Application Date</p>
                    <p className="font-medium text-gray-900">
                      {activeApp.appliedAt ? new Date(activeApp.appliedAt.toDate()).toLocaleString() : "Recently"}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}