// app/dashboard/chat/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowLeft, ShieldCheck, Send, Loader2, Bot, User as UserIcon, CheckCircle2, RefreshCw } from "lucide-react";
import { collection, query, where, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function ApplicationChatPage() {
  const router = useRouter();
  const { userData, loadingUser } = useUser();
  const currentUserId = userData?.id || null;
  
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [appDocId, setAppDocId] = useState<string | null>(null);
  const [applicationStatus, setApplicationStatus] = useState("none");
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Live Sync Application Data
  useEffect(() => {
    if (!currentUserId) return;

    const q = query(collection(db, "applications"), where("userId", "==", currentUserId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        setAppDocId(docSnap.id);
        setApplicationStatus(data.status);
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      } else {
        router.push("/dashboard/leaders");
      }
      setIsLoadingChat(false);
    }, (error) => {
      console.error("Live chat sync error:", error);
      setIsLoadingChat(false);
    });

    return () => unsubscribe();
  }, [currentUserId, router]);

  // 2. Safe Auto-Scroll to Bottom on New Messages
  useEffect(() => {
    const scrollToBottom = () => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    };
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages.length, isAiTyping]);

  // 3. Auto-Resize Textarea Logic
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + "px";
    }
  }, [chatInput]);

  // 🔥 NEW: Reset Interview Function 🔥
  const handleResetInterview = async () => {
    if (!appDocId) return;
    if (confirm("Are you sure you want to restart the interview? This will clear current chat logs.")) {
      await updateDoc(doc(db, "applications", appDocId), { 
        messages: [], 
        status: "under_interview" 
      });
      setMessages([]);
      setSelectedLanguage(null);
      setApplicationStatus("under_interview");
    }
  };

  // 4. Initial AI Greeting
  const startInterview = async (lang: "english" | "hinglish") => {
    setSelectedLanguage(lang);
    setIsAiTyping(true);
    
    const initialPrompt = lang === "english" 
      ? `Start the interview. Greet the candidate (${userData?.name}) formally as the DSA High Command Recruiter and ask the first strict question regarding their capabilities to lead in ${userData?.district}.`
      : `Start the interview. Greet the candidate (${userData?.name}) formally as the DSA High Command Recruiter in Hinglish and ask the first strict question regarding their capabilities to lead in ${userData?.district}.`;

    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: [],
          currentMessage: initialPrompt,
          userName: userData?.name,
          district: userData?.district,
          language: lang
        })
      });
      const data = await response.json();
      
      const newAiMessage = {
        id: Date.now(), sender: "ai", text: data.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString()
      };

      if (appDocId) await updateDoc(doc(db, "applications", appDocId), { messages: [newAiMessage] });
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiTyping(false);
    }
  };

  // 5. Send Message to AI
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !appDocId || applicationStatus === "rejected" || applicationStatus === "approved" || applicationStatus === "submitted" || isAiTyping) return;
    
    const userTypedMessage = chatInput;
    setChatInput(""); 
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const newMessage = {
      id: Date.now(), sender: "user", text: userTypedMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString()
    };
    
    const updatedMessages = [...messages, newMessage];

    try {
      await updateDoc(doc(db, "applications", appDocId), { messages: updatedMessages });
      setIsAiTyping(true);

      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: updatedMessages,
          currentMessage: userTypedMessage,
          userName: userData?.name,
          district: userData?.district,
          language: selectedLanguage || "english"
        })
      });
      const data = await response.json();
      let aiText = data.text || "Connection interrupted. Please hold.";
      let isCompleted = false;

      if (aiText.includes("[END_INTERVIEW]")) {
        aiText = aiText.replace("[END_INTERVIEW]", "").trim();
        isCompleted = true;
      }

      const aiMessage = {
        id: Date.now() + 1, sender: "ai", text: aiText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString()
      };

      await updateDoc(doc(db, "applications", appDocId), { 
        messages: [...updatedMessages, aiMessage],
        status: isCompleted ? "submitted" : applicationStatus
      });

    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to deliver message to High Command. Please retry.");
      setChatInput(userTypedMessage); 
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loadingUser || isLoadingChat) {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-50 flex flex-col justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF] mb-3" />
        <p className="text-xs text-slate-400 font-black tracking-widest uppercase">Initializing Secure Terminal...</p>
      </div>
    );
  }

  const isChatLocked = applicationStatus === "rejected" || applicationStatus === "approved" || applicationStatus === "submitted";

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-50 flex flex-col h-[100dvh] w-full overflow-hidden font-sans select-none">
      
      {/* ─── FIXED HEADER ─── */}
      <div className="h-[70px] bg-[#0A192F] text-white px-4 flex items-center justify-between shadow-lg shrink-0 z-20 w-full relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#007AFF]/20 to-transparent pointer-events-none"></div>
        <div className="flex items-center gap-3 w-full relative z-10">
          <button onClick={() => router.push("/dashboard/leaders")} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors touch-manipulation">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <h3 className="font-black text-base leading-tight tracking-wide truncate">DSA High Command</h3>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Official Screening
            </p>
          </div>
          {/* 🔥 RESTART INTERVIEW BUTTON 🔥 */}
          <button 
            onClick={handleResetInterview}
            title="Restart Interview"
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ─── CHAT CHRONICLE ─── */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-5 bg-[#FAFAFA] relative scrollbar-thin">
        
        <div className="text-center mb-6 flex justify-center">
          <span className="bg-slate-200/50 text-slate-500 text-[10px] font-bold px-4 py-2 rounded-full border border-slate-200 inline-block uppercase tracking-widest">
            End-to-End Encrypted Session
          </span>
        </div>

        {/* ─── LANGUAGE SELECTION OVERLAY ─── */}
        {messages.length === 0 && !isAiTyping && (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm mx-auto bg-white p-6 rounded-3xl shadow-lg border border-slate-100 text-center mt-10">
              <div className="w-16 h-16 bg-blue-50 text-[#007AFF] rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Select Language</h3>
              <p className="text-sm font-medium text-slate-500 mb-6">Choose your preferred language to begin the leadership screening process.</p>
              <div className="flex gap-3">
                <button onClick={() => startInterview("english")} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors shadow-sm">English</button>
                <button onClick={() => startInterview("hinglish")} className="flex-1 py-3 bg-[#007AFF] text-white rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-sm">Hinglish</button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
        
        {/* ─── MESSAGES ─── */}
        {messages.map((msg: any) => (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            {msg.sender === "ai" && <div className="w-8 h-8 rounded-full bg-[#0A192F] flex items-center justify-center shrink-0 mr-2 mt-auto border border-slate-200"><Bot className="w-4 h-4 text-white"/></div>}
            
            <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm relative break-words text-[15px] leading-relaxed select-text ${
                msg.sender === "user" 
                  ? "bg-[#007AFF] rounded-br-none text-white shadow-blue-500/20" 
                  : "bg-white border border-slate-200 rounded-bl-none text-slate-800"
              }`}
            >
              <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
              <span className={`text-[9px] font-bold block text-right mt-1.5 ${msg.sender === "user" ? "text-blue-200" : "text-slate-400"}`}>
                {msg.time}
              </span>
            </div>

            {msg.sender === "user" && <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 ml-2 mt-auto border border-slate-300"><UserIcon className="w-4 h-4 text-slate-500"/></div>}
          </motion.div>
        ))}

        {/* ─── AI TYPING INDICATOR ─── */}
        {isAiTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full justify-start items-end">
            <div className="w-8 h-8 rounded-full bg-[#0A192F] flex items-center justify-center shrink-0 mr-2 border border-slate-200"><Bot className="w-4 h-4 text-white"/></div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 text-sm text-slate-400 flex items-center gap-2 font-bold shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-[#007AFF]" /> Recruiter is typing...
            </div>
          </motion.div>
        )}

        {/* Dynamic anchor element */}
        <div ref={chatEndRef} className="h-4 shrink-0" />
      </div>

      {/* ─── FLEXIBLE INPUT CONTROL ─── */}
      <div className="bg-white border-t border-slate-200 px-3 py-3 shrink-0 z-10 pb-4 safe-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <div className="max-w-4xl mx-auto">
          
          {isChatLocked ? (
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm text-center">
              <CheckCircle2 className="w-5 h-5" /> Interview Completed. Pending High Command Review.
            </div>
          ) : (
            <div className="flex gap-2 items-end">
              <div className="flex-1 bg-slate-50 rounded-3xl border border-slate-200 shadow-inner overflow-hidden flex items-end min-h-[52px]">
                <textarea 
                  ref={textareaRef}
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)} 
                  onKeyDown={handleKeyDown}
                  disabled={isAiTyping || isChatLocked} 
                  placeholder={messages.length === 0 ? "Select a language first..." : "Type your response..."} 
                  className="flex-1 px-5 py-3.5 bg-transparent outline-none text-[15px] font-medium text-slate-900 resize-none overflow-y-auto select-text w-full disabled:opacity-50 placeholder:text-slate-400"
                  rows={1}
                />
              </div>
              
              <button 
                type="button" 
                onClick={() => handleSendMessage()}
                disabled={!chatInput.trim() || isAiTyping || isChatLocked || messages.length === 0} 
                className="w-[52px] h-[52px] bg-[#007AFF] text-white rounded-full flex items-center justify-center active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 shrink-0 shadow-md transition-all touch-manipulation mb-0"
              >
                <Send className="w-5 h-5 ml-1" />
              </button>
            </div>
          )}
          
        </div>
      </div>

    </div>
  );
}