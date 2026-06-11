// app/admin/leaderboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, increment, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Trophy, Globe, Crown, Shield, Award, Search, 
  Loader2, ChevronRight, MapPin, Phone, Mail, Star, 
  User, ClipboardList, AlertTriangle, Plus, X, CheckCircle2, Gift 
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
  const [leaders, setLeaders] = useState<LeaderboardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [indiaData, setIndiaData] = useState<Record<string, string[]>>({});

  const [activeTab, setActiveTab] = useState<LeaderboardTab>("Universal");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedMemberForPoints, setSelectedMemberForPoints] = useState<LeaderboardMember | null>(null);
  const [pointsToAdd, setPointsToAdd] = useState<number | "">("");
  const [isGranting, setIsGranting] = useState(false);

  // UNIVERSAL REWARD MODAL STATES
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardSearchQuery, setRewardSearchQuery] = useState("");
  const [rewardSearchResults, setRewardSearchResults] = useState<LeaderboardMember[]>([]);
  const [isSearchingReward, setIsSearchingReward] = useState(false);

  // TOAST STATE
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | null }>({ message: "", type: null });
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: null }), 4000);
  };

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

  useEffect(() => {
    setLoading(true);
    const membersRef = collection(db, "members");
    let q = query(membersRef, orderBy("points", "desc"), limit(200));

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

  const handleGrantPoints = async () => {
    if (!selectedMemberForPoints || !pointsToAdd || Number(pointsToAdd) <= 0) return;
    
    setIsGranting(true);
    try {
      const memberRef = doc(db, "members", selectedMemberForPoints.id);
      await updateDoc(memberRef, {
        points: increment(Number(pointsToAdd))
      });
      showToast(`Successfully added ${pointsToAdd} points to ${selectedMemberForPoints.name}`, "success");
      setSelectedMemberForPoints(null);
      setPointsToAdd("");
      setShowRewardModal(false);
      setRewardSearchQuery("");
      setRewardSearchResults([]);
    } catch (error) {
      console.error("Failed to grant points:", error);
      showToast("System Error: Failed to grant reward points.", "error");
    } finally {
      setIsGranting(false);
    }
  };

  // 🔥 UNIVERSAL SEARCH FOR REWARDS 🔥
  const handleRewardSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardSearchQuery.trim()) return;
    setIsSearchingReward(true);
    try {
      const membersRef = collection(db, "members");
      const snap = await getDocs(query(membersRef, limit(500))); // Fetch chunk for local search
      const term = rewardSearchQuery.toLowerCase();
      const results: LeaderboardMember[] = [];
      
      snap.forEach(docSnap => {
        const m = docSnap.data();
        if (
          m.name?.toLowerCase().includes(term) || 
          m.phone?.includes(term) || 
          m.email?.toLowerCase().includes(term)
        ) {
          results.push({ id: docSnap.id, ...m } as LeaderboardMember);
        }
      });
      setRewardSearchResults(results);
    } catch (err) {
      console.error(err);
      showToast("Failed to search database.", "error");
    } finally {
      setIsSearchingReward(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 px-4 sm:px-6 relative">
      
      {/* ─── TOAST NOTIFICATION ─── */}
      <AnimatePresence>
        {toast.type && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-8 right-8 z-[999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-sm font-bold backdrop-blur-xl border ${toast.type === "success" ? "bg-gray-950/95 text-white border-white/10" : "bg-red-50/95 text-red-600 border-red-200"}`}
          >
            {toast.type === "success" ? <CheckCircle2 className="text-emerald-400 w-5 h-5 shrink-0" /> : <AlertTriangle className="text-red-500 w-5 h-5 shrink-0" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── POINT GRANTING MODAL (UNIVERSAL & IN-LINE) ─── */}
      <AnimatePresence>
        {selectedMemberForPoints && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden p-7 text-center relative"
            >
              <button 
                onClick={() => { setSelectedMemberForPoints(null); setPointsToAdd(""); }}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100 shadow-sm mt-2">
                <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-1">Grant Merit Points</h3>
              <p className="text-sm font-medium text-gray-500 mb-6">
                Rewarding <strong className="text-gray-900">{selectedMemberForPoints.name}</strong> for outstanding contribution.
              </p>
              
              <div className="text-left mb-6">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Points to Add</label>
                <div className="relative">
                  <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="number" 
                    min="1"
                    placeholder="Enter point value (e.g. 50)"
                    value={pointsToAdd}
                    onChange={e => setPointsToAdd(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-blue-50 transition-all text-gray-900"
                  />
                </div>
              </div>

              <button 
                onClick={handleGrantPoints}
                disabled={isGranting || !pointsToAdd || Number(pointsToAdd) <= 0}
                className="w-full py-3.5 bg-amber-500 text-white font-black rounded-xl shadow-lg shadow-amber-500/30 hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGranting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Confirm & Credit
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── UNIVERSAL SEARCH MODAL ─── */}
      <AnimatePresence>
        {showRewardModal && !selectedMemberForPoints && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">Universal Rewards</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Find & credit any member</p>
                  </div>
                </div>
                <button onClick={() => { setShowRewardModal(false); setRewardSearchQuery(""); setRewardSearchResults([]); }} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 flex-1 flex flex-col overflow-hidden">
                <form onSubmit={handleRewardSearch} className="relative shrink-0 mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search by name, email or phone..." 
                    value={rewardSearchQuery}
                    onChange={e => setRewardSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-24 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm text-sm font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-gray-900"
                  />
                  <button type="submit" disabled={isSearchingReward || !rewardSearchQuery.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    {isSearchingReward ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                  </button>
                </form>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {isSearchingReward ? (
                     <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                       <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                       <span className="text-xs font-bold uppercase tracking-widest">Scanning Database...</span>
                     </div>
                  ) : rewardSearchResults.length > 0 ? (
                    rewardSearchResults.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-black shrink-0">
                            {member.name?.charAt(0)}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-black text-gray-900 truncate">{member.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{member.district}, {member.state}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setSelectedMemberForPoints(member)}
                          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold text-xs rounded-xl shadow-sm hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-all shrink-0 ml-2"
                        >
                          Reward
                        </button>
                      </div>
                    ))
                  ) : rewardSearchQuery && !isSearchingReward ? (
                    <div className="text-center py-10 text-sm font-bold text-gray-400">
                      No citizen found matching this query.
                    </div>
                  ) : (
                    <div className="text-center py-10 text-xs font-bold text-gray-300 uppercase tracking-widest flex flex-col items-center">
                      <Globe className="w-10 h-10 mb-2 opacity-20" />
                      Search global database to grant points
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
          
          {/* 🔥 GIVE REWARD BUTTON 🔥 */}
          <button 
            onClick={() => setShowRewardModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black hover:-translate-y-0.5 transition-all text-sm shrink-0"
          >
            <Gift className="w-4 h-4" /> Give Reward
          </button>
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
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 border-t border-gray-100 pt-4 overflow-hidden">
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
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm text-sm focus:border-[#007AFF] focus:ring-4 focus:ring-blue-50 outline-none transition-all font-medium text-gray-900"
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
                    <th className="px-6 py-4 font-black text-center w-16">Rank</th>
                    <th className="px-6 py-4 font-black">Officer Identity</th>
                    <th className="px-6 py-4 font-black">Post / Assignment</th>
                    <th className="px-6 py-4 font-black">Jurisdiction domain</th>
                    <th className="px-6 py-4 font-black text-center">Action Points</th>
                    <th className="px-6 py-4 font-black text-right">Grant Merit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={6} className="px-6 py-20 text-center"><Loader2 className="w-8 h-8 animate-spin text-[#007AFF] mx-auto mb-2" /><p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Compiling Merit Registry...</p></td></tr>
                  ) : filteredLeaders.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-16 text-center text-sm text-gray-400 font-bold"><ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />No record logs matched your filter parameters.</td></tr>
                  ) : (
                    filteredLeaders.map((leader, index) => (
                      <tr key={leader.id} className="hover:bg-gray-50/50 transition-colors">
                        
                        <td className="px-6 py-5 text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black font-mono ${
                            index === 0 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300' :
                            index === 1 ? 'bg-gray-100 text-gray-700 ring-2 ring-gray-300' :
                            index === 2 ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300' : 'text-gray-400 bg-gray-50'
                          }`}>
                            {index + 1}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center text-xs font-black shrink-0 uppercase">
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

                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border ${
                            leader.roleLevel === "National" ? 'bg-purple-50 text-purple-700 border-purple-100' :
                            leader.roleLevel === "State" ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-orange-50 text-orange-700 border-orange-100'
                          }`}>
                            {leader.roleTitle || leader.role?.replace(/_/g, ' ') || 'Citizen'}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
                            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                            <span>
                              {leader.roleLevel === "National" ? "All India" : `${leader.district ? `${leader.district}, ` : ''}${leader.state}`}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-5 text-center">
                          <div className="inline-flex flex-col items-center">
                            <p className="text-lg font-black text-gray-950 flex items-center gap-1 font-mono">
                              <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {leader.points || 0}
                            </p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-0.5">Accumulated</p>
                          </div>
                        </td>

                        <td className="px-6 py-5 text-right">
                          <button 
                            onClick={() => setSelectedMemberForPoints(leader)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded-lg text-xs font-bold transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" /> Merit
                          </button>
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