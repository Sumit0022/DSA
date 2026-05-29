// app/admin/newsletter/page.tsx
"use client";

import { useState } from "react";
import { Send, Users, FileText, AlertCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function NewsletterHub() {
  const [targetAudience, setTargetAudience] = useState("all");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    // Yahan hum baad mein Resend ya SendGrid API integrate karenge
    setTimeout(() => {
      setIsSending(false);
      alert("Broadcast sent successfully to the alliance members!");
      setSubject("");
      setMessage("");
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Communications Hub</h1>
        <p className="text-sm text-gray-500 mt-1">Broadcast official announcements to the alliance members.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: EDITOR */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleBroadcast} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-5">
            
            {/* Audience Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target Audience</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select 
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/10 outline-none transition-all appearance-none"
                >
                  <option value="all">All Verified Citizens (Nationwide)</option>
                  <option value="up">Uttar Pradesh Region Only</option>
                  <option value="maharashtra">Maharashtra Region Only</option>
                </select>
              </div>
            </div>

            {/* Subject Line */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subject Line</label>
              <input 
                type="text" 
                required
                placeholder="E.g., Crucial Update: New DSA Policies..." 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/10 outline-none transition-all placeholder:text-gray-400"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                <span>Message Body</span>
                <span className="text-[#007AFF] flex items-center gap-1 cursor-pointer hover:underline"><Sparkles className="w-3 h-3" /> AI Assist</span>
              </label>
              <textarea 
                required
                rows={8}
                placeholder="Draft your official communication here..." 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/10 outline-none transition-all placeholder:text-gray-400 resize-none"
              />
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button 
                type="submit"
                disabled={isSending || !subject || !message}
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#007AFF] text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <AlertCircle className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {isSending ? "Transmitting..." : "Broadcast Message"}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: QUICK STATS & GUIDELINES */}
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <h3 className="font-bold text-lg mb-1 relative z-10">Audience Impact</h3>
            <p className="text-sm text-gray-400 mb-6 relative z-10">Estimated reach for current selection.</p>
            
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <span className="text-sm text-gray-400">Total Recipients</span>
                <span className="font-bold text-xl">1,248</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <span className="text-sm text-gray-400">Avg. Open Rate</span>
                <span className="font-bold text-xl text-[#34C759]">68%</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-[#007AFF]" />
              <h3 className="font-bold text-[#007AFF]">Transmission Rules</h3>
            </div>
            <ul className="space-y-2 text-sm text-blue-900/80 font-medium list-disc list-inside">
              <li>Always maintain the official DSA tone.</li>
              <li>Avoid sending more than 2 broadcasts per week to prevent spam.</li>
              <li>Double-check regional targeting before sending.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}