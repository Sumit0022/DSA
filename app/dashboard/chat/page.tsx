// app/dashboard/chat/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowLeft, ShieldCheck, Send, Paperclip, Loader2 } from "lucide-react";
import { collection, query, where, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";

export default function ApplicationChatPage() {
  const router = useRouter();
  const { userData, loadingUser } = useUser();
  const currentUserId = userData?.id || null;
  
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [appDocId, setAppDocId] = useState<string | null>(null);
  const [applicationStatus, setApplicationStatus] = useState("none");
  const [isLoadingChat, setIsLoadingChat] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 1. Live Sync Application Data (Strict primitive dependency to block infinite re-renders)
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

  // 2. Safe Auto-Scroll to Bottom on New Messages (Prevents Browser Choking)
  useEffect(() => {
    const scrollToBottom = () => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    };
    // Microtask queue push avoids race conditions with mobile software keyboards
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !appDocId || applicationStatus === "rejected" || applicationStatus === "approved") return;
    
    const userTypedMessage = chatInput;
    setChatInput(""); // Instant UI input clear for snappy feel

    const newMessage = {
      id: Date.now(), 
      sender: "user", 
      text: userTypedMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString()
    };
    
    try {
      // Functional state update push safely updates Firestore snapshot
      await updateDoc(doc(db, "applications", appDocId), { 
        messages: [...messages, newMessage] 
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to deliver message. Please retry.");
      setChatInput(userTypedMessage); // Rollback input text on failure
    }
  };

  if (loadingUser || isLoadingChat) {
    return (
      <div className="fixed inset-0 z-[200] bg-white flex flex-col justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF] mb-2" />
        <p className="text-xs text-gray-400 font-medium">Securing node socket...</p>
      </div>
    );
  }

  return (
    // Uses 100dvh (dynamic viewport height) to remain bulletproof on mobile safari/chrome when keyboard pushes UI
    <div className="fixed inset-0 z-[200] bg-[#efeae2] flex flex-col h-[100dvh] w-full overflow-hidden font-sans select-none">
      
      {/* FIXED HEADER: Locked on top */}
      <div className="h-[60px] bg-gray-900 text-white px-3 flex items-center justify-between shadow-md shrink-0 z-10">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => router.push("/dashboard/leaders")} 
            className="p-2 active:bg-white/10 rounded-full transition-colors touch-manipulation"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mr-1 shadow-inner">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-[15px] leading-tight tracking-wide">Headquarters</h3>
            <p className="text-[10px] text-green- green-400 text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Screening Protocol
            </p>
          </div>
        </div>
      </div>

      {/* CHAT CHRONICLE: Internally scrollable canvas */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-4 bg-[#efeae2] relative scrollbar-thin"
        style={{ 
          backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-solid-color-pattern.jpg")', 
          backgroundSize: 'cover', 
          backgroundBlendMode: 'soft-light',
          WebkitOverflowScrolling: 'touch' // iOS momentum scrolling catalyst
        }}
      >
        <div className="text-center mb-4 flex justify-center">
          <span className="bg-yellow-100/90 text-yellow-900 text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm border border-yellow-200/40 inline-block max-w-[90%] backdrop-blur-sm text-center leading-snug">
            🔒 This is an encrypted connection to the High Command. Ensure compliance with alliance rules.
          </span>
        </div>
        
        {messages.map((msg: any) => (
          <div key={msg.id} className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div 
              className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-sm relative break-words text-[15px] leading-relaxed select-text ${
                msg.sender === "user" 
                  ? "bg-[#d9fdd3] rounded-tr-none text-gray-900 shadow-emerald-900/5" 
                  : "bg-white rounded-tl-none text-gray-900 shadow-gray-900/5"
              }`}
            >
              <p className="whitespace-pre-wrap selection:bg-blue-200 font-medium">{msg.text}</p>
              <span className="text-[10px] text-gray-400/90 font-bold block text-right mt-1 tracking-tighter">
                {msg.time}
              </span>
            </div>
          </div>
        ))}
        {/* Dynamic anchor element for terminal view alignment */}
        <div ref={chatEndRef} className="h-1 shrink-0" />
      </div>

      {/* WHATSAPP-DOCK INPUT CONTROL: Always stuck to dynamic bottom viewport */}
      <div className="bg-gray-100/95 border-t border-gray-200 px-2 py-2 shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] backdrop-blur-md z-10 pb-4 safe-bottom">
        <div className="max-w-4xl mx-auto flex gap-2 items-center">
          
          <button 
            type="button" 
            onClick={() => {
              const fileInput = document.getElementById('citizen-file-upload');
              if(fileInput) fileInput.click();
            }}
            disabled={applicationStatus === "rejected" || applicationStatus === "approved"} 
            className="w-11 h-11 bg-white border border-gray-200 text-gray-500 rounded-full flex items-center justify-center active:bg-gray-100 disabled:opacity-30 shrink-0 shadow-sm transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          
          <input 
            id="citizen-file-upload" type="file" className="hidden" accept="image/*,.pdf,.doc,.docx"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) alert(`File attached: ${file.name}`); }} 
          />
          
          <form onSubmit={handleSendMessage} className="flex-1 flex gap-2 items-center">
            <input 
              type="text" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              disabled={applicationStatus === "rejected" || applicationStatus === "approved"} 
              placeholder={applicationStatus === "rejected" || applicationStatus === "approved" ? "🔒 Intake Closed." : "Type a message..."} 
              className="flex-1 px-4 py-3 bg-white rounded-full border border-gray-200/80 outline-none focus:ring-2 focus:ring-[#007AFF]/20 text-[15px] disabled:bg-gray-200 shadow-inner font-medium text-gray-900 transition-all select-text" 
            />
            
            <button 
              type="submit" 
              disabled={!chatInput.trim() || applicationStatus === "rejected" || applicationStatus === "approved"} 
              className="w-11 h-11 bg-[#007AFF] text-white rounded-full flex items-center justify-center active:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-400 disabled:shadow-none shrink-0 shadow-md transition-all touch-manipulation"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </form>

        </div>
      </div>

    </div>
  );
}