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
  const currentUser = userData ? { id: userData.id, name: userData.name } : null;
  
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [appDocId, setAppDocId] = useState<string | null>(null);
  const [applicationStatus, setApplicationStatus] = useState("none");
  const [isLoadingChat, setIsLoadingChat] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync Live Application
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
      } else {
        // If no application exists, push them back to leaders page to apply
        router.push("/dashboard/leaders");
      }
      setIsLoadingChat(false);
    });
    return () => unsubscribe();
  }, [currentUser?.id, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !appDocId || applicationStatus === "rejected" || applicationStatus === "approved") return;
    
    const newMessage = {
      id: Date.now(), sender: "user", text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatInput("");
    try {
      await updateDoc(doc(db, "applications", appDocId), { 
        messages: [...messages, newMessage] 
      });
    } catch (error) {
      alert("Failed to deliver message.");
    }
  };

  if (loadingUser || isLoadingChat) {
    return <div className="fixed inset-0 z-[200] bg-white flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#007AFF]"/></div>;
  }

  return (
    // Fixed overlay covers the whole screen, hiding the dashboard layout behind it
    <div className="fixed inset-0 z-[200] bg-[#efeae2] flex flex-col font-sans">
      
      {/* HEADER (Native App Style) */}
      <div className="h-[60px] bg-gray-900 text-white px-2 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-1 md:gap-3">
          <button onClick={() => router.push("/dashboard/leaders")} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mr-1">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-[15px] leading-tight">Headquarters</h3>
            <p className="text-[10px] text-green-400 font-medium">Official Communications</p>
          </div>
        </div>
      </div>

      {/* CHAT HISTORY */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 bg-[#efeae2]" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-solid-color-pattern.jpg")', backgroundSize: 'cover', backgroundBlendMode: 'soft-light' }}>
        <div className="text-center mb-6">
          <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm border border-yellow-200 inline-block max-w-[80%]">
            Messages are end-to-end encrypted with the High Command. Ensure professional conduct.
          </span>
        </div>
        
        {messages.map((msg: any, index: number) => (
          <div key={msg.id || index} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-2 md:px-4 md:py-2 shadow-sm relative ${msg.sender === "user" ? "bg-[#d9fdd3] rounded-tr-none text-gray-900" : "bg-white rounded-tl-none text-gray-900"}`}>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              <span className="text-[10px] text-gray-400 font-medium block text-right mt-1.5">{msg.time}</span>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} className="h-2" />
      </div>

      {/* INPUT AREA */}
      <div className="bg-gray-100 p-2 pb-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
            <button 
              type="button" 
              onClick={() => {
                const fileInput = document.getElementById('citizen-file-upload');
                if(fileInput) fileInput.click();
              }}
              disabled={applicationStatus === "rejected" || applicationStatus === "approved"} 
              className="w-12 h-12 bg-white border border-gray-200 text-gray-500 rounded-full flex items-center justify-center disabled:opacity-50 shrink-0 shadow-sm"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input 
              id="citizen-file-upload" type="file" className="hidden" accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) alert(`File selected: ${file.name}`); }} 
            />
            <input 
              type="text" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              disabled={applicationStatus === "rejected" || applicationStatus === "approved"} 
              placeholder={applicationStatus === "rejected" || applicationStatus === "approved" ? "Chat closed." : "Type your message..."} 
              className="flex-1 px-4 py-3.5 bg-white rounded-full outline-none focus:ring-2 focus:ring-[#007AFF]/20 text-[15px] disabled:bg-gray-200 shadow-sm" 
            />
            <button 
              type="submit" 
              disabled={!chatInput.trim() || applicationStatus === "rejected" || applicationStatus === "approved"} 
              className="w-12 h-12 bg-[#007AFF] text-white rounded-full flex items-center justify-center disabled:opacity-50 shrink-0 shadow-md"
            >
              <Send className="w-5 h-5 ml-1" />
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}