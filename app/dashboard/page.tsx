// app/dashboard/page.tsx
"use client";

import { ShieldCheck, MapPin, Eye, ArrowRight, Loader2, Bell, UserCircle, Calendar, Clock, Award, Activity, FileSignature, Megaphone, ChevronRight, Users, HeartHandshake, CheckSquare, TrendingUp } from "lucide-react";
import Link from "next/link";
import DigitalPass from "@/components/DigitalPass";
import { useUser } from "@/hooks/useUser"; 
import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, where, onSnapshot, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";

export default function CitizenDashboard() {
  const { userData, loadingUser } = useUser();
  const [recentWatchdogs, setRecentWatchdogs] = useState<any[]>([]);
  const [loadingWatchdogs, setLoadingWatchdogs] = useState(true);
  
  // 🚀 UPCOMING MEETINGS STATE 🚀
  const [upcomingMeets, setUpcomingMeets] = useState<any[]>([]);
  
  // 🔔 UNREAD NOTIFICATIONS, PETITIONS & VOTING STATE 🔔
  const [unreadCount, setUnreadCount] = useState(0);
  const [activePetitions, setActivePetitions] = useState<any[]>([]);
  const [loadingPetitions, setLoadingPetitions] = useState(true);
  const [activeVoteCount, setActiveVoteCount] = useState(0); // For Smart Voting Button

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
        setRecentWatchdogs(posts.slice(0, 2)); // Show only top 2
      } catch (error) {
        console.error("Error fetching watchdogs", error);
      } finally {
        setLoadingWatchdogs(false);
      }
    };
    fetchWatchdogs();
  }, []);

  // 🔥 UPDATED: Live Campaigns/Petitions Fetcher (Only Boosted, Index-Safe) 🔥
  useEffect(() => {
    const fetchPetitions = async () => {
      try {
        // Fetch only boosted petitions
        const q = query(collection(db, "petitions"), where("isBoosted", "==", true));
        
        const unsub = onSnapshot(q, (snap) => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          
          // In-memory sort by createdAt to bypass the need for a composite index
          docs.sort((a: any, b: any) => {
            const timeA = a.createdAt?.toMillis() || 0;
            const timeB = b.createdAt?.toMillis() || 0;
            return timeB - timeA;
          });

          // Slice top 2 most recent boosted petitions
          setActivePetitions(docs.slice(0, 2));
          setLoadingPetitions(false);
        });
        return () => unsub();
      } catch (error) {
        console.error("Error fetching petitions", error);
        setLoadingPetitions(false);
      }
    };
    fetchPetitions();
  }, []);

  // 🔴 SMART VOTING LIVE CHECKER 🔴
  useEffect(() => {
    try {
      const q = query(collection(db, "polls"), where("status", "==", "Active"));
      const unsub = onSnapshot(q, (snap) => {
        setActiveVoteCount(snap.docs.length);
      });
      return () => unsub();
    } catch (error) {
      console.error("Error fetching active polls", error);
    }
  }, []);

  // 🚀 UPCOMING MEETINGS RADAR FETCHER 🚀
  useEffect(() => {
    if (!userData?.state) return;

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
        
        if (meet.attendanceStatus !== 'Completed' && meetDate >= today && meetDate <= threeDaysLater) {
          if (meet.jurisdictionState === "National" || meet.jurisdictionState === "All India" || meet.jurisdictionDistrict === "State Wide" || meet.jurisdictionDistrict === userData.district) {
             if (isAudienceMatched(meet.targetAudience, userData.role)) {
                docs.push({ id: doc.id, ...meet });
             }
          }
        }
      });
      setUpcomingMeets(docs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    });
    return () => unsubscribe();
  }, [userData]);

  // 🔔 UNREAD NOTIFICATIONS FETCHER 🔔
  useEffect(() => {
    if (!userData?.id) return;
    const notifQuery = query(collection(db, "notifications"), where("userId", "==", userData.id), where("isRead", "==", false));
    const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
      setUnreadCount(snapshot.docs.length);
    });
    return () => unsubscribe();
  }, [userData?.id]);


  if (loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#007AFF]" />
        <p className="font-medium text-sm md:text-base tracking-widest uppercase">Loading your Dashboard...</p>
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
          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5 md:mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Secure Session Active
          </p>
        </div>
        
        <div className="flex items-center gap-3 md:gap-5">
          <Link href="/dashboard/notifications" className="relative p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
            <Bell className="w-6 h-6 md:w-5 md:h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[14px] h-3.5 bg-red-500 rounded-full border border-white text-white text-[8px] font-black px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          
          <div className="hidden sm:block w-px h-8 bg-gray-200"></div>
          
          <Link href="/dashboard/profile" className="hidden sm:flex items-center gap-2 md:gap-3 group">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900 group-hover:text-[#007AFF] transition-colors">Verified Member</p>
              <p className="text-[10px] font-bold text-[#34C759] uppercase tracking-widest">{userData.roleLevel || 'Citizen'}</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full border border-gray-200 flex items-center justify-center shadow-sm overflow-hidden group-hover:border-[#007AFF] transition-colors">
              {userData.profilePic || userData.profileImage || userData.photoURL ? (
                <img src={userData.profilePic || userData.profileImage || userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-5 h-5 md:w-6 md:h-6 text-gray-400 group-hover:text-[#007AFF] transition-colors" />
              )}
            </div>
          </Link>
        </div>
      </div>

      {/* GAMIFICATION & STATS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reward Points</p>
            <p className="text-xl font-black text-gray-900">{userData.points || 0}</p>
          </div>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Engagement</p>
            <p className="text-xl font-black text-gray-900">Active</p>
          </div>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 col-span-2 md:col-span-2">
           <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#007AFF] flex items-center justify-center shrink-0">
             <MapPin className="w-5 h-5" />
           </div>
           <div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operating Region</p>
             <p className="text-sm md:text-base font-black text-gray-900 truncate">{userData.district}, {userData.state}</p>
           </div>
        </div>
      </div>

      {/* 🚀 UPCOMING PRIORITY RADAR SECTION 🚀 */}
      {upcomingMeets.length > 0 && (
        <div>
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

      {/* MAIN GRID SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* LEFT COL: ACTIONS, WATCHDOG, CAMPAIGNS */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          
          {/* QUICK ACTIONS BENTO */}
          <div>
            <h3 className="text-lg font-black text-gray-900 mb-4">Command Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
              
              {/* BUTTON 1: SMART VOTING */}
              <Link href="/dashboard/voting" className="bg-white border border-gray-200 p-4 rounded-2xl hover:border-[#007AFF]/30 hover:shadow-lg transition-all group flex flex-col items-center text-center relative overflow-hidden">
                {activeVoteCount > 0 && (
                  <span className="absolute top-2 right-2 flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest animate-pulse shadow-sm z-10">
                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span> Live
                  </span>
                )}
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform relative z-10">
                  <CheckSquare className="w-5 h-5"/>
                </div>
                <span className="text-xs font-bold text-gray-900 relative z-10">Voting</span>
              </Link>
              
              {/* BUTTON 2: VIEW PROGRESS */}
              <Link href="/dashboard/progress" className="bg-white border border-gray-200 p-4 rounded-2xl hover:border-[#007AFF]/30 hover:shadow-lg transition-all group flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5"/>
                </div>
                <span className="text-xs font-bold text-gray-900">View Progress</span>
              </Link>

              {/* BUTTON 3: FIND LEADERS */}
              <Link href="/dashboard/leaders" className="bg-white border border-gray-200 p-4 rounded-2xl hover:border-[#007AFF]/30 hover:shadow-lg transition-all group flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><Users className="w-5 h-5"/></div>
                <span className="text-xs font-bold text-gray-900">Find Leaders</span>
              </Link>

              {/* BUTTON 4: DONATE */}
              <Link href="/dashboard/donate" className="bg-white border border-gray-200 p-4 rounded-2xl hover:border-[#007AFF]/30 hover:shadow-lg transition-all group flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><HeartHandshake className="w-5 h-5"/></div>
                <span className="text-xs font-bold text-gray-900">Donate</span>
              </Link>

            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* WATCHDOG WIDGET */}
            <div className="bg-white border border-gray-200 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-red-500" />
                  <h4 className="font-black text-gray-900 text-sm md:text-base">Watchdog Feed</h4>
                </div>
                <Link href="/dashboard/watchdog" className="text-[10px] font-bold text-[#007AFF] uppercase tracking-widest hover:underline">View All</Link>
              </div>
              <div className="space-y-3 flex-1">
                {loadingWatchdogs ? (
                  <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
                ) : recentWatchdogs.length === 0 ? (
                  <div className="py-4 text-center text-xs text-gray-500">No active alerts in your region.</div>
                ) : (
                  recentWatchdogs.map((post) => (
                    <Link key={post.id} href={`/dashboard/watchdog/${post.id}`} className="block p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors group">
                      <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest mb-1">Alert Issued</p>
                      <h5 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{post.title}</h5>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* LIVE CAMPAIGNS WIDGET */}
            <div className="bg-white border border-gray-200 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <FileSignature className="w-5 h-5 text-[#007AFF]" />
                  <h4 className="font-black text-gray-900 text-sm md:text-base">Active Campaigns</h4>
                </div>
              </div>
              <div className="space-y-3 flex-1">
                {loadingPetitions ? (
                  <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
                ) : activePetitions.length === 0 ? (
                  <div className="py-4 text-center text-xs text-gray-500">No petitions running currently.</div>
                ) : (
                  activePetitions.map((pet) => {
                     const progress = Math.min(100, Math.round(((pet.signatureCount || 0) / (pet.targetSignatures || 1)) * 100));
                     return (
                      <Link key={pet.id} href={`/petition/${pet.id}`} className="block p-4 rounded-xl bg-blue-50/50 border border-blue-100 hover:bg-blue-50 transition-colors group relative overflow-hidden">
                        <h5 className="font-black text-gray-900 text-sm leading-snug line-clamp-1 mb-2">{pet.title}</h5>
                        <div className="w-full bg-white rounded-full h-1.5 overflow-hidden">
                          <div className="bg-[#007AFF] h-full rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex justify-between mt-1.5">
                           <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Signatures</span>
                           <span className="text-[10px] font-black text-[#007AFF]">{pet.signatureCount || 0} / {pet.targetSignatures}</span>
                        </div>
                      </Link>
                     )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COL: QUICK IDENTITY */}
        <div className="space-y-4 md:space-y-6">
          <h3 className="text-lg font-black text-gray-900">Your Citizen Pass</h3>
          <div className="bg-white border border-gray-200 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm flex flex-col items-center overflow-hidden">
            
            <div className="w-full flex justify-center py-2">
              <div className="w-[380px] shrink-0 flex justify-center transform origin-top scale-[0.75] sm:scale-[0.85] md:scale-[0.90] lg:scale-[0.70] xl:scale-[0.85] transition-transform duration-300 ease-in-out -mb-[80px] sm:-mb-[30px] md:mb-0 lg:-mb-[100px] xl:-mb-[50px]">
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
              className="mt-4 md:mt-2 w-full py-3 bg-gray-900 hover:bg-black text-white font-bold text-sm text-center rounded-xl transition-colors shadow-md relative z-10 flex items-center justify-center gap-2"
            >
              Access Full Identity <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}