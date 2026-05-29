// app/dashboard/pass/page.tsx
"use client";

import { Share2, ShieldCheck, Loader2 } from "lucide-react";
import DigitalPass from "@/components/DigitalPass";
import { useUser } from "@/hooks/useUser";

export default function CitizenPassPage() {
  // YEH RAHI ASLI JADOO WALI LINE 👇
  const { userData, loadingUser } = useUser();

  const handleShare = async () => {
    if (!userData) return;
    const shareData = {
      title: "My DSA Freedom Pass",
      text: `I just joined the Democratic Social Alliance! My official member ID is ${userData.memberId || 'Pending'}. Join the movement!`,
      url: window.location.origin + "/join",
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} \n\n${shareData.url}`);
        alert("Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  // Jab tak data fetch ho raha hai, loader dikhao
  if (loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#007AFF]" />
        <p className="font-medium">Fetching secure identity...</p>
      </div>
    );
  }

  // Agar user login nahi hai
  if (!userData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
        <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-medium">Session expired. Please log in to view your Freedom Pass.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Your Freedom Pass</h1>
          <p className="text-sm text-gray-500 mt-1">
            Official verifiable identity within the Democratic Social Alliance.
          </p>
        </div>
        
        <div className="flex items-center">
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Share2 className="w-4 h-4" /> Share My Affiliation
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#007AFF] shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-blue-900">Always carry your digital pass</h4>
          <p className="text-xs text-blue-800/80 mt-1">
            This pass serves as your entry ticket to local chapter meetings and official voting polls within your district. Keep it secure.
          </p>
        </div>
      </div>

      <div className="bg-gray-100/50 border border-gray-200 rounded-3xl p-6 md:p-12 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        <div className="relative z-10 w-full max-w-sm">
          {/* AB PASS MEIN DYNAMIC DATA JAA RAHA HAI */}
          <DigitalPass 
            name={userData.name}
            state={userData.state}
            district={userData.district}
            memberId={userData.memberId || "PENDING"}
          />
        </div>
        
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-8 text-center max-w-xs relative z-10">
          Cryptographically secured and verified by the central command
        </p>
      </div>
    </div>
  );
}