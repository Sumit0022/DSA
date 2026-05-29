// app/dashboard/page.tsx
"use client";

import { ShieldCheck, MapPin, Eye, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import DigitalPass from "@/components/DigitalPass";
import { useUser } from "@/hooks/useUser"; // 🔥 IMPORTING THE HOOK

export default function CitizenDashboard() {
  // 🔥 FETCHING REAL USER DATA
  const { userData, loadingUser } = useUser();

  if (loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#007AFF]" />
        <p className="font-medium">Loading your HQ...</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
        <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-medium">Data not found. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      
      {/* 1. STATUS BANNER (Dynamic Name & Location) */}
      <div className="bg-gray-900 rounded-3xl p-8 md:p-10 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#007AFF]/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-bold tracking-widest uppercase border border-white/20 mb-6">
              <ShieldCheck className="w-3.5 h-3.5 text-[#34C759]" /> Verified Citizen
            </span>
            {/* 🔥 DYNAMIC FIRST NAME */}
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
              Ready to create an impact, {userData.name.split(" ")[0]}?
            </h1>
            <p className="text-gray-400 font-medium text-sm md:text-base">
              Your voice matters. Stay updated with local alliance movements and hold the system accountable.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4 shrink-0">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-[#007AFF]" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operating Region</p>
              {/* 🔥 DYNAMIC DISTRICT & STATE */}
              <p className="font-bold text-white">{userData.district}, {userData.state}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. GRID SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COL: WATCHDOG PREVIEW */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900">Latest from the Alliance</h3>
            <Link href="/dashboard/watchdog" className="text-sm font-bold text-[#007AFF] hover:text-blue-700 transition-colors flex items-center gap-1">
              View Feed <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Eye className="w-5 h-5 text-red-500" />
              <h4 className="font-bold text-gray-900">Watchdog Alerts</h4>
            </div>
            
            <div className="space-y-4">
              <Link href="#" className="block p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 hover:bg-gray-100 transition-all group">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Education • Today</p>
                <div className="flex items-start justify-between gap-4">
                  <h5 className="font-bold text-gray-900">The Need for Educational Reform in UP</h5>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-900 transition-colors shrink-0" />
                </div>
              </Link>
              
              <Link href="#" className="block p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 hover:bg-gray-100 transition-all group">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Health • 2 Days Ago</p>
                <div className="flex items-start justify-between gap-4">
                  <h5 className="font-bold text-gray-900">Healthcare Budget Cuts Exposed</h5>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-900 transition-colors shrink-0" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT COL: QUICK IDENTITY */}
        <div className="space-y-6">
          <h3 className="text-lg font-black text-gray-900">Your Identity</h3>
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col items-center">
            
            <div className="transform scale-90 origin-top">
              {/* 🔥 DYNAMIC PASS IN SIDEBAR */}
              <DigitalPass 
                name={userData.name}
                state={userData.state}
                district={userData.district}
                memberId={userData.memberId || "PENDING"}
              />
            </div>
            
            <Link 
              href="/dashboard/pass"
              className="mt-2 w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-900 font-bold text-sm text-center rounded-xl transition-colors border border-gray-200"
            >
              View Full Options
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}