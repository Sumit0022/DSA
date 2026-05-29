// app/dashboard/leaders/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { Award, Megaphone, Users, Phone, Mail, MapPin, ShieldCheck, Crown, Loader2, Globe, AlertTriangle, CheckSquare, Square, Send, X, MessageSquare, Clock, Paperclip, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, getDocs, query, where, addDoc, updateDoc, doc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser"; 

export default function LocalLeadersPage() {
  const { userData, loadingUser } = useUser();
  const currentUser = userData ? { id: userData.id, name: userData.name, phone: userData.phone } : null;
  const userDistrict = userData?.district || "India"; 
  const userState = userData?.state || "India";
  
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(true);

  const [isApplicationsOpen, setIsApplicationsOpen] = useState(true); 
  const [applicationStatus, setApplicationStatus] = useState("none"); 
  const [appDocId, setAppDocId] = useState<string | null>(null); 
  
  const [showRules, setShowRules] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [agreed, setAgreed] = useState(false);
  
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<any[]>([]);

  // FETCH LEADERS
  useEffect(() => {
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

  // SYNC APPLICATION CHAT
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "applications"), where("userId", "==", currentUser.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        setAppDocId(docSnap.id);
        setApplicationStatus(data.status);
        if (data.messages && data.messages.length > 0) setMessages(data.messages);
      }
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  useEffect(() => {
    if (showChat) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showChat]);

  const handleCheckboxClick = () => { if (!agreed) setShowWarning(true); else setAgreed(false); };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser) return;
    const newMessage = {
      id: Date.now(), sender: "user", text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setChatInput("");

    try {
      if (appDocId) {
        await updateDoc(doc(db, "applications", appDocId), { messages: updatedMessages });
      } else {
        const newAppRef = await addDoc(collection(db, "applications"), {
          userId: currentUser.id, name: currentUser.name, phone: currentUser.phone,
          district: userDistrict, state: userState, status: "pending",
          appliedAt: serverTimestamp(), 
          messages: [{ id: 1, sender: "admin", text: "Welcome to the DSA Leadership Screening. Remember, this is not just a title; it's a responsibility. Why do you believe you are the right fit to lead your district?", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, newMessage]
        });
        setAppDocId(newAppRef.id);
        setApplicationStatus("pending");
      }
    } catch (error) {
      alert("Failed to deliver message.");
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

  if (loadingUser) return <div className="flex justify-center py-20 text-[#007AFF]"><Loader2 className="animate-spin w-8 h-8"/></div>;
  if (!userData) return <div className="text-center py-20 text-gray-500">Please log in.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-12">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-4 md:pb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Alliance Leadership</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Connect with your official regional representatives.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-gray-900 text-white rounded-lg md:rounded-xl w-max">
          <MapPin className="w-3 h-3 md:w-4 md:h-4 text-[#007AFF]" />
          <span className="text-xs md:text-sm font-bold">{userDistrict} Jurisdiction</span>
        </div>
      </div>

      {loadingLeaders ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#007AFF]"/></div>
      ) : leaders.length === 0 ? (
        <div className="bg-white border rounded-3xl p-12 text-center text-gray-500">No Leaders Assigned Yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {leaders.map((leader, idx) => {
            const styles = getLevelStyles(leader.roleLevel);
            const Icon = getPostIcon(leader.roleTitle, styles.icon);
            return (
              <motion.div key={leader.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="bg-white border border-gray-200 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm">
                <div className={`h-1.5 md:h-2 w-full bg-gradient-to-r ${styles.color}`}></div>
                <div className="p-5 md:p-6">
                  <div className="flex justify-between items-start mb-4 md:mb-6">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${styles.bgLight}`}><Icon className={`w-5 h-5 md:w-6 md:h-6 ${styles.textColor}`} /></div>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[9px] md:text-[10px] font-bold uppercase rounded-md">{leader.roleLevel} Command</span>
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-gray-900 line-clamp-1">{leader.name}</h3>
                    <p className={`text-xs md:text-sm font-bold mt-0.5 ${styles.textColor}`}>{leader.roleTitle}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* DYNAMIC APPLICATION CTA */}
      <div className="mt-8 bg-white border border-gray-200 rounded-2xl md:rounded-3xl p-6 md:p-8 text-center shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          
          {(() => {
            if (applicationStatus === "approved") {
              return (
                <>
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                    <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-gray-900">Appointment Confirmed!</h3>
                  <p className="text-xs md:text-sm text-gray-500 mt-1.5 md:mt-2 mb-4 md:mb-6 max-w-lg mx-auto">
                    Congratulations! The High Command has approved your leadership request. You can now see your official post on the Leaderboard above.
                  </p>
                  <button onClick={() => setShowChat(true)} className="px-6 py-3 md:px-8 md:py-3.5 bg-gray-900 text-white font-bold rounded-xl text-xs md:text-sm hover:bg-black transition-colors shadow-md mx-auto">
                    View Appointment Letter
                  </button>
                </>
              );
            }

            if (applicationStatus === "rejected") {
              return (
                <>
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                    <AlertTriangle className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-gray-900">Application Under Cooldown</h3>
                  <p className="text-xs md:text-sm text-gray-500 mt-1.5 md:mt-2 mb-4 md:mb-6 max-w-lg mx-auto">
                    Your application was reviewed but not approved. Don't lose hope. Keep working on the ground and re-apply in 90 days.
                  </p>
                  <button onClick={() => setShowChat(true)} className="px-6 py-3 md:px-8 md:py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs md:text-sm border border-gray-200 hover:bg-gray-200 transition-colors mx-auto">
                    View High Command Feedback
                  </button>
                </>
              );
            }

            if (applicationStatus === "pending") {
              return (
                <>
                  <Award className="w-8 h-8 md:w-10 md:h-10 text-[#007AFF] mx-auto mb-3 md:mb-4" />
                  <h3 className="text-lg md:text-xl font-black text-gray-900">Application in Progress</h3>
                  <p className="text-xs md:text-sm text-gray-500 mt-1.5 md:mt-2 mb-4 md:mb-6 max-w-lg mx-auto">
                    Your screening interview is active. The High Command is reviewing your profile.
                  </p>
                  <button onClick={() => setShowChat(true)} className="px-6 py-3 md:px-8 md:py-3.5 bg-[#007AFF] text-white font-bold rounded-xl text-xs md:text-sm hover:bg-blue-600 shadow-md flex items-center justify-center gap-2 mx-auto">
                    <MessageSquare className="w-4 h-4 md:w-5 md:h-5" /> View Application & Chat
                  </button>
                </>
              );
            }

            return (
              <>
                <Award className="w-8 h-8 md:w-10 md:h-10 text-[#007AFF] mx-auto mb-3 md:mb-4" />
                <h3 className="text-lg md:text-xl font-black text-gray-900">Want to join the leadership?</h3>
                <p className="text-xs md:text-sm text-gray-500 mt-1.5 md:mt-2 mb-4 md:mb-6 max-w-lg mx-auto">
                  The alliance is looking for dedicated citizens. Apply for a post today.
                </p>
                <button onClick={() => setShowRules(true)} className="px-6 py-3 md:px-8 md:py-3.5 bg-gray-900 text-white font-bold rounded-xl text-xs md:text-sm hover:bg-black shadow-md mx-auto">
                  View Eligibility & Apply
                </button>
              </>
            );
          })()}
        </div>
      </div>

      {/* 1. ELIGIBILITY RULES MODAL */}
      <AnimatePresence>
        {showRules && !showChat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-2xl md:rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh]">
              <div className="bg-gray-900 text-white p-4 md:p-6 flex justify-between items-center shrink-0">
                <h3 className="text-base md:text-xl font-black">Official Eligibility Protocol</h3>
                <button onClick={() => {setShowRules(false); setAgreed(false);}} className="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
              </div>
              <div className="p-4 md:p-8 space-y-4 md:space-y-6 overflow-y-auto flex-1">
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex gap-2 text-red-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs md:text-sm font-semibold">Leadership in DSA is not an honorary title. Read the rules carefully.</p>
                </div>
                <ul className="space-y-3 md:space-y-4">
                  <li className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-[#007AFF] font-bold text-xs">1</div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">Active Ground Participation</h4>
                      <p className="text-xs text-gray-500 mt-1">You must actively organize regional meetings and protests.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-[#007AFF] font-bold text-xs">2</div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">No "Sleeping Members" Policy</h4>
                      <p className="text-xs text-gray-500 mt-1">Inactivity for more than 14 days will result in suspension.</p>
                    </div>
                  </li>
                </ul>
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-start gap-2 cursor-pointer" onClick={handleCheckboxClick}>
                    {agreed ? <CheckSquare className="w-4 h-4 text-[#007AFF] shrink-0" /> : <Square className="w-4 h-4 text-gray-400 shrink-0" />}
                    <p className="text-xs font-semibold text-gray-700 select-none">I have read and understood the rules. I am ready.</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                <button disabled={!agreed} onClick={() => {setShowRules(false); setShowChat(true);}} className="w-full py-3 bg-[#007AFF] text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-600 disabled:opacity-50">Proceed to Interview</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. WARNING POPUP */}
      <AnimatePresence>
        {showWarning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
              <h3 className="text-lg font-black text-gray-900 mb-2">Are you absolutely sure?</h3>
              <p className="text-xs text-gray-500 mb-5">This is not a social media badge. You will be answerable to the High Command.</p>
              <div className="space-y-2">
                <button onClick={() => {setAgreed(true); setShowWarning(false);}} className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold">Yes, I am ready to lead</button>
                <button onClick={() => setShowWarning(false)} className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">No, I need more time</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. LIVE INTERVIEW CHAT */}
      <AnimatePresence>
        {showChat && (
          <motion.div initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed inset-0 z-[120] bg-[#efeae2] flex flex-col md:p-8">
            <div className="bg-white md:rounded-3xl shadow-2xl w-full max-w-3xl mx-auto flex flex-col h-[100dvh] md:h-full overflow-hidden border-none md:border md:border-gray-200">
              <div className="bg-gray-900 text-white px-3 py-3 md:px-6 md:py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 md:gap-3">
                  <button onClick={() => setShowChat(false)} className="md:hidden p-2 hover:bg-white/10 rounded-full transition-colors mr-1"><ArrowLeft className="w-5 h-5 text-white" /></button>
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-white/10 rounded-full flex items-center justify-center"><ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-white" /></div>
                  <div>
                    <h3 className="font-bold text-sm md:text-base">DSA High Command</h3>
                    <p className="text-[9px] md:text-xs text-green-400 font-medium">Online • Screening Process</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 bg-[#efeae2]" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-solid-color-pattern.jpg")', backgroundSize: 'cover', backgroundBlendMode: 'soft-light' }}>
                {messages.map((msg: any, index: number) => (
                  <div key={msg.id || index} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-2 shadow-sm ${msg.sender === "user" ? "bg-[#d9fdd3] rounded-tr-none text-gray-900" : "bg-white rounded-tl-none text-gray-900"}`}>
                      <p className="text-sm md:text-[15px] whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      <span className="text-[9px] md:text-[10px] text-gray-400 block text-right mt-1">{msg.time}</span>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} className="h-2" />
              </div>

              <div className="bg-gray-100 p-2 md:p-4 shrink-0 pb-4">
                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                  <button type="button" disabled={applicationStatus === "rejected" || applicationStatus === "approved"} className="w-10 h-10 md:w-12 md:h-12 bg-white border border-gray-200 text-gray-500 rounded-full flex items-center justify-center disabled:opacity-50"><Paperclip className="w-4 h-4 md:w-5 md:h-5" /></button>
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} disabled={applicationStatus === "rejected" || applicationStatus === "approved"} placeholder={applicationStatus === "rejected" || applicationStatus === "approved" ? "Application closed." : "Type your answer..."} className="flex-1 px-4 py-2.5 md:py-3.5 bg-white rounded-full outline-none focus:ring-2 focus:ring-[#007AFF]/20 text-sm disabled:bg-gray-200" />
                  <button type="submit" disabled={!chatInput.trim() || applicationStatus === "rejected" || applicationStatus === "approved"} className="w-10 h-10 md:w-12 md:h-12 bg-[#007AFF] text-white rounded-full flex items-center justify-center disabled:opacity-50"><Send className="w-4 h-4 md:w-5 md:h-5 ml-0.5" /></button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}