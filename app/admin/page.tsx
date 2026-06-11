// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Users, MapPin, TrendingUp, RefreshCcw, Crown, IndianRupee, Megaphone, FileSignature, ShieldAlert, ChevronRight, Activity, Clock, ShieldCheck } from "lucide-react";
import Link from "next/link"; 
import { motion } from "framer-motion";

interface DashboardStats {
  totalCitizens: number;
  totalLeaders: number;
  monthlyDonations: number;
  topRegion: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({ totalCitizens: 0, totalLeaders: 0, monthlyDonations: 0, topRegion: "Calculating..." });
  const [pendingApps, setPendingApps] = useState<any[]>([]);
  const [watchdogAlerts, setWatchdogAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Members for Citizens, Leaders & Top Region
      const membersRef = collection(db, "members");
      const membersSnap = await getDocs(membersRef);
      
      let citizens = 0;
      let leaders = 0;
      const regionCount: Record<string, number> = {};

      membersSnap.forEach((doc) => {
        const data = doc.data();
        if (data.status === "active_member") citizens++;
        if (data.role && data.role !== "active_member" && data.role !== "member") leaders++;
        
        if (data.district) {
          regionCount[data.district] = (regionCount[data.district] || 0) + 1;
        }
      });

      // Find Top Region
      let topRegion = "N/A";
      let maxCount = 0;
      Object.entries(regionCount).forEach(([region, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topRegion = region;
        }
      });

      // 2. Fetch Donations for Current Month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      let monthlyDonations = 0;
      try {
        const donationsRef = collection(db, "donations");
        const donQuery = query(donationsRef, where("createdAt", ">=", startOfMonth));
        const donSnap = await getDocs(donQuery);
        donSnap.forEach(doc => {
          monthlyDonations += Number(doc.data().amount || 0);
        });
      } catch (e) {
        console.log("Donations index might be missing, skipping sum.", e);
      }

      setStats({ totalCitizens: citizens, totalLeaders: leaders, monthlyDonations, topRegion });

      // 3. Fetch Pending Leadership Applications
      try {
        const appsRef = collection(db, "applications");
        const appsQuery = query(appsRef, where("status", "in", ["pending", "submitted"]), limit(4));
        const appsSnap = await getDocs(appsQuery);
        const apps: any[] = [];
        appsSnap.forEach(doc => apps.push({ id: doc.id, ...doc.data() }));
        setPendingApps(apps);
      } catch (e) { console.log(e); }

      // 4. Fetch Recent Watchdog Alerts
      try {
        const postsRef = collection(db, "posts");
        const postsQuery = query(postsRef, where("type", "==", "watchdog"), orderBy("createdAt", "desc"), limit(4));
        const postsSnap = await getDocs(postsQuery);
        const alerts: any[] = [];
        postsSnap.forEach(doc => alerts.push({ id: doc.id, ...doc.data() }));
        setWatchdogAlerts(alerts);
      } catch (e) { console.log(e); }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      
      {/* ─── HEADER COMMAND BAR ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-bl from-[#007AFF]/5 to-transparent rounded-bl-full pointer-events-none"></div>
        <div className="relative z-10">
          <p className="text-[10px] font-black text-[#007AFF] uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#007AFF] animate-pulse"></span> SYSTEM ONLINE
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">High Command</h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">Real-time intelligence and operations overview of the alliance.</p>
        </div>
        <button 
          onClick={fetchDashboardData} 
          disabled={loading}
          className="relative z-10 flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-black transition-all active:scale-95 disabled:opacity-50 w-max"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? "Syncing..." : "Sync Matrix"}
        </button>
      </div>

      {/* ─── TOP METRICS BENTO ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Metric 1 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
          <div className="relative z-10">
            <div className="w-10 h-10 bg-blue-100 text-[#007AFF] rounded-xl flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-3xl md:text-4xl font-black text-gray-900">{loading ? "-" : stats.totalCitizens.toLocaleString()}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Verified Citizens</p>
          </div>
        </motion.div>

        {/* Metric 2 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
          <div className="relative z-10">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-4">
              <Crown className="w-5 h-5" />
            </div>
            <p className="text-3xl md:text-4xl font-black text-gray-900">{loading ? "-" : stats.totalLeaders.toLocaleString()}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Appointed Leaders</p>
          </div>
        </motion.div>

        {/* Metric 3 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
          <div className="relative z-10">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <IndianRupee className="w-5 h-5" />
            </div>
            <p className="text-3xl md:text-4xl font-black text-gray-900">₹{loading ? "-" : stats.monthlyDonations.toLocaleString()}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" /> Funds This Month
            </p>
          </div>
        </motion.div>

        {/* Metric 4 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
          <div className="relative z-10">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
              <MapPin className="w-5 h-5" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-gray-900 truncate">{loading ? "-" : stats.topRegion}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Stronghold Region</p>
          </div>
        </motion.div>

      </div>

      {/* ─── QUICK COMMAND ACTIONS ─── */}
      <div>
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Quick Commands</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/admin/press" className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 hover:border-[#007AFF]/30 hover:shadow-md transition-all group">
            <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-full flex items-center justify-center group-hover:bg-[#007AFF] group-hover:text-white transition-colors shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm text-gray-900">Broadcast Press</span>
          </Link>
          <Link href="/admin/petitions" className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 hover:border-[#007AFF]/30 hover:shadow-md transition-all group">
            <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-full flex items-center justify-center group-hover:bg-[#007AFF] group-hover:text-white transition-colors shrink-0">
              <FileSignature className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm text-gray-900">New Petition</span>
          </Link>
          <Link href="/admin/members" className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 hover:border-[#007AFF]/30 hover:shadow-md transition-all group">
            <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-full flex items-center justify-center group-hover:bg-[#007AFF] group-hover:text-white transition-colors shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm text-gray-900">Citizens Ledger</span>
          </Link>
          <Link href="/admin/analytics" className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 hover:border-[#007AFF]/30 hover:shadow-md transition-all group">
            <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-full flex items-center justify-center group-hover:bg-[#007AFF] group-hover:text-white transition-colors shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm text-gray-900">System Analytics</span>
          </Link>
        </div>
      </div>

      {/* ─── SPLIT VIEW: RADAR & INBOX ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        
        {/* WATCHDOG RADAR */}
        <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-red-50/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 text-red-500 rounded-xl flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-gray-900">Watchdog Radar</h3>
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-0.5">Recent Public Reports</p>
              </div>
            </div>
            <Link href="/admin/activity" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4">
            {loading ? (
              <div className="flex justify-center py-10"><RefreshCcw className="w-6 h-6 animate-spin text-gray-300" /></div>
            ) : watchdogAlerts.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm font-bold">No recent watchdog activity.</div>
            ) : (
              watchdogAlerts.map(alert => (
                <div key={alert.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-100 px-2 py-0.5 rounded border border-red-200">Issue Reported</span>
                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {alert.createdAt ? new Date(alert.createdAt.toDate()).toLocaleDateString() : 'Recent'}</span>
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug">{alert.title}</h4>
                </div>
              ))
            )}
          </div>
        </div>

        {/* LEADERSHIP SCREENING INBOX */}
        <div className="bg-[#0A192F] border border-gray-800 rounded-[2rem] shadow-xl flex flex-col overflow-hidden text-white relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>
          <div className="p-6 border-b border-white/10 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#007AFF]/20 text-[#007AFF] rounded-xl flex items-center justify-center border border-[#007AFF]/30">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-white">Screening Inbox</h3>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Action Required
                </p>
              </div>
            </div>
            <Link href="/admin/applications" className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4 relative z-10">
            {loading ? (
              <div className="flex justify-center py-10"><RefreshCcw className="w-6 h-6 animate-spin text-gray-600" /></div>
            ) : pendingApps.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm font-bold">Inbox clear. No pending applications.</div>
            ) : (
              pendingApps.map(app => (
                <Link href="/admin/applications" key={app.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-between group">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      {app.name} 
                      {app.status === "submitted" && <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-widest">AI Screened</span>}
                    </h4>
                    <p className="text-xs text-gray-400 font-medium mt-1">{app.requestedRole || "Pending Assignment"} • {app.district}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                </Link>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}