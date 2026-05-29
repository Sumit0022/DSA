// app/admin/applications/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ShieldCheck, XCircle, CheckCircle, Send, MessageSquare, MapPin, Paperclip, Info, Phone, Mail, Clock, User, Loader2, X, ArrowLeft, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, doc, updateDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const POST_TITLES = [
  "President",
  "Working President",
  "Vice President",
  "General Secretary",
  "Secretary",
  "Chief Spokesperson",
  "Treasurer",
  "Executive Member"
];

export default function ApplicationsInbox() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showChatMobile, setShowChatMobile] = useState(false);
  
  // ROLE ASSIGNMENT STATES
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [assignLevel, setAssignLevel] = useState("District");
  const [assignTitle, setAssignTitle] = useState(POST_TITLES[0]);
  const [isProcessing, setIsProcessing] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeApp = applications.find(app => app.id === selectedAppId);

  // FETCH LIVE DATA
  useEffect(() => {
    const appsRef = collection(db, "applications");
    const q = query(appsRef, orderBy("appliedAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedApps: any[] = [];
      snapshot.forEach((document) => {
        fetchedApps.push({ id: document.id, ...document.data() });
      });
      setApplications(fetchedApps);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching live applications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeApp?.messages, showChatMobile]);

  // HANDLERS
  const handleAppSelect = (appId: string) => {
    setSelectedAppId(appId);
    setShowChatMobile(true);
  };

  const handleBackToList = () => {
    setShowChatMobile(false);
    setTimeout(() => setSelectedAppId(null), 300);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeApp) return;

    const newMessage = { 
      id: Date.now(), sender: "admin", text: chatInput, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString()
    };
    
    setChatInput("");
    try {
      await updateDoc(doc(db, "applications", activeApp.id), {
        messages: [...(activeApp.messages || []), newMessage]
      });
    } catch (error) {
      alert("Failed to send message. Please try again.");
    }
  };

  // 🔴 REJECT LOGIC
  const handleReject = async () => {
    if (!activeApp) return;
    if (confirm("Are you sure you want to REJECT? This will put the user on a 90-day cooldown.")) {
      try {
        const rejectMsg = {
          id: Date.now(), sender: "admin", 
          text: "⚠️ HIGH COMMAND UPDATE: Your application has been reviewed but unfortunately not approved at this time. Leadership requires immense ground presence. Please continue your local initiatives, gather support, and re-apply after the 90-day cooldown. Keep fighting the good fight!",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date().toISOString()
        };
        await updateDoc(doc(db, "applications", activeApp.id), { 
          status: "rejected",
          messages: [...(activeApp.messages || []), rejectMsg]
        });
      } catch (error) {
        console.error("Failed to update status", error);
      }
    }
  };

  // 🟢 APPROVE INIT (OPENS MODAL)
  const handleApproveInit = () => {
    if (!activeApp) return;
    setAssignLevel("District");
    setAssignTitle(POST_TITLES[0]);
    setShowRoleModal(true);
  };

  // 🟢 CONFIRM APPROVAL
  const confirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeApp || !activeApp.userId) return;
    setIsProcessing(true);

    let location = "India";
    if (assignLevel === "District") location = activeApp.district;
    if (assignLevel === "State") location = activeApp.state;
    const combinedRoleDisplay = assignLevel === "National" ? `National ${assignTitle}` : `${assignLevel} ${assignTitle}`;

    try {
      // 1. Give Member the Role
      await updateDoc(doc(db, "members", activeApp.userId), {
        role: combinedRoleDisplay,
        roleLevel: assignLevel,
        roleTitle: assignTitle,
        roleLocation: location
      });

      // 2. Auto Congratulations Message & Status update
      const congratsMsg = {
        id: Date.now(), sender: "admin", 
        text: `🎉 CONGRATULATIONS! The High Command has approved your application.\n\nYou are officially appointed as the ${combinedRoleDisplay} for ${location}. Please check your Local Leaders page to see your name on the Leaderboard. Your operational responsibilities begin immediately.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString()
      };

      await updateDoc(doc(db, "applications", activeApp.id), { 
        status: "approved",
        messages: [...(activeApp.messages || []), congratsMsg]
      });

      setShowRoleModal(false);
    } catch (error) {
      console.error("Failed to assign role", error);
      alert("Error approving application.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAttachmentClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) alert(`File selected: ${file.name}`);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-[var(--header-height,64px)])] md:h-[calc(100vh-120px)] bg-white border border-gray-200 rounded-none md:rounded-2xl shadow-sm overflow-hidden relative">
      
      {/* LEFT PANE */}
      <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col bg-gray-50/50 absolute md:relative inset-0 z-10 transition-transform duration-300 ${showChatMobile ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
        <div className="p-4 border-b border-gray-200 bg-white shrink-0">
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
              <div key={app.id} onClick={() => handleAppSelect(app.id)} className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${selectedAppId === app.id ? "bg-blue-50 border-l-4 border-l-[#007AFF]" : "hover:bg-gray-100 bg-white border-l-4 border-l-transparent"}`}>
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-gray-900">{app.name}</h4>
                  <span className="text-[10px] text-gray-400 font-semibold shrink-0">
                    {app.appliedAt ? new Date(app.appliedAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "New"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mb-2 truncate">
                  <MapPin className="w-3 h-3 shrink-0" /> {app.district}
                </p>
                {app.status === "pending" && <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-widest rounded-md">Pending Review</span>}
                {app.status === "approved" && <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-md">Approved</span>}
                {app.status === "rejected" && <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-widest rounded-md">Rejected</span>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANE */}
      <div className={`w-full md:w-2/3 flex flex-col bg-white h-full absolute md:relative inset-0 z-20 transition-transform duration-300 ${showChatMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        
        {activeApp ? (
          <>
            <div className="h-16 md:h-20 border-b border-gray-200 px-4 md:px-6 flex items-center justify-between bg-white shrink-0 z-10 shadow-sm md:shadow-none">
              <div className="flex items-center gap-2">
                <button onClick={handleBackToList} className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="cursor-pointer group flex items-center gap-2 md:gap-3" onClick={() => setShowProfile(true)} title="View full profile">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-[#007AFF] transition-colors shrink-0">
                    <User className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div className="overflow-hidden max-w-[120px] sm:max-w-xs">
                    <h3 className="font-bold text-sm md:text-lg text-gray-900 group-hover:text-[#007AFF] transition-colors flex items-center gap-1 truncate">
                      {activeApp.name} <Info className="w-3 h-3 md:w-4 md:h-4 opacity-50 shrink-0" />
                    </h3>
                    <p className="text-[10px] md:text-xs text-gray-500 truncate">{activeApp.district}</p>
                  </div>
                </div>
              </div>
              
              {activeApp.status === "pending" && (
                <div className="flex gap-1 md:gap-2">
                  <button onClick={handleReject} className="px-2 md:px-4 py-1.5 md:py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs md:text-sm font-bold transition-colors flex items-center gap-1">
                    <XCircle className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">Reject</span>
                  </button>
                  <button onClick={handleApproveInit} className="px-2 md:px-4 py-1.5 md:py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs md:text-sm font-bold transition-colors flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">Approve</span>
                  </button>
                </div>
              )}
              {activeApp.status === "approved" && <span className="text-green-600 font-bold text-xs md:text-sm flex items-center gap-1"><CheckCircle className="w-3 h-3 md:w-4 md:h-4"/> Cleared</span>}
              {activeApp.status === "rejected" && <span className="text-red-600 font-bold text-xs md:text-sm flex items-center gap-1"><XCircle className="w-3 h-3 md:w-4 md:h-4"/> Cooldown Active</span>}
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#efeae2]" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-solid-color-pattern.jpg")', backgroundSize: 'cover', backgroundBlendMode: 'soft-light' }}>
              {activeApp.messages?.length > 0 ? (
                activeApp.messages.map((msg: any, index: number) => (
                  <div key={msg.id || index} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-2 md:px-4 md:py-2 shadow-sm relative ${msg.sender === "admin" ? "bg-[#d9fdd3] rounded-tr-none text-gray-900" : "bg-white rounded-tl-none text-gray-900"}`}>
                      <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      <span className="text-[9px] md:text-[10px] text-gray-400 font-medium block text-right mt-1 md:mt-1.5">{msg.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 bg-white/60 p-2 md:p-3 rounded-lg w-max mx-auto text-xs md:text-sm backdrop-blur-sm">No messages yet.</div>
              )}
              <div ref={chatEndRef} className="h-2" />
            </div>

            <div className="p-3 md:p-4 bg-gray-50 border-t border-gray-200 shrink-0">
              <form onSubmit={handleSendReply} className="flex gap-2 items-center">
                <button type="button" onClick={handleAttachmentClick} disabled={activeApp.status !== "pending"} className="w-10 h-10 md:w-12 md:h-12 bg-white border border-gray-200 text-gray-500 rounded-xl flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-50 shrink-0">
                  <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.pdf,.doc,.docx" />
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} disabled={activeApp.status !== "pending"} placeholder={activeApp.status === "pending" ? "Type reply..." : "Chat locked. Application is closed."} className="flex-1 px-3 py-2.5 md:px-4 md:py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#007AFF] text-sm disabled:bg-gray-100 disabled:text-gray-400" />
                <button type="submit" disabled={!chatInput.trim() || activeApp.status !== "pending"} className="w-10 h-10 md:w-12 md:h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center hover:bg-black transition-colors disabled:opacity-50 disabled:bg-gray-300 shadow-sm shrink-0">
                  <Send className="w-4 h-4 md:w-5 md:h-5 ml-1" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center h-full bg-gray-50 text-gray-400">
            <ShieldCheck className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium">Select an application to view live screening chat</p>
          </div>
        )}
      </div>

      {/* ROLE ASSIGNMENT MODAL (MOBILE OPTIMIZED) */}
      <AnimatePresence>
        {showRoleModal && activeApp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-2xl md:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh]">
              <div className="bg-gray-50 border-b border-gray-100 p-4 md:p-6 flex justify-between items-start shrink-0">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900">Approve & Assign Role</h3>
                  <p className="text-xs md:text-sm text-gray-500 mt-1">Appointing {activeApp.name}.</p>
                </div>
                <button onClick={() => setShowRoleModal(false)} className="p-1.5 md:p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><X className="w-4 h-4 md:w-5 h-5" /></button>
              </div>
              <form onSubmit={confirmApproval} className="p-4 md:p-6 space-y-4 md:space-y-5 overflow-y-auto flex-1">
                <div className="space-y-3 md:space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Jurisdiction Level</label>
                    <select value={assignLevel} onChange={(e) => setAssignLevel(e.target.value)} className="w-full mt-1 px-3 py-2.5 md:px-4 md:py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:border-[#007AFF] outline-none shadow-sm">
                      <option value="District">District ({activeApp.district})</option>
                      <option value="State">State ({activeApp.state})</option>
                      <option value="National">National (India)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Official Post</label>
                    <select value={assignTitle} onChange={(e) => setAssignTitle(e.target.value)} className="w-full mt-1 px-3 py-2.5 md:px-4 md:py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:border-[#007AFF] outline-none shadow-sm">
                      {POST_TITLES.map((title) => <option key={title} value={title}>{title}</option>)}
                    </select>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 md:p-4 flex items-start gap-2 md:gap-3">
                  <Crown className="w-4 h-4 md:w-5 md:h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 font-medium">This citizen will be officially appointed as the <strong>{assignLevel === "National" ? "National" : assignLevel} {assignTitle}</strong>.</p>
                </div>
                <button type="submit" disabled={isProcessing} className="w-full py-3 md:py-3.5 bg-green-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {isProcessing ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Crown className="w-4 h-4 md:w-5 md:h-5" />}
                  {isProcessing ? "Processing..." : "Confirm Appointment"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PROFILE DETAILS MODAL */}
      <AnimatePresence>
        {showProfile && activeApp && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProfile(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden" />
            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="fixed md:absolute top-0 right-0 h-full w-4/5 max-w-[320px] md:w-80 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col">
              <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-gray-900">Applicant Profile</h3>
                <button onClick={() => setShowProfile(false)} className="p-1.5 md:p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-tr from-[#007AFF] to-blue-400 text-white rounded-full flex items-center justify-center mx-auto shadow-md mb-3 md:mb-4 text-xl md:text-2xl font-black">{activeApp.name.charAt(0)}</div>
                  <h2 className="text-lg md:text-xl font-black text-gray-900">{activeApp.name}</h2>
                  <span className="inline-block px-2 py-0.5 md:px-2.5 md:py-1 bg-gray-100 text-gray-600 text-[9px] md:text-[10px] font-bold uppercase tracking-widest rounded-md mt-1 md:mt-2">ID: {activeApp.memberId || "VERIFIED"}</span>
                </div>
                <div className="space-y-4 pt-4 md:pt-6 border-t border-gray-100">
                  <div className="flex items-start gap-3 text-xs md:text-sm">
                    <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-green-500 shrink-0" />
                    <div><p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">DSA Member Since</p><p className="font-medium text-gray-900">{activeApp.memberJoinedAt ? new Date(activeApp.memberJoinedAt.toDate()).toLocaleDateString() : "Active Member"}</p></div>
                  </div>
                  <div className="flex items-start gap-3 text-xs md:text-sm">
                    <MapPin className="w-4 h-4 md:w-5 md:h-5 text-gray-400 shrink-0" />
                    <div><p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Region</p><p className="font-medium text-gray-900">{activeApp.district}, {activeApp.state}</p></div>
                  </div>
                  <div className="flex items-start gap-3 text-xs md:text-sm">
                    <Phone className="w-4 h-4 md:w-5 md:h-5 text-gray-400 shrink-0" />
                    <div><p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone Number</p><a href={`tel:${activeApp.phone}`} className="font-medium text-[#007AFF] hover:underline">+91 {activeApp.phone || "N/A"}</a></div>
                  </div>
                  <div className="flex items-start gap-3 text-xs md:text-sm">
                    <Mail className="w-4 h-4 md:w-5 md:h-5 text-gray-400 shrink-0" />
                    <div><p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</p>{activeApp.email ? <a href={`mailto:${activeApp.email}`} className="font-medium text-[#007AFF] hover:underline break-all">{activeApp.email}</a> : <p className="font-medium text-gray-500">Not provided</p>}</div>
                  </div>
                  <div className="flex items-start gap-3 text-xs md:text-sm">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-gray-400 shrink-0" />
                    <div><p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Application Date</p><p className="font-medium text-gray-900">{activeApp.appliedAt ? new Date(activeApp.appliedAt.toDate()).toLocaleString() : "Recently"}</p></div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}