// app/admin/applications/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ShieldCheck, XCircle, CheckCircle, Send, MessageSquare, MapPin, Paperclip, Info, Phone, Mail, Clock, User, Loader2, X, ArrowLeft, Crown, CalendarDays, Power, AlertTriangle, Star, Bot, Trash2, RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, doc, updateDoc, query, orderBy, onSnapshot, serverTimestamp, setDoc, getDoc, where, addDoc, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const TERM_LENGTHS = ["6 Months", "1 Year", "2 Years", "3 Years", "5 Years"];

export default function ApplicationsInbox() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showChatMobile, setShowChatMobile] = useState(false);
  
  // INTAKE TOGGLE STATE
  const [isIntakeOpen, setIsIntakeOpen] = useState(true);

  // 🔥 DYNAMIC HIERARCHY STATES & VACANCY 🔥
  const [hierarchyData, setHierarchyData] = useState<any>(null);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [vacancyData, setVacancyData] = useState<{title: string, maxLimit: number, filled: number, isAvailable: boolean}[]>([]);

  // ROLE ASSIGNMENT STATES
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [assignLevel, setAssignLevel] = useState("District");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignTerm, setAssignTerm] = useState(TERM_LENGTHS[1]); 
  const [isProcessing, setIsProcessing] = useState(false);
  
  // CURRENT USER APP DATA
  const [appUserData, setAppUserData] = useState<any>(null); // For fetching points

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeApp = applications.find(app => app.id === selectedAppId);

  // ─── NOTIFICATION ENGINE ───
  const sendNotification = async (userId: string, title: string, message: string, type: "success" | "alert" | "info") => {
    if (!userId) return;
    try {
      await addDoc(collection(db, "notifications"), {
        userId,
        title,
        message,
        type,
        isRead: false,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Notification Dispatch Error:", error);
    }
  };

  // 🔥 CORE HELPER: AUTOMATIC PRESS WIRE PUBLISHER FOR APPLICATIONS 🔥
  const dispatchAutoPressRelease = async (memberDetails: any, roleDisplay: string, locDisplay: string) => {
    try {
      const caption = `🚨 NEW APPOINTMENT: ${memberDetails.name} appointed as ${roleDisplay} for ${locDisplay}.`;
      const content = `By the decisive authority of the High Command, the Democratic Social Alliance officially appoints ${memberDetails.name} to the office of ${roleDisplay} for ${locDisplay}. 

Their dedication to the organization's vision has warranted this command clearance. They are expected to assume operational duties with immediate effect and execute the mandates with absolute integrity.`;

      // 🔥 ALWAYS FETCH NATIONAL PRESIDENT FOR SIGNATURES 🔥
      const membersRef = collection(db, "members");
      let sigName = "High Command";
      let sigTitle = "National President";
      let sigSignature = null;

      try {
        const sigQuery = query(membersRef, where("roleLevel", "==", "National"), where("roleTitle", "in", ["President", "National President"]));
        const sigSnap = await getDocs(sigQuery);
        
        if (!sigSnap.empty) {
          const sigData = sigSnap.docs[0].data();
          sigName = sigData.name;
          sigTitle = sigData.role || "National President";
          sigSignature = sigData.signatureUrl || sigData.signature || sigData.signatureImage || sigData.profilePic || null;
        } else {
          sigTitle = "Acting National President";
        }
      } catch (err) {
        console.error("Signature Fetch Error:", err);
      }

      // Push to Press Releases
      await addDoc(collection(db, "press_releases"), {
        caption: caption,
        content: content,
        jurisdictionLevel: assignLevel,
        targetState: memberDetails.state || "",
        targetDistrict: memberDetails.district || "",
        locationDisplay: locDisplay,
        refNumber: `DSA/PR/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
        status: "published",
        scheduledFor: null,
        signatoryName: sigName,
        signatoryTitle: sigTitle,
        signatorySignature: sigSignature,
        createdAt: serverTimestamp(),
        issuedBy: "System_Automation"
      });

    } catch (err) {
      console.error("Auto Press Release Failed:", err);
    }
  };

  // FETCH DYNAMIC HIERARCHY DATA
  useEffect(() => {
    const fetchHierarchy = async () => {
      try {
        const docRef = doc(db, "settings", "roles_hierarchy");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setHierarchyData(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching hierarchy:", error);
      }
    };
    fetchHierarchy();
  }, []);

  // FETCH ALL LEADERS TO CALCULATE VACANCY
  useEffect(() => {
    const membersRef = collection(db, "members");
    const q = query(membersRef, where("role", "!=", "member"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
      setLeaders(docs.filter(d => d.role !== "active_member" && d.roleLevel));
    });
    return () => unsubscribe();
  }, []);

  // CALCULATE VACANCY FOR SELECTED LEVEL & APPLICATION TARGET
  useEffect(() => {
    if (hierarchyData && hierarchyData[assignLevel] && activeApp) {
      const tiers = hierarchyData[assignLevel];
      const computedVacancies: any[] = [];
      
      const targetState = activeApp.state;
      const targetDistrict = activeApp.district;

      tiers.forEach((tier: any) => {
        if (tier.titles) {
          tier.titles.forEach((t: any) => {
            const filledCount = leaders.filter((l: any) => {
              const levelMatch = l.roleLevel === assignLevel;
              const titleMatch = l.roleTitle === t.title;
              const regionMatch = assignLevel === "National" 
                                  ? true 
                                  : assignLevel === "State" 
                                      ? l.state === targetState 
                                      : l.state === targetState && l.district === targetDistrict;
              
              return levelMatch && titleMatch && regionMatch;
            }).length;
            
            const max = t.maxLimit || 1;
            computedVacancies.push({
              title: t.title,
              maxLimit: max,
              filled: filledCount,
              isAvailable: filledCount < max
            });
          });
        }
      });
      setVacancyData(computedVacancies);
      
      const requestedTitle = activeApp.requestedRole ? activeApp.requestedRole.replace(`${assignLevel} `, "") : "";
      const requestedPostData = computedVacancies.find(v => v.title === requestedTitle);
      
      if (requestedPostData && requestedPostData.isAvailable) {
        setAssignTitle(requestedTitle);
      } else {
        const available = computedVacancies.filter(v => v.isAvailable);
        if (available.length > 0 && !available.find(v => v.title === assignTitle)) {
          setAssignTitle(available[0].title);
        } else if (available.length === 0) {
          setAssignTitle("");
        }
      }
    }
  }, [hierarchyData, assignLevel, activeApp, leaders]);

  // LIVE FETCH USER DATA FOR POINTS & EMAIL
  useEffect(() => {
    if (!activeApp?.userId) return;
    const unsubscribe = onSnapshot(doc(db, "members", activeApp.userId), (docSnap) => {
      if (docSnap.exists()) setAppUserData(docSnap.data());
    });
    return () => unsubscribe();
  }, [activeApp?.userId]);

  // FETCH LIVE APPLICATIONS & INTAKE SETTINGS
  useEffect(() => {
    const appsRef = collection(db, "applications");
    const q = query(appsRef, orderBy("appliedAt", "desc"));
    const unsubscribeApps = onSnapshot(q, (snapshot) => {
      const fetchedApps: any[] = [];
      snapshot.forEach((document) => {
        fetchedApps.push({ id: document.id, ...document.data() });
      });
      setApplications(fetchedApps);
      setLoading(false);
    });

    const unsubscribeSettings = onSnapshot(doc(db, "settings", "applications"), (docSnap) => {
      if (docSnap.exists()) {
        setIsIntakeOpen(docSnap.data().isOpen);
      } else {
        setIsIntakeOpen(true); 
      }
    });

    return () => {
      unsubscribeApps();
      unsubscribeSettings();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeApp?.messages, showChatMobile]);

  // TOGGLE HANDLER
  const handleToggleIntake = async () => {
    const newStatus = !isIntakeOpen;
    setIsIntakeOpen(newStatus); 
    try {
      await setDoc(doc(db, "settings", "applications"), { isOpen: newStatus }, { merge: true });
    } catch (error) {
      console.error("Failed to toggle intake", error);
      setIsIntakeOpen(!newStatus); 
      alert("Failed to update intake status.");
    }
  };

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
      
      await sendNotification(
        activeApp.userId, 
        "Application Chat Update", 
        "The High Command has replied to your pending application. Check your inbox.", 
        "info"
      );
    } catch (error) {
      alert("Failed to send message.");
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

        await sendNotification(
          activeApp.userId, 
          "Application Rejected", 
          "Your application for command hierarchy has been reviewed and rejected. Cooldown period active.", 
          "alert"
        );
      } catch (error) {
        console.error("Failed to update status", error);
      }
    }
  };

  // 🔴 DELETE ENTIRE APPLICATION LOGIC
  const handleDeleteApplication = async () => {
    if (!activeApp) return;
    if (confirm("Are you absolutely sure you want to completely DELETE this application and its chat history? This cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "applications", activeApp.id));
        setSelectedAppId(null);
        setShowChatMobile(false);
      } catch (error) {
        console.error("Failed to delete application", error);
        alert("Failed to delete application.");
      }
    }
  };

  // 🟢 REVOKE COOLDOWN LOGIC
  const handleRevokeCooldown = async () => {
    if (!activeApp) return;
    if (confirm("Revoke 90-day cooldown and allow candidate to resume screening?")) {
      try {
        const revokeMsg = {
          id: Date.now(), sender: "admin", 
          text: "✅ HIGH COMMAND UPDATE: Your cooldown period has been revoked by the administration. You may now continue your screening process.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date().toISOString()
        };
        await updateDoc(doc(db, "applications", activeApp.id), { 
          status: "pending",
          messages: [...(activeApp.messages || []), revokeMsg]
        });

        await sendNotification(
          activeApp.userId, 
          "Cooldown Revoked", 
          "Your application cooldown has been lifted. You can resume your screening chat.", 
          "success"
        );
      } catch (error) {
        console.error("Failed to revoke cooldown", error);
      }
    }
  };

  // 🟢 APPROVE INIT (OPENS MODAL)
  const handleApproveInit = () => {
    if (!activeApp) return;
    if (activeApp.requestedRole) {
      const parts = activeApp.requestedRole.split(" ");
      setAssignLevel(parts[0]);
    } else {
      setAssignLevel("District");
    }
    setAssignTerm(TERM_LENGTHS[1]);
    setHierarchyData(null); // Pre-reset hierarchy data to force recalc
    setShowRoleModal(true);
  };

  // 🟢 CONFIRM APPROVAL
  const confirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeApp || !activeApp.userId || !assignTitle) return;
    setIsProcessing(true);

    let location = "India";
    if (assignLevel === "District") location = activeApp.district;
    if (assignLevel === "State") location = activeApp.state;
    const combinedRoleDisplay = assignTitle.toLowerCase().includes(assignLevel.toLowerCase()) 
  ? assignTitle 
  : assignLevel === "National" ? `National ${assignTitle}` : `${assignLevel} ${assignTitle}`;

    try {
      await updateDoc(doc(db, "members", activeApp.userId), {
        role: combinedRoleDisplay,
        roleLevel: assignLevel,
        roleTitle: assignTitle,
        roleLocation: location,
        appointmentDate: serverTimestamp(),
        termYears: parseInt(assignTerm)
      });

      const congratsMsg = {
        id: Date.now(), sender: "admin", 
        text: `🎉 CONGRATULATIONS! The High Command has approved your application.\n\nYou are officially appointed as the ${combinedRoleDisplay} for ${location} for a term of ${assignTerm}. Please check your View Leaders page to see your official Appointment Details. Your operational responsibilities begin immediately.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString()
      };

      await updateDoc(doc(db, "applications", activeApp.id), { 
        status: "approved",
        messages: [...(activeApp.messages || []), congratsMsg]
      });

      await sendNotification(
        activeApp.userId, 
        "Application Approved", 
        `Congratulations! Your application has been approved. You are now the ${combinedRoleDisplay}. Welcome to the leadership cadre!`, 
        "success"
      );

      // 🔥 AUTO DISPATCH PRESS WIRE MANDATE 🔥
      await dispatchAutoPressRelease(activeApp, combinedRoleDisplay, location);

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
    <div className="flex flex-col md:flex-row h-[calc(100vh-[var(--header-height,64px)])] md:h-[calc(100vh-120px)] bg-white border border-gray-200 rounded-none md:rounded-2xl shadow-sm overflow-hidden relative overflow-hidden">
      
      {/* LEFT PANE */}
      <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col bg-gray-50/50 absolute md:relative inset-0 z-10 transition-transform duration-300 ${showChatMobile ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
        
        {/* HEADER WITH ADMIN TOGGLE */}
        <div className="p-4 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#007AFF]" />
              Inbox
            </h2>
            <button 
              onClick={handleToggleIntake}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm border ${isIntakeOpen ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"}`}
            >
              <Power className="w-3.5 h-3.5" />
              {isIntakeOpen ? "Intake: OPEN" : "Intake: CLOSED"}
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search applications..." className="w-full pl-9 pr-4 py-2.5 bg-gray-100 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#007AFF]/20 transition-all" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mb-4 text-[#007AFF]" /><p>Loading...</p></div>
          ) : applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center"><ShieldCheck className="w-12 h-12 mb-3 opacity-20" /><p>No applications found.</p></div>
          ) : (
            applications.map((app) => (
              <div key={app.id} onClick={() => handleAppSelect(app.id)} className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${selectedAppId === app.id ? "bg-blue-50 border-l-4 border-l-[#007AFF]" : "hover:bg-gray-100 bg-white border-l-4 border-l-transparent"}`}>
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-gray-900">{app.name}</h4>
                  <span className="text-[10px] text-gray-400 font-semibold shrink-0">
                    {app.appliedAt ? new Date(app.appliedAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "New"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1 mb-2 truncate">
                  <MapPin className="w-3 h-3 shrink-0" /> {app.district} • {app.requestedRole || "Role Request Pending"}
                </p>
                {app.status === "pending" && <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-widest rounded-md">Pending Review</span>}
                {app.status === "approved" && <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-md">Approved</span>}
                {app.status === "rejected" && <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-widest rounded-md">Rejected</span>}
                {app.status === "submitted" && <span className="inline-block px-2 py-0.5 bg-blue-100 text-[#007AFF] text-[10px] font-bold uppercase tracking-widest rounded-md flex items-center gap-1"><Bot className="w-3 h-3"/> AI Screened</span>}
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
                <button onClick={handleBackToList} className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
                <div className="cursor-pointer group flex items-center gap-2 md:gap-3" onClick={() => setShowProfile(true)} title="View full profile">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-[#007AFF] transition-colors shrink-0"><User className="w-4 h-4 md:w-5 md:h-5" /></div>
                  <div className="overflow-hidden max-w-[120px] sm:max-w-xs">
                    <h3 className="font-bold text-sm md:text-lg text-gray-900 flex items-center gap-1 truncate">{activeApp.name} <Info className="w-3 h-3 md:w-4 md:h-4 opacity-50 shrink-0" /></h3>
                    <p className="text-[10px] md:text-xs text-gray-500 truncate">{activeApp.district}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1 md:gap-2">
                {/* Enable Reject/Approve for PENDING & AI SUBMITTED status */}
                {(activeApp.status === "pending" || activeApp.status === "submitted" || activeApp.status === "under_interview") && (
                  <>
                    <button onClick={handleReject} className="px-2 md:px-4 py-1.5 md:py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1"><XCircle className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">Reject</span></button>
                    <button onClick={handleApproveInit} className="px-2 md:px-4 py-1.5 md:py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">Approve</span></button>
                  </>
                )}

                {/* Revoke Cooldown Button for REJECTED status */}
                {activeApp.status === "rejected" && (
                  <button onClick={handleRevokeCooldown} className="px-2 md:px-4 py-1.5 md:py-2 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1">
                    <RefreshCcw className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">Revoke Cooldown</span>
                  </button>
                )}
                
                {activeApp.status === "approved" && <span className="text-green-600 font-bold text-xs md:text-sm flex items-center gap-1 mr-2"><CheckCircle className="w-3 h-3 md:w-4 md:h-4"/> Cleared</span>}
                
                {/* Delete Entire Application Button */}
                <button onClick={handleDeleteApplication} title="Delete Application Permanently" className="p-1.5 md:p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors ml-1 md:ml-2">
                  <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>

            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#efeae2]" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-solid-color-pattern.jpg")', backgroundSize: 'cover', backgroundBlendMode: 'soft-light' }}>
              {activeApp.messages?.length > 0 ? (
                activeApp.messages.map((msg: any, index: number) => (
                  <div key={msg.id || index} className={`flex ${msg.sender === "admin" || msg.sender === "ai" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-2 md:px-4 md:py-2 shadow-sm relative ${msg.sender === "admin" || msg.sender === "ai" ? "bg-[#d9fdd3] rounded-tr-none text-gray-900" : "bg-white rounded-tl-none text-gray-900"}`}>
                      
                      {/* AI Bot Identifier */}
                      {msg.sender === "ai" && (
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Bot className="w-3 h-3"/> DSA AI SCREENER
                          </p>
                      )}

                      <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                      <span className="text-[9px] md:text-[10px] text-gray-400 font-medium block text-right mt-1 md:mt-1.5 tracking-tighter">
                        {msg.time} {msg.sender === "ai" && " (Automated)"}
                      </span>
                    </div>
                    
                    {/* Message Status Icon for DSA Team */}
                    {(msg.sender === "admin" || msg.sender === "ai") && (
                        <div className="ml-1 self-end mb-1">
                            <CheckCircle className="w-3 h-3 text-emerald-500"/>
                        </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 bg-white/60 p-2 md:p-3 rounded-lg w-max mx-auto text-xs md:text-sm backdrop-blur-sm">No messages yet.</div>
              )}
              <div ref={chatEndRef} className="h-2" />
            </div>

            <div className="p-3 md:p-4 bg-gray-50 border-t border-gray-200 shrink-0">
              <form onSubmit={handleSendReply} className="flex gap-2 items-center">
                <button type="button" onClick={handleAttachmentClick} disabled={activeApp.status === "rejected" || activeApp.status === "approved"} className="w-10 h-10 md:w-12 md:h-12 bg-white border border-gray-200 text-gray-500 rounded-xl flex items-center justify-center disabled:opacity-50 shrink-0"><Paperclip className="w-4 h-4 md:w-5 h-5" /></button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.pdf,.doc,.docx" />
                
                <input 
                  type="text" 
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)} 
                  disabled={activeApp.status === "rejected" || activeApp.status === "approved"} 
                  placeholder={activeApp.status === "rejected" || activeApp.status === "approved" ? "🔒 Chat locked. Application is closed." : "Type reply..."} 
                  className="flex-1 px-3 py-2.5 md:px-4 md:py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#007AFF] text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:placeholder:text-gray-400 font-medium" 
                />
                
                <button type="submit" disabled={!chatInput.trim() || activeApp.status === "rejected" || activeApp.status === "approved"} className="w-10 h-10 md:w-12 md:h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center disabled:opacity-50 shadow-sm shrink-0"><Send className="w-4 h-4 md:w-5 h-5 ml-1" /></button>
              </form>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center h-full bg-gray-50 text-gray-400"><ShieldCheck className="w-16 h-16 mb-4 opacity-20" /><p className="font-medium">Select an application</p></div>
        )}
      </div>

      {/* ROLE ASSIGNMENT MODAL (SMART VACANCY INTEGRATION) */}
      <AnimatePresence>
        {showRoleModal && activeApp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-2xl md:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh]">
              <div className="bg-gray-50 border-b border-gray-100 p-4 md:p-6 flex justify-between items-start shrink-0">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900">Approve & Assign</h3>
                  <p className="text-xs md:text-sm text-gray-500 mt-1">Appointing {activeApp.name}.</p>
                </div>
                <button onClick={() => setShowRoleModal(false)} className="p-1.5 md:p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><X className="w-4 h-4 md:w-5 h-5" /></button>
              </div>
              <form onSubmit={confirmApproval} className="p-4 md:p-6 space-y-4 md:space-y-5 overflow-y-auto flex-1 scrollbar-thin">
                <div className="space-y-3 md:space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Jurisdiction Level</label>
                    <select value={assignLevel} onChange={(e) => setAssignLevel(e.target.value)} className="w-full mt-1 px-3 py-2.5 md:px-4 md:py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:border-[#007AFF] outline-none shadow-sm text-gray-900">
                      <option value="District">District ({activeApp.district})</option>
                      <option value="State">State ({activeApp.state})</option>
                      <option value="National">National (India)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Official Post</label>
                    <select 
                      value={assignTitle} 
                      onChange={(e) => setAssignTitle(e.target.value)} 
                      className={`w-full mt-1 px-3 py-2.5 md:px-4 md:py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none shadow-sm text-gray-900 ${vacancyData.length > 0 && vacancyData.every(v => !v.isAvailable) ? 'opacity-60 cursor-not-allowed' : 'focus:border-[#007AFF]'}`}
                    >
                      {vacancyData.length > 0 ? (
                        vacancyData.map((v) => (
                          <option key={v.title} value={v.title} disabled={!v.isAvailable}>
                            {v.title} {v.isAvailable ? `(${v.filled}/${v.maxLimit} Filled)` : `(No Vacancy - Full)`}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No posts defined for this tier.</option>
                      )}
                    </select>

                    {/* RED ALERT FOR FULL POSTS */}
                    {vacancyData.length > 0 && vacancyData.every(v => !v.isAvailable) && (
                      <div className="mt-3 flex items-start gap-1.5 p-3 bg-red-50 border border-red-100 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        <p className="text-[11px] text-red-700 font-bold leading-tight uppercase tracking-wider">
                          All posts in this jurisdiction are currently occupied. Cannot approve new roles.
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Term Length</label>
                    <select value={assignTerm} onChange={(e) => setAssignTerm(e.target.value)} className="w-full mt-1 px-3 py-2.5 md:px-4 md:py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:border-[#007AFF] outline-none shadow-sm text-gray-900">
                      {TERM_LENGTHS.map((term) => <option key={term} value={term}>{term}</option>)}
                    </select>
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={isProcessing || !assignTitle || (vacancyData.length > 0 && vacancyData.every(v => !v.isAvailable))} 
                  className="w-full py-3 md:py-3.5 bg-green-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 md:w-5 h-5 animate-spin" /> : <Crown className="w-4 h-4 md:w-5 h-5" />}
                  Confirm Appointment
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FIXED PROFILE MODAL (WITH POINTS INJECTED) */}
      <AnimatePresence>
        {showProfile && activeApp && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProfile(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden" />
            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="fixed md:absolute top-0 right-0 h-full w-4/5 max-w-[320px] md:w-80 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col z-[101]">
              <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 relative">
                <h3 className="font-bold text-gray-900">Applicant Profile</h3>
                <button onClick={() => setShowProfile(false)} className="p-1.5 md:p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-6 scrollbar-thin">
                <div className="text-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-tr from-[#007AFF] to-blue-400 text-white rounded-full flex items-center justify-center mx-auto shadow-md mb-3 md:mb-4 text-xl md:text-2xl font-black relative">
                    {activeApp.name.charAt(0)}
                    
                    {/* FLOATING POINTS BADGE */}
                    <div className="absolute -bottom-2 right-[-10px] bg-amber-400 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white shadow-sm flex items-center gap-0.5 z-10">
                      <Star className="w-2.5 h-2.5 fill-amber-950" /> {appUserData?.points || 0}
                    </div>
                  </div>
                  <h2 className="text-lg md:text-xl font-black text-gray-900">{activeApp.name}</h2>
                  {activeApp.memberId && (
                    <span className="inline-block px-2 py-0.5 md:px-2.5 md:py-1 bg-gray-100 text-gray-600 text-[9px] md:text-[10px] font-bold uppercase tracking-widest rounded-md mt-1 md:mt-2">ID: {activeApp.memberId}</span>
                  )}
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Contact Details</p>
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-[#007AFF] shrink-0"/> <span className="truncate">{appUserData?.phone || activeApp.phone || "N/A"}</span></p>
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-2 mt-2"><Mail className="w-3.5 h-3.5 text-[#007AFF] shrink-0"/> <span className="truncate">{appUserData?.email || activeApp.email || "No Email Provided"}</span></p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Location Details</p>
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-[#007AFF] shrink-0"/> {activeApp.district}, {activeApp.state}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Target Post</p>
                    <p className="text-sm font-black text-[#007AFF]">{activeApp.requestedRole || "Not Specified"}</p>
                    {activeApp.status === "submitted" && (
                      <div className="mt-2 text-xs font-bold text-gray-500 bg-white p-2 rounded-lg border border-gray-100">AI Screening complete. Ready for final mandate decision.</div>
                    )}
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