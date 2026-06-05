// app/dashboard/page.tsx
"use client";

import { ShieldCheck, MapPin, Eye, ArrowRight, Loader2, Bell, UserCircle, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import DigitalPass from "@/components/DigitalPass";
import { useUser } from "@/hooks/useUser"; 
import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CitizenDashboard() {
  const { userData, loadingUser } = useUser();
  const [recentWatchdogs, setRecentWatchdogs] = useState<any[]>([]);
  const [loadingWatchdogs, setLoadingWatchdogs] = useState(true);
  
  // 🚀 UPCOMING MEETINGS STATE 🚀
  const [upcomingMeets, setUpcomingMeets] = useState<any[]>([]);

  // Watchdog Fetcher
  useEffect(() => {
    const fetchWatchdogs = async () => {
      try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const posts: any[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.type === "watchdog" && data.status === "Published") {
            posts.push({ id: doc.id, ...data });
          }
        });
        setRecentWatchdogs(posts.slice(0, 3));
      } catch (error) {
        console.error("Error fetching watchdogs", error);
      } finally {
        setLoadingWatchdogs(false);
      }
    };
    fetchWatchdogs();
  }, []);

  // 🚀 UPCOMING MEETINGS RADAR FETCHER 🚀
  useEffect(() => {
    if (!userData?.state) return;

    // Same advanced matcher from meetings page
    const isAudienceMatched = (meetingTarget: string, userRole: string) => {
      if (!meetingTarget || meetingTarget.includes("All")) return true;
      const r = (userRole || "").toLowerCase();
      const t = meetingTarget.toLowerCase();
      if (t.includes("president") && !t.includes("vice")) return r.includes("president") && !r.includes("vice");
      if (t.includes("vice president")) return r.includes("vice president");
      if (t.includes("general secretary")) return r.includes("general secretary");
      if (t.includes("secretary") && !t.includes("general")) return r.includes("secretary") && !r.includes("general");
      if (t.includes("executive")) return r.includes("executive");
      if (t === "active members only") return r === "active_member" || r === "member";
      return true;
    };

    const q = query(collection(db, "meetings"), where("jurisdictionState", "in", [userData.state, "National", "All India"]));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const threeDaysLater = new Date(today);
      threeDaysLater.setDate(today.getDate() + 3);

      const docs: any[] = [];
      snapshot.forEach((doc) => {
        const meet = doc.data();
        const meetDate = new Date(meet.date);
        
        // Filter logic: Only next 3 days + Not completed
        if (meet.attendanceStatus !== 'Completed' && meetDate >= today && meetDate <= threeDaysLater) {
          // Jurisdiction Check
          if (meet.jurisdictionState === "National" || meet.jurisdictionState === "All India" || meet.jurisdictionDistrict === "State Wide" || meet.jurisdictionDistrict === userData.district) {
             // Audience Check
             if (isAudienceMatched(meet.targetAudience, userData.role)) {
                docs.push({ id: doc.id, ...meet });
             }
          }
        }
      });
      // Sort by date closest first
      setUpcomingMeets(docs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    });
    return () => unsubscribe();
  }, [userData]);


  if (loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#007AFF]" />
        <p className="font-medium text-sm md:text-base">Loading your HQ...</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
        <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-medium text-sm md:text-base">Data not found. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-12">
      
      {/* WELCOME HEADER */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200/60">
        <div className="flex flex-col">
          <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
            Welcome, {userData.name.split(" ")[0]}
          </h2>
          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5 md:mt-1">Secure Session Active</p>
        </div>
        
        <div className="flex items-center gap-3 md:gap-5">
          <button className="relative p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
          <div className="hidden md:block w-px h-8 bg-gray-200"></div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900">Verified Member</p>
              <p className="text-[10px] font-bold text-[#34C759] uppercase tracking-widest">Active Status</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full border border-gray-200 flex items-center justify-center shadow-sm">
              <UserCircle className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 UPCOMING PRIORITY RADAR SECTION (Only visible if meetings exist) 🚀 */}
      {upcomingMeets.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2 ml-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse border border-white shadow-sm"></span> Priority Action Radar (Next 3 Days)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingMeets.map((meet) => (
              <div key={meet.id} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 shadow-lg border border-gray-700 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#007AFF]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
                
                <div className="relative z-10">
                  <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest mb-2 ${meet.type === 'Digital' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'}`}>
                    {meet.type} Meet
                  </span>
                  <h4 className="font-black text-lg leading-tight mb-2 line-clamp-1">{meet.title}</h4>
                  <div className="flex items-center gap-3 text-xs font-medium text-gray-300">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {meet.date}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {meet.time}</span>
                  </div>
                </div>
                
                <Link href="/dashboard/meetings" className="absolute bottom-4 right-4 bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                  <ArrowRight className="w-4 h-4 text-white" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. STATUS BANNER */}
      <div className="bg-gray-900 rounded-2xl md:rounded-3xl p-6 md:p-10 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-gradient-to-br from-[#007AFF]/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-[10px] md:text-xs font-bold tracking-widest uppercase border border-white/20 mb-4 md:mb-6 w-max">
              <ShieldCheck className="w-3.5 h-3.5 text-[#34C759]" /> Verified Citizen
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight mb-3 md:mb-4 leading-tight">
              Ready to create an impact?
            </h1>
            <p className="text-gray-400 font-medium text-sm md:text-base leading-relaxed">
              Your voice matters. Stay updated with local alliance movements and hold the system accountable.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl md:rounded-2xl p-4 flex items-center gap-4 w-full md:w-auto shrink-0">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 md:w-6 md:h-6 text-[#007AFF]" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operating Region</p>
              <p className="font-bold text-white truncate">{userData.district}, {userData.state}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. GRID SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* LEFT COL: WATCHDOG PREVIEW */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900">Latest from the Alliance</h3>
            <Link href="/dashboard/watchdog" className="text-xs md:text-sm font-bold text-[#007AFF] hover:text-blue-700 transition-colors flex items-center gap-1">
              View Feed <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <Eye className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
              <h4 className="font-bold text-gray-900 text-sm md:text-base">Watchdog Alerts</h4>
            </div>
            
            <div className="space-y-3 md:space-y-4">
              {loadingWatchdogs ? (
                 <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" /></div>
              ) : recentWatchdogs.length === 0 ? (
                 <div className="py-8 text-center text-sm text-gray-500">No recent watchdog alerts published yet.</div>
              ) : (
                recentWatchdogs.map((post) => (
                  <Link key={post.id} href={`/dashboard/watchdog/${post.id}`} className="block p-4 rounded-xl md:rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 hover:bg-gray-100 transition-all group">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      Alert • {post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString() : "Recent"}
                    </p>
                    <div className="flex items-start justify-between gap-4">
                      <h5 className="font-bold text-gray-900 text-sm md:text-base leading-snug line-clamp-2">{post.title}</h5>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-900 transition-colors shrink-0 mt-0.5" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COL: QUICK IDENTITY */}
        <div className="space-y-4 md:space-y-6">
          <h3 className="text-lg font-black text-gray-900">Your Identity</h3>
          <div className="bg-white border border-gray-200 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm flex flex-col items-center overflow-hidden">
            
            <div className="w-full flex justify-center py-2">
              <div className="w-[380px] shrink-0 flex justify-center transform origin-top scale-[0.75] sm:scale-[0.85] md:scale-100 lg:scale-[0.70] xl:scale-[0.85] transition-transform duration-300 ease-in-out -mb-[80px] sm:-mb-[30px] md:mb-0 lg:-mb-[100px] xl:-mb-[50px]">
                <DigitalPass 
                  name={userData.name}
                  state={userData.state}
                  district={userData.district}
                  memberId={userData.memberId || "PENDING"}
                />
              </div>
            </div>
            
            <Link 
              href="/dashboard/pass"
              className="mt-4 md:mt-2 w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-900 font-bold text-sm text-center rounded-xl transition-colors border border-gray-200 shadow-sm relative z-10"
            >
              View Full Details
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}