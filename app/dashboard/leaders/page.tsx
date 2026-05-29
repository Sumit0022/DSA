// app/dashboard/leaders/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { Award, Megaphone, Users, Phone, Mail, MapPin, ShieldCheck, Crown, Loader2, Globe, AlertTriangle, CheckSquare, Square, Send, X, MessageSquare, Clock, Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, getDocs, query, where, addDoc, updateDoc, doc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser"; // Make sure your hook exists at this path

export default function LocalLeadersPage() {
  const { userData, loadingUser } = useUser();
  
  // Real logged-in user details
  const currentUser = userData ? { id: userData.id, name: userData.name, phone: userData.phone } : null;
  const userDistrict = userData?.district || "India"; // Default to India if not loaded
  const userState = userData?.state || "India";
  
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(true);

  // APPLICATION SYSTEM STATES
  const [isApplicationsOpen, setIsApplicationsOpen] = useState(true); 
  const [applicationStatus, setApplicationStatus] = useState("none"); 
  const [appDocId, setAppDocId] = useState<string | null>(null); 
  
  const [showRules, setShowRules] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [agreed, setAgreed] = useState(false);
  
  // Chat States
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      sender: "admin", 
      text: "Welcome to the DSA Leadership Screening. Remember, this is not just a title; it's a responsibility. Why do you believe you are the right fit to lead your district?", 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }
  ]);

  // ==========================================
  // 1. FETCH LEADERS
  // ==========================================
  useEffect(() => {
    // Wait until userData is loaded
    if (!userData) return;

    const fetchLiveLeaders = async () => {
      try {
        const membersRef = collection(db, "members");
        const q = query(membersRef, where("status", "==", "active_member"));
        const querySnapshot = await getDocs(q);
        
        const fetchedLeaders: any[] = [];
        querySnapshot.forEach((document) => {
          const data = document.data();
          if (data.role && (data.roleLocation === userDistrict || data.roleLocation === userState || data.roleLocation === "India")) {
            fetchedLeaders.push({ id: document.id, ...data });
          }
        });

        fetchedLeaders.sort((a, b) => {
          const levelWeight: any = { "National": 1, "State": 2, "District": 3 };
          return (levelWeight[a.roleLevel] || 4) - (levelWeight[b.roleLevel] || 4);
        });

        setLeaders(fetchedLeaders);
      } catch (error) {
        console.error("Error fetching leaders:", error);
      } finally {
        setLoadingLeaders(false);
      }
    };
    
    fetchLiveLeaders();
  }, [userData, userDistrict, userState]);

  // ==========================================
  // 2. LIVE SYNC APPLICATION CHAT WITH FIREBASE
  // ==========================================
  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, "applications"), where("userId", "==", currentUser.id));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        
        setAppDocId(docSnap.id);
        setApplicationStatus(data.status);
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

  // Auto-scroll chat
  useEffect(() => {
    if (showChat) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showChat]);

  // ==========================================
  // HANDLERS (PUSH TO FIREBASE)
  // ==========================================
  const handleCheckboxClick = () => {
    if (!agreed) setShowWarning(true);
    else setAgreed(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser) return;

    const newMessage = {
      id: Date.now(),
      sender: "user",
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    const updatedMessages = [...messages, newMessage];
    
    // Optimistic Update
    setMessages(updatedMessages);
    setChatInput("");

    try {
      if (appDocId) {
        await updateDoc(doc(db, "applications", appDocId), {
          messages: updatedMessages
        });
      } else {
        const newAppRef = await addDoc(collection(db, "applications"), {
          userId: currentUser.id,
          name: currentUser.name,
          phone: currentUser.phone,
          district: userDistrict,
          state: userState,
          status: "pending",
          appliedAt: serverTimestamp(),
          messages: updatedMessages
        });
        setAppDocId(newAppRef.id);
        setApplicationStatus("pending");
      }
    } catch (error) {
      console.error("Failed to send message to Firebase:", error);
      alert("Failed to deliver message. Check internet connection.");
    }
  };

  const getLevelStyles = (level: string) => {
    switch(level) {
      case "National": return { icon: Globe, color: "from-purple-600 to-indigo-700", bgLight: "bg-purple-50", textColor: "text-purple-700" };
      case "State": return { icon: Crown, color: "from-blue-500 to-blue-700", bgLight: "bg-blue-50", textColor: "text-blue-700" };
      default: return { icon: Award, color: "from-amber-500 to-orange-600", bgLight: "bg-orange-50", textColor: "text-orange-700" };
    }
  };

  const getPostIcon = (title: string, defaultIcon: any) => {
    if (title?.includes("Spokesperson")) return Megaphone;
    if (title?.includes("Secretary")) return ShieldCheck;
    if (title?.includes("President")) return Crown;
    return defaultIcon;
  };

  // Wait for user hook to initialize
  if (loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#007AFF]" />
        <p className="font-medium">Connecting to secure network...</p>
      </div>
    );
  }

  // If no user found (not logged in)
  if (!userData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-medium">Session expired. Please log in.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Alliance Leadership</h1>
          <p className="text-sm text-gray-500 mt-1">Connect with your official regional representatives.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl shadow-sm">
          <MapPin className="w-4 h-4 text-[#007AFF]" />
          <span className="text-sm font-bold">{userDistrict} Jurisdiction</span>
        </div>
      </div>

      {/* LEADERS GRID */}
      {loadingLeaders ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#007AFF]" />
          <p className="font-medium">Syncing live command structure...</p>
        </div>
      ) : leaders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No Leaders Assigned Yet</h3>
          <p className="text-sm text-gray-500 mt-2">The high command has not appointed anyone in your jurisdiction currently.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leaders.map((leader, index) => {
            const styles = getLevelStyles(leader.roleLevel);
            const Icon = getPostIcon(leader.roleTitle, styles.icon);
            return (
              <motion.div key={leader.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group">
                <div className={`h-2 w-full bg-gradient-to-r ${styles.color}`}></div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${styles.bgLight}`}><Icon className={`w-6 h-6 ${styles.textColor}`} /></div>
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-widest rounded-md border border-gray-200/60">{leader.roleLevel} Command</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 line-clamp-1">{leader.name}</h3>
                    <p className={`text-sm font-bold mt-1 ${styles.textColor}`}>{leader.roleTitle}</p>
                    <p className="text-xs text-gray-400 font-medium mt-0.5"><MapPin className="w-3 h-3 inline mr-1" />{leader.roleLocation}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ========================================== */}
      {/* APPLICATION SYSTEM CTA (SMART LOGIC)         */}
      {/* ========================================== */}
      <div className="mt-8 bg-white border border-gray-200 rounded-3xl p-8 text-center shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white z-0 pointer-events-none"></div>
        <div className="relative z-10">
          <Award className="w-10 h-10 text-[#007AFF] mx-auto mb-4" />
          
          {(() => {
            if (!isApplicationsOpen) {
              return (
                <>
                  <h3 className="text-xl font-black text-gray-900">Leadership Intake Closed</h3>
                  <div className="mt-4 bg-orange-50 border border-orange-100 rounded-xl p-4 inline-flex items-center gap-3 text-left max-w-md mx-auto">
                    <Clock className="w-5 h-5 text-orange-500 shrink-0" />
                    <p className="text-sm text-orange-800 font-medium">
                      Applications for leadership posts in your region are currently closed by the High Command. Please wait for the next cycle.
                    </p>
                  </div>
                </>
              );
            }

            if (applicationStatus === "rejected") {
              return (
                <>
                  <h3 className="text-xl font-black text-gray-900">Application Under Cooldown</h3>
                  <p className="text-sm text-gray-500 mt-2 mb-6 max-w-lg mx-auto">
                    Your previous application was rejected by the High Command. You cannot re-apply immediately.
                  </p>
                  <button disabled className="px-8 py-3.5 bg-gray-100 text-gray-500 font-bold rounded-xl text-sm border border-gray-200 cursor-not-allowed flex items-center justify-center gap-2 mx-auto">
                    <Clock className="w-4 h-4" /> Re-apply available in 89 Days
                  </button>
                </>
              );
            }

            if (applicationStatus === "pending") {
              return (
                <>
                  <h3 className="text-xl font-black text-gray-900">Application in Progress</h3>
                  <p className="text-sm text-gray-500 mt-2 mb-6 max-w-lg mx-auto">
                    Your screening interview is currently active. The High Command is reviewing your profile and responses.
                  </p>
                  <button 
                    onClick={() => setShowChat(true)} 
                    className="px-8 py-3.5 bg-[#007AFF] text-white font-bold rounded-xl text-sm hover:bg-blue-600 transition-colors shadow-md flex items-center justify-center gap-2 mx-auto"
                  >
                    <MessageSquare className="w-4 h-4" /> View Application & Chat
                  </button>
                </>
              );
            }

            return (
              <>
                <h3 className="text-xl font-black text-gray-900">Want to join the leadership?</h3>
                <p className="text-sm text-gray-500 mt-2 mb-6 max-w-lg mx-auto">
                  The alliance is looking for hardcore, dedicated citizens to lead from the front. If you are ready to take responsibility, apply for a post.
                </p>
                <button 
                  onClick={() => setShowRules(true)} 
                  className="px-8 py-3.5 bg-gray-900 text-white font-bold rounded-xl text-sm hover:bg-black transition-colors shadow-md"
                >
                  View Eligibility & Apply
                </button>
              </>
            );
          })()}
        </div>
      </div>

      {/* ========================================== */}
      {/* 1. ELIGIBILITY RULES MODAL                   */}
      {/* ========================================== */}
      <AnimatePresence>
        {showRules && !showChat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            {/* THE FIX: Added flex flex-col and max-h-[85vh] */}
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh]">
              
              {/* Header: shrink-0 keeps it from squishing */}
              <div className="bg-gray-900 text-white p-5 md:p-6 flex justify-between items-center shrink-0">
                <h3 className="text-lg md:text-xl font-black">Official Eligibility Protocol</h3>
                <button onClick={() => {setShowRules(false); setAgreed(false);}} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>

              {/* Content: overflow-y-auto makes it scrollable */}
              <div className="p-5 md:p-8 space-y-6 overflow-y-auto">
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3 text-red-800">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold">Leadership in DSA is not an honorary title. It is a strict operational duty. Read the rules carefully before applying.</p>
                </div>

                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-[#007AFF] font-bold">1</div>
                    <div>
                      <h4 className="font-bold text-gray-900">Active Ground Participation</h4>
                      <p className="text-sm text-gray-500 mt-1">You must actively participate in and organize regional meetings, protests, and social drives.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-[#007AFF] font-bold">2</div>
                    <div>
                      <h4 className="font-bold text-gray-900">No "Sleeping Members" Policy</h4>
                      <p className="text-sm text-gray-500 mt-1">Inactivity for more than 14 days will result in immediate suspension.</p>
                    </div>
                  </li>
                </ul>

                <div className="pt-6 border-t border-gray-200">
                  <div className="flex items-start gap-3 cursor-pointer" onClick={handleCheckboxClick}>
                    {agreed ? <CheckSquare className="w-5 h-5 text-[#007AFF] shrink-0" /> : <Square className="w-5 h-5 text-gray-400 shrink-0" />}
                    <p className="text-sm font-semibold text-gray-700 select-none">
                      I have read and understood the rules. I am ready to take full responsibility.
                    </p>
                  </div>
                </div>

                <button 
                  disabled={!agreed}
                  onClick={() => setShowChat(true)}
                  className="w-full py-4 bg-[#007AFF] text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500 shrink-0"
                >
                  Proceed to Interview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* 2. WARNING POPUP                             */}
      {/* ========================================== */}
      <AnimatePresence>
        {showWarning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Are you absolutely sure?</h3>
              <p className="text-sm text-gray-500 mb-6">
                This is not a social media badge. You will be answerable to the High Command and the citizens of your district. If you fail to perform, you will be removed publicly.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => {setAgreed(true); setShowWarning(false);}}
                  className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors"
                >
                  Yes, I am ready to lead
                </button>
                <button 
                  onClick={() => setShowWarning(false)}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
                >
                  No, I need more time
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* 3. LIVE INTERVIEW CHAT                       */}
      {/* ========================================== */}
      <AnimatePresence>
        {showChat && (
          <motion.div initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed inset-0 z-[120] bg-[#efeae2] flex flex-col md:p-8">
            <div className="bg-white md:rounded-3xl shadow-2xl w-full max-w-3xl mx-auto flex flex-col h-full overflow-hidden border border-gray-200">
              
              <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold">DSA High Command</h3>
                    <p className="text-xs text-green-400 font-medium">Online • Screening Process</p>
                  </div>
                </div>
                <button onClick={() => {setShowChat(false); setShowRules(false);}} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#efeae2] relative" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-solid-color-pattern.jpg")', backgroundSize: 'cover', backgroundBlendMode: 'soft-light' }}>
                {messages.map((msg: any, index: number) => (
                  <div key={msg.id || index} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2 shadow-sm relative ${msg.sender === "user" ? "bg-[#d9fdd3] rounded-tr-none text-gray-900" : "bg-white rounded-tl-none text-gray-900"}`}>
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      <span className="text-[10px] text-gray-400 font-medium block text-right mt-1.5">{msg.time}</span>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="bg-gray-100 p-3 md:p-4 shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                  
                  <button 
                    type="button"
                    onClick={() => {
                      const fileInput = document.getElementById('citizen-file-upload');
                      if(fileInput) fileInput.click();
                    }}
                    className="w-12 h-12 bg-white border border-gray-200 text-gray-500 rounded-full flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 transition-colors shadow-sm shrink-0"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  
                  <input 
                    id="citizen-file-upload"
                    type="file" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) alert(`File selected: ${file.name}`);
                    }} 
                    className="hidden" 
                    accept="image/*,.pdf,.doc,.docx"
                  />

                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={applicationStatus === "rejected" || applicationStatus === "approved"}
                    placeholder={applicationStatus === "rejected" ? "Application closed." : "Type your answer or attach proof..."} 
                    className="flex-1 px-5 py-3.5 bg-white rounded-full outline-none focus:ring-2 focus:ring-[#007AFF]/20 text-sm shadow-sm disabled:bg-gray-200 disabled:text-gray-500"
                  />
                  
                  <button 
                    type="submit" 
                    disabled={!chatInput.trim() || applicationStatus === "rejected" || applicationStatus === "approved"}
                    className="w-12 h-12 bg-[#007AFF] text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:bg-gray-400 shrink-0 shadow-md"
                  >
                    <Send className="w-5 h-5 ml-1" />
                  </button>
                </form>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}