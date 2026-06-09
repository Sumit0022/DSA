// app/admin/leaderboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Trophy, Globe, Crown, Shield, Award, Search, 
  Loader2, ChevronRight, MapPin, Phone, Mail, Star, 
  User, ClipboardList, AlertTriangle 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

type LeaderboardTab = "Universal" | "National" | "State" | "District";

interface LeaderboardMember {
  id: string;
  name: string;
  phone: string;
  email?: string;
  state: string;
  district: string;
  roleTitle?: string;
  role?: string;
  roleLevel?: string;
  points: number;
}

export default function AdminLeaderboardPage() {
  // Data States
  const [leaders, setLeaders] = useState<LeaderboardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [indiaData, setIndiaData] = useState<Record<string, string[]>>({});

  // Filter States
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("Universal");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // FETCH STATES AND DISTRICTS FOR FILTERS
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/sab99r/Indian-States-And-Districts/master/states-and-districts.json')
      .then(res => res.json())
      .then(data => {
        const formatted: Record<string, string[]> = {};
        data.states.forEach((s: any) => formatted[s.state] = s.districts);
        setIndiaData(formatted);
      })
      .catch(err => console.error("Location load error:", err));
  }, []);

  // 🔥 CORE LIVE QUERY LOGIC ENGINE 🔥
  useEffect(() => {
    setLoading(true);
    const membersRef = collection(db, "members");
    let q = query(membersRef, orderBy("points", "desc"), limit(200)); // Base Universal Query

    if (activeTab === "National") {
      q = query(membersRef, where("roleLevel", "==", "National"), orderBy("points", "desc"), limit(100));
    } 
    else if (activeTab === "State") {
      if (selectedState) {
        q = query(membersRef, where("roleLevel", "==", "State"), where("state", "==", selectedState), orderBy("points", "desc"), limit(100));
      } else {
        q = query(membersRef, where("roleLevel", "==", "State"), orderBy("points", "desc"), limit(100));
      }
    } 
    else if (activeTab === "District") {
      if (selectedState && selectedDistrict) {
        q = query(membersRef, where("roleLevel", "==", "District"), where("state", "==", selectedState), where("district", "==", selectedDistrict), orderBy("points", "desc"), limit(100));
      } else if (selectedState) {
        q = query(membersRef, where("roleLevel", "==", "District"), where("state", "==", selectedState), orderBy("points", "desc"), limit(100));
      } else {
        q = query(membersRef, where("roleLevel", "==", "District"), orderBy("points", "desc"), limit(100));
      }
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: LeaderboardMember[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        docs.push({ id: docSnap.id, ...data } as LeaderboardMember);
      });
      setLeaders(docs);
      setLoading(false);
    }, (error) => {
      console.error("Leaderboard Live Sync Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab, selectedState, selectedDistrict]);

  // Client-side search filtration
  const filteredLeaders = useMemo(() => {
    if (!searchQuery.trim()) return leaders;
    const lower = searchQuery.toLowerCase();
    return leaders.filter(l => 
      l.name?.toLowerCase().includes(lower) ||
      l.phone?.includes(lower) ||
      l.email?.toLowerCase().includes(lower) ||
      l.roleTitle?.toLowerCase().includes(lower) ||
      l.district?.toLowerCase().includes(lower) ||
      l.state?.toLowerCase().includes(lower)
    );
  }, [leaders, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 px-4 sm:px-6">
      
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mb-4">
          <Link href="/admin/settings" className="hover:text-gray-600 transition-colors">Settings</Link> 
          <ChevronRight className="w-3 h-3" /> 
          <span className="text-gray-600">Performance Intelligence</span>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Performance Matrix</h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">Real-time merit and operations scoreboard across all metrics.</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* MATRIX CONTROL SYSTEM */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* FILTERS COLUMN */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
          <div>
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">1. Scope Selection</h3>
            <div className="flex flex-col gap-1.5">
              {([
                { id: "Universal", label: "Universal Board", icon: Globe },
                { id: "National", label: "National Command", icon: Crown },
                { id: "State", label: "State Level", icon: Shield },
                { id: "District", label: "District Level", icon: Award }
              ] as const).map(tab => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedState(""); setSelectedDistrict(""); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all ${isSelected ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                    <Icon className="w-4 h-4 shrink-0" /> {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* REGIONAL CASCADE SELECTION */}
          <AnimatePresence mode="wait">
            {(activeTab === "State" || activeTab === "District") && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 border-t border-gray-100 pt-4">
                <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">2. Boundary Filtration</h3>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">State Domain</label>
                  <select value={selectedState} onChange={e => { setSelectedState(e.target.value); setSelectedDistrict(""); }} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-[#007AFF] text-gray-900">
                    <option value="">All States...</option>
                    {Object.keys(indiaData).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {activeTab === "District" && (
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1.5 block">District Domain</label>
                    <select value={selectedDistrict} disabled={!selectedState} onChange={e => setSelectedDistrict(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-[#007AFF] text-gray-900 disabled:opacity-50">
                      <option value="">All Districts...</option>
                      {selectedState && indiaData[selectedState]?.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* LEDGER/TABLE VIEW */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* SEARCH INDEPENDENT TOOLBAR */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search matrix by name, phone, post, or territory..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm text-sm focus:border-[#007AFF] focus:ring-4 focus:ring-blue-50 outline-none transition-all font-medium"
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
                    <th className="px-6 py-4 font-black text-center w-16">Rank</th>
                    <th className="px-6 py-4 font-black">Officer Identity</th>
                    <th className="px-6 py-4 font-black">Post / Assignment</th>
                    <th className="px-6 py-4 font-black">Jurisdiction domain</th>
                    <th className="px-6 py-4 font-black text-right">Action Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF] mx-auto mb-2" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Compiling Merit Registry...</p>
                      </td>
                    </tr>
                  ) : filteredLeaders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-sm text-gray-400 font-bold">
                        <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        No record logs matched your filter parameters.
                      </td>
                    </tr>
                  ) : (
                    filteredLeaders.map((leader, index) => (
                      <tr key={leader.id} className="hover:bg-gray-50/50 transition-colors">
                        
                        {/* RANK */}
                        <td className="px-6 py-5 text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black font-mono ${
                            index === 0 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300' :
                            index === 1 ? 'bg-gray-100 text-gray-700 ring-2 ring-gray-300' :
                            index === 2 ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300' : 'text-gray-400 bg-gray-50'
                          }`}>
                            {index + 1}
                          </span>
                        </td>

                        {/* FULL IDENTITY DETAILS */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center text-xs font-black shrink-0">
                              {leader.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-black text-gray-900">{leader.name}</p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-400 font-medium">
                                <span className="flex items-center gap-1"><Phone size={12}/> +91 {leader.phone}</span>
                                {leader.email && <span className="flex items-center gap-1"><Mail size={12}/> {leader.email}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* DESIGNATED POST */}
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border ${
                            leader.roleLevel === "National" ? 'bg-purple-50 text-purple-700 border-purple-100' :
                            leader.roleLevel === "State" ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-orange-50 text-orange-700 border-orange-100'
                          }`}>
                            {leader.roleTitle || leader.role?.replace(/_/g, ' ') || 'Citizen'}
                          </span>
                        </td>

                        {/* REGION / JURISDICTION */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
                            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                            <span>
                              {leader.roleLevel === "National" ? "All India" : `${leader.district ? `${leader.district}, ` : ''}${leader.state}`}
                            </span>
                          </div>
                        </td>

                        {/* TOTAL REWARD POINTS */}
                        <td className="px-6 py-5 text-right">
                          <div className="inline-flex flex-col items-end">
                            <p className="text-lg font-black text-gray-950 flex items-center gap-1 font-mono">
                              <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {leader.points || 0}
                            </p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-0.5">Accumulated</p>
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}