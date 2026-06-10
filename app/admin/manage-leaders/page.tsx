// app/admin/manage-leaders/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { 
  Users, Crown, Shield, Award, Search, UserPlus, 
  ArrowUpRight, UserX, Loader2, CheckCircle2, ShieldAlert, 
  X, MapPin, CalendarClock, Briefcase, ChevronRight, AlertTriangle, Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ─── TYPES ─────────────────────────────────────────────────────────────
type TitleNode = { id: string; title: string; maxLimit: number };
type RankTier  = { rank: number; titles: TitleNode[] };
type HierarchyType = { National: RankTier[]; State: RankTier[]; District: RankTier[] };
type Jurisdiction = "National" | "State" | "District";

export default function ManageLeadersPage() {
  const { userData } = useUser();
  
  // Data States
  const [hierarchy, setHierarchy] = useState<HierarchyType | null>(null);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [indiaData, setIndiaData] = useState<Record<string, string[]>>({});
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Jurisdiction>("State");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");

  // Modals
  const [appointModal, setAppointModal] = useState(false);
  const [promoteModal, setPromoteModal] = useState<any>(null);
  const [dismissModal, setDismissModal] = useState<any>(null);

  // Forms
  const [searchPhone, setSearchPhone] = useState("");
  const [foundMember, setFoundMember] = useState<any>(null);
  const [searchingMember, setSearchingMember] = useState(false);
  const [selectedPost, setSelectedPost] = useState("");
  const [termYears, setTermYears] = useState("2");
  const [isProcessing, setIsProcessing] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | null }>({ message: "", type: null });
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: null }), 4000);
  };

  // ─── NOTIFICATION DISPATCHER HELPER ───
  const sendNotification = async (userId: string, title: string, message: string, type: "success" | "alert" | "info") => {
    try {
      await addDoc(collection(db, "notifications"), {
        userId,
        title,
        message,
        type,
        isRead: false,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Notification Dispatch Error:", error);
    }
  };

  // 🔥 CORE HELPER: AUTOMATIC PRESS WIRE PUBLISHER 🔥
  const dispatchAutoPressRelease = async (actionType: "appoint" | "promote" | "dismiss", memberDetails: any, roleDisplay: string) => {
    try {
      let content = "";
      let caption = "";
      const locDisplay = activeTab === "National" ? "All India" : activeTab === "State" ? selectedState : `${selectedDistrict}, ${selectedState}`;

      if (actionType === "appoint") {
        caption = `🚨 NEW APPOINTMENT: ${memberDetails.name} appointed as ${roleDisplay} for ${locDisplay}.`;
        content = `By the decisive authority of the High Command, the Democratic Social Alliance officially appoints ${memberDetails.name} to the office of ${roleDisplay} for ${locDisplay}. 
Their dedication to the organization's vision has warranted this command clearance. They are expected to assume operational duties with immediate effect and execute the mandates with absolute integrity.`;
      } else if (actionType === "promote") {
        caption = `⚡ PROMOTION: ${memberDetails.name} elevated to ${roleDisplay} for ${locDisplay}.`;
        content = `By the decisive authority of the High Command, the Democratic Social Alliance officially elevates ${memberDetails.name} to the office of ${roleDisplay} for ${locDisplay}. 

This promotion stands as a testament to their unwavering discipline and leadership. They are directed to take full charge of their new jurisdiction effective immediately.`;
      } else if (actionType === "dismiss") {
        caption = `⚠️ COMMAND REVOKED: ${memberDetails.name} removed from ${roleDisplay} for ${locDisplay}.`;
        content = `Maintaining our absolute commitment to uncompromised integrity, discipline, and organizational protocol, the High Command has officially revoked the command clearance of ${memberDetails.name} from the office of ${roleDisplay} for ${locDisplay}. 

This decision is effective immediately, and all administrative access linked to this profile stands completely terminated.`;
      }

      // 🔥 ALWAYS FETCH NATIONAL PRESIDENT FOR SIGNATURES 🔥
      const membersRef = collection(db, "members");
      let sigName = "High Command";
      let sigTitle = "National President";
      let sigSignature = null;

      try {
        const sigQuery = query(membersRef, where("roleLevel", "==", "National"), where("roleTitle", "in", ["President", "National President"]));
        const sigSnap = await getDocs(sigQuery);
        
        if (!sigSnap.empty) {
          const sigData = sigSnap.docs[0].data();
          sigName = sigData.name;
          sigTitle = sigData.role || "National President";
          sigSignature = sigData.signatureUrl || sigData.signature || sigData.signatureImage || sigData.profilePic || null;
        } else {
          sigTitle = "Acting National President";
        }
      } catch (err) {
        console.error("Signature Fetch Error:", err);
      }

      // Push to Press Releases
      await addDoc(collection(db, "press_releases"), {
        caption: caption,
        content: content,
        jurisdictionLevel: activeTab,
        targetState: selectedState || "",
        targetDistrict: selectedDistrict || "",
        locationDisplay: locDisplay,
        refNumber: `DSA/PR/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
        status: "published",
        scheduledFor: null,
        signatoryName: sigName,
        signatoryTitle: sigTitle,
        signatorySignature: sigSignature,
        createdAt: serverTimestamp(),
        issuedBy: "System_Automation"
      });

    } catch (err) {
      console.error("Auto Press Release Failed:", err);
    }
  };


  // ─── INITIAL FETCH ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch('https://raw.githubusercontent.com/sab99r/Indian-States-And-Districts/master/states-and-districts.json');
        const data = await res.json();
        const formatted: Record<string, string[]> = {};
        data.states.forEach((s: any) => formatted[s.state] = s.districts);
        setIndiaData(formatted);
      } catch (err) { console.error(err); }
    };

    const fetchHierarchy = async () => {
      try {
        const docSnap = await getDoc(doc(db, "settings", "roles_hierarchy"));
        if (docSnap.exists()) setHierarchy(docSnap.data() as HierarchyType);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };

    fetchLocations();
    fetchHierarchy();
  }, []);

  // ─── LIVE FETCH LEADERS BASED ON JURISDICTION ────────────────────────
  useEffect(() => {
    if (!hierarchy) return;
    
    // Construct Query based on Jurisdiction
    let q = query(collection(db, "members"), where("roleLevel", "==", activeTab));
    if (activeTab === "State" && selectedState) {
      q = query(collection(db, "members"), where("roleLevel", "==", "State"), where("state", "==", selectedState));
    } else if (activeTab === "District" && selectedState && selectedDistrict) {
      q = query(collection(db, "members"), where("roleLevel", "==", "District"), where("state", "==", selectedState), where("district", "==", selectedDistrict));
    } else if (activeTab !== "National") {
      setLeaders([]); // Don't fetch if state/district not selected yet
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
      setLeaders(docs);
    });
    return () => unsubscribe();
  }, [activeTab, selectedState, selectedDistrict, hierarchy]);


  // ─── VACANCY CALCULATOR ENGINE ───────────────────────────────────────
  const getVacancyData = () => {
    if (!hierarchy) return [];
    const currentTiers = hierarchy[activeTab] || [];
    const posts: { title: string, max: number, filled: number, isAvailable: boolean }[] = [];

    currentTiers.forEach(tier => {
      tier.titles.forEach(t => {
        // Count how many leaders hold this exact title
        const filledCount = leaders.filter(l => l.roleTitle === t.title).length;
        posts.push({
          title: t.title,
          max: t.maxLimit || 1,
          filled: filledCount,
          isAvailable: filledCount < (t.maxLimit || 1)
        });
      });
    });
    return posts;
  };

  const vacancyData = getVacancyData();
  const availablePosts = vacancyData.filter(p => p.isAvailable);


  // ─── MEMBER SEARCH ───────────────────────────────────────────────────
  const searchMemberByPhone = async () => {
    if (searchPhone.length !== 10) return showToast("Enter a valid 10-digit phone number", "error");
    setSearchingMember(true);
    setFoundMember(null);
    try {
      const q = query(collection(db, "members"), where("phone", "==", searchPhone));
      const snap = await getDocs(q);
      if (snap.empty) {
        showToast("No citizen found with this number.", "error");
      } else {
        const member: any = { id: snap.docs[0].id, ...snap.docs[0].data() };
        if (member.roleTitle) showToast("Warning: This member already holds a post.", "error");
        setFoundMember(member);
      }
    } catch (err) { console.error(err); }
    finally { setSearchingMember(false); }
  };

  // ─── ACTIONS (Appoint, Promote, Dismiss) ─────────────────────────────
  const executeAppoint = async () => {
    if (!foundMember || !selectedPost) return showToast("Select a member and a post.", "error");
    setIsProcessing(true);
    try {
      const combinedRoleDisplay = selectedPost.toLowerCase().includes(activeTab.toLowerCase()) 
  ? selectedPost 
  : activeTab === "National" ? `National ${selectedPost}` : `${activeTab} ${selectedPost}`;
      
      await updateDoc(doc(db, "members", foundMember.id), {
        role: combinedRoleDisplay,
        roleLevel: activeTab,
        roleTitle: selectedPost,
        state: activeTab !== "National" ? selectedState : null,
        district: activeTab === "District" ? selectedDistrict : null,
        appointmentDate: serverTimestamp(),
        termYears: Number(termYears)
      });
      
      // Dispatch Notification
      await sendNotification(
        foundMember.id, 
        "Official Appointment Confirmed", 
        `You have been officially appointed as the ${combinedRoleDisplay}. Please review your workspace for operational directives.`, 
        "success"
      );

      // 🔥 FIRE AUTO PRESS RELEASE 🔥
      await dispatchAutoPressRelease("appoint", foundMember, combinedRoleDisplay);

      showToast(`${foundMember.name} appointed as ${selectedPost}`, "success");
      setAppointModal(false); resetForms();
    } catch (err) { showToast("Failed to appoint.", "error"); }
    finally { setIsProcessing(false); }
  };

  const executePromote = async () => {
    if (!promoteModal || !selectedPost) return;
    setIsProcessing(true);
    try {
      const combinedRoleDisplay = selectedPost.toLowerCase().includes(activeTab.toLowerCase()) 
  ? selectedPost 
  : activeTab === "National" ? `National ${selectedPost}` : `${activeTab} ${selectedPost}`;
      
      await updateDoc(doc(db, "members", promoteModal.id), {
        role: combinedRoleDisplay,
        roleLevel: activeTab,
        roleTitle: selectedPost,
        appointmentDate: serverTimestamp(), // Reset term clock on promotion
        termYears: Number(termYears)
      });
      
      // Dispatch Notification
      await sendNotification(
        promoteModal.id, 
        "Promotion Authorized", 
        `Congratulations! You have been promoted to the rank of ${combinedRoleDisplay}. Your term clock has been reset. Lead with integrity!`, 
        "success"
      );

      // 🔥 FIRE AUTO PRESS RELEASE 🔥
      await dispatchAutoPressRelease("promote", promoteModal, combinedRoleDisplay);

      showToast(`Promoted to ${selectedPost}`, "success");
      setPromoteModal(null); resetForms();
    } catch (err) { showToast("Failed to promote.", "error"); }
    finally { setIsProcessing(false); }
  };

  const executeDismiss = async () => {
    if (!dismissModal) return;
    setIsProcessing(true);
    try {
      const pastRole = dismissModal.role || dismissModal.roleTitle;
      
      await updateDoc(doc(db, "members", dismissModal.id), {
        role: null,
        roleLevel: null,
        roleTitle: null,
        appointmentDate: null,
        termYears: null
      });

      // Dispatch Notification
      await sendNotification(
        dismissModal.id, 
        "Command Clearance Revoked", 
        `Your assignment as ${pastRole} has been terminated by the High Command. Your access to the leadership workspace is now restricted.`, 
        "alert"
      );

      // 🔥 FIRE AUTO PRESS RELEASE 🔥
      await dispatchAutoPressRelease("dismiss", dismissModal, pastRole);

      showToast(`${dismissModal.name} has been dismissed from post.`, "success");
      setDismissModal(null);
    } catch (err) { showToast("Failed to dismiss.", "error"); }
    finally { setIsProcessing(false); }
  };

  const resetForms = () => {
    setSearchPhone(""); setFoundMember(null); setSelectedPost(""); setTermYears("2");
  };

  // ─── TERM CALCULATOR ─────────────────────────────────────────────────
  const calculateTerm = (appointDate: any, years: number) => {
    if (!appointDate) return { text: "Unknown", color: "text-gray-500" };
    const start = appointDate.toDate();
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + years);
    const now = new Date();
    const diffMonths = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (diffMonths <= 0) return { text: "Term Expired", color: "text-red-500" };
    if (diffMonths < 3) return { text: `${Math.ceil(diffMonths)} Months Left`, color: "text-orange-500" };
    if (diffMonths < 12) return { text: `${Math.ceil(diffMonths)} Months Left`, color: "text-emerald-500" };
    return { text: `${(diffMonths/12).toFixed(1)} Years Left`, color: "text-emerald-600" };
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#007AFF]" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 px-4 sm:px-6">
      
      <AnimatePresence>
        {toast.type && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-8 right-8 z-[999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm border backdrop-blur-xl ${toast.type === "success" ? "bg-gray-900 text-white border-gray-800" : "bg-red-50 text-red-600 border-red-200"}`}>
            {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <ShieldAlert className="w-5 h-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mb-4">
          <Link href="/admin/settings" className="hover:text-gray-600 transition-colors">Settings</Link> <ChevronRight className="w-3 h-3" /> <Link href="/admin/titles" className="hover:text-gray-600 transition-colors">Titles</Link> <ChevronRight className="w-3 h-3" /> <span className="text-gray-600">Manage Leaders</span>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-[#007AFF]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Command Roster</h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">Appoint, promote, and manage jurisdiction officers.</p>
            </div>
          </div>
          {/* APPOINT BUTTON */}
          <button 
            onClick={() => { resetForms(); setAppointModal(true); }}
            disabled={activeTab !== "National" && !selectedState}
            className="w-full md:w-auto px-6 py-3.5 bg-[#007AFF] text-white rounded-xl font-bold shadow-md hover:bg-blue-600 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <UserPlus className="w-5 h-5" /> Direct Appointment
          </button>
        </div>
      </motion.div>

      {/* JURISDICTION CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
          <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">1. Select Jurisdiction Level</h3>
          <div className="flex gap-2 bg-gray-100 p-1.5 rounded-xl">
            {(["National", "State", "District"] as Jurisdiction[]).map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setSelectedState(""); setSelectedDistrict(""); }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab === 'National' && <Crown className="w-3.5 h-3.5" />}
                {tab === 'State' && <Shield className="w-3.5 h-3.5" />}
                {tab === 'District' && <Award className="w-3.5 h-3.5" />}
                {tab}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {activeTab !== "National" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest pt-2">2. Define Region</h3>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">State Territory</label>
                  <select value={selectedState} onChange={e => { setSelectedState(e.target.value); setSelectedDistrict(""); }} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-[#007AFF] transition-all">
                    <option value="" disabled>Select State...</option>
                    {Object.keys(indiaData).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {activeTab === "District" && (
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1.5 block">District Domain</label>
                    <select value={selectedDistrict} disabled={!selectedState} onChange={e => setSelectedDistrict(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-[#007AFF] transition-all disabled:opacity-50">
                      <option value="" disabled>Select District...</option>
                      {selectedState && indiaData[selectedState]?.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* VACANCY DASHBOARD */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Vacancy & Post Limits Status</h3>
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase tracking-wider border border-blue-100">
              {activeTab} {selectedState && `· ${selectedState}`} {selectedDistrict && `· ${selectedDistrict}`}
            </span>
          </div>

          {(!selectedState && activeTab !== "National") || (activeTab === "District" && !selectedDistrict) ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-100 rounded-2xl">
              <MapPin className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm font-bold text-gray-500">Select jurisdiction region first</p>
              <p className="text-xs text-gray-400 mt-1">To view post limits and current vacancies.</p>
            </div>
          ) : vacancyData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <AlertTriangle className="w-8 h-8 text-orange-300 mb-3" />
              <p className="text-sm font-bold text-gray-500">No titles defined for this tier.</p>
              <Link href="/admin/titles" className="text-xs text-[#007AFF] font-bold mt-2 hover:underline">Manage Hierarchy Matrix</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[300px] pr-2">
              {vacancyData.map((post, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border transition-all ${post.isAvailable ? 'bg-white border-gray-200' : 'bg-red-50/50 border-red-100'}`}>
                  <p className="text-xs font-black text-gray-900 leading-tight mb-3 line-clamp-2 min-h-[30px]">{post.title}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-full bg-gray-100 h-1.5 rounded-full w-12 overflow-hidden">
                        <div className={`h-full rounded-full ${post.isAvailable ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${(post.filled / post.max) * 100}%` }}></div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-500">{post.filled}/{post.max}</span>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${post.isAvailable ? 'bg-emerald-50 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {post.isAvailable ? 'Vacant' : 'Full'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ROSTER TABLE */}
      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-black text-gray-900">Active Roster</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Currently Appointed Officers</p>
          </div>
          <div className="text-2xl font-black text-[#007AFF]">{leaders.length}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <th className="px-6 py-4 font-black">Officer Identity</th>
                <th className="px-6 py-4 font-black">Designated Post</th>
                <th className="px-6 py-4 font-black">Appointed On</th>
                <th className="px-6 py-4 font-black">Term Limit</th>
                {/* 🔥 PHASE 4: POINTS DISPLAY ADDED HERE 🔥 */}
                <th className="px-6 py-4 font-black text-center">Merit Points</th>
                <th className="px-6 py-4 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(!selectedState && activeTab !== "National") || (activeTab === "District" && !selectedDistrict) ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-400 text-sm font-bold">Awaiting Jurisdiction Selection...</td></tr>
              ) : leaders.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-400 text-sm font-bold">No officers appointed in this region.</td></tr>
              ) : (
                leaders.map(leader => {
                  const termInfo = calculateTerm(leader.appointmentDate, leader.termYears || 2);
                  return (
                    <tr key={leader.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-gray-900">{leader.name}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{leader.phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-black border border-blue-100">
                          <Briefcase className="w-3.5 h-3.5" /> {leader.roleTitle}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-600">
                        {leader.appointmentDate ? new Date(leader.appointmentDate.toDate()).toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <CalendarClock className={`w-4 h-4 ${termInfo.color}`} />
                          <span className={`text-xs font-bold ${termInfo.color}`}>{termInfo.text}</span>
                        </div>
                      </td>
                      
                      {/* 🔥 PHASE 4: POINTS RENDERED HERE 🔥 */}
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 text-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-500" /> {leader.points || 0}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setPromoteModal(leader)} className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-black transition-colors">
                            <ArrowUpRight className="w-3.5 h-3.5" /> Promote
                          </button>
                          <button onClick={() => setDismissModal(leader)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Dismiss">
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODALS ────────────────────────────────────────────────────────── */}

      {/* 1. DIRECT APPOINTMENT MODAL */}
      <AnimatePresence>
        {appointModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><UserPlus className="w-5 h-5 text-[#007AFF]" /> Direct Appointment</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Assign post to citizen</p>
                </div>
                <button onClick={() => setAppointModal(false)} className="p-2 bg-white rounded-full border shadow-sm hover:bg-gray-50"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-6 space-y-6">
                {/* Search Engine */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Search Citizen via Phone</label>
                  <div className="flex gap-3">
                    <input type="tel" maxLength={10} placeholder="10-digit number" value={searchPhone} onChange={e => setSearchPhone(e.target.value.replace(/\D/g,''))} className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-[#007AFF] transition-all" />
                    <button onClick={searchMemberByPhone} disabled={searchingMember || searchPhone.length !== 10} className="px-5 py-3 bg-gray-900 text-white rounded-xl font-bold shadow-md hover:bg-black transition-all disabled:opacity-50">
                      {searchingMember ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {foundMember && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl border border-[#007AFF]/30 bg-blue-50/50 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-gray-900">{foundMember.name}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{foundMember.phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {foundMember.roleTitle ? (
                        <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-[9px] font-black uppercase">Already Holding Post</span>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase">Cleared for Duty</span>
                      )}
                      {/* 🔥 PHASE 4: POINTS SHOWN IN SEARCH RESULT 🔥 */}
                      <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-500" /> {foundMember.points || 0} Pts
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Assignment Form */}
                {foundMember && !foundMember.roleTitle && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pt-4 border-t border-gray-100">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Select Vacant Post</label>
                      <select value={selectedPost} onChange={e => setSelectedPost(e.target.value)} className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-[#007AFF] transition-all text-gray-900">
                        <option value="" disabled>Choose Designation...</option>
                        {availablePosts.map(p => <option key={p.title} value={p.title}>{p.title}</option>)}
                      </select>
                      {availablePosts.length === 0 && <p className="text-xs text-red-500 mt-2 font-bold">No vacancies available in this jurisdiction.</p>}
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Term Duration</label>
                      <select value={termYears} onChange={e => setTermYears(e.target.value)} className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-[#007AFF] transition-all text-gray-900">
                        <option value="1">1 Year Term</option>
                        <option value="2">2 Year Term</option>
                        <option value="3">3 Year Term</option>
                        <option value="5">5 Year Term</option>
                      </select>
                    </div>

                    <button onClick={executeAppoint} disabled={isProcessing || !selectedPost} className="w-full py-4 mt-2 bg-[#007AFF] text-white font-black rounded-xl shadow-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />} Issue Appointment Order
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. PROMOTE MODAL */}
      <AnimatePresence>
        {promoteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden p-8 text-center">
              <div className="w-16 h-16 bg-blue-50 text-[#007AFF] rounded-full flex items-center justify-center mx-auto mb-4 border shadow-sm">
                <ArrowUpRight className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-1">Promote Officer</h2>
              <p className="text-sm text-gray-500 font-medium mb-6">Elevate <strong className="text-gray-900">{promoteModal.name}</strong> to a new post.</p>
              
              <div className="text-left space-y-4 mb-8">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">New Designation</label>
                  <select value={selectedPost} onChange={e => setSelectedPost(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-bold outline-none focus:border-[#007AFF]">
                    <option value="" disabled>Select Vacant Post...</option>
                    {availablePosts.filter(p => p.title !== promoteModal.roleTitle).map(p => <option key={p.title} value={p.title}>{p.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">New Term Limit</label>
                  <select value={termYears} onChange={e => setTermYears(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-bold outline-none focus:border-[#007AFF]">
                    <option value="1">1 Year Term</option><option value="2">2 Year Term</option><option value="5">5 Year Term</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setPromoteModal(null)} disabled={isProcessing} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">Cancel</button>
                <button onClick={executePromote} disabled={isProcessing || !selectedPost} className="flex-1 py-3 bg-[#007AFF] text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-blue-600 disabled:opacity-50">
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. DISMISS MODAL */}
      <AnimatePresence>
        {dismissModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-red-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-8 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border ring-4 ring-red-50">
                <UserX className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Dismiss Officer?</h2>
              <p className="text-sm text-gray-500 mb-8 font-medium">
                You are about to remove <strong className="text-gray-900">{dismissModal.name}</strong> from the post of <strong className="text-gray-900">{dismissModal.roleTitle}</strong>. This action is irreversible.
              </p>
              
              <div className="flex gap-3">
                <button onClick={() => setDismissModal(null)} disabled={isProcessing} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">Cancel</button>
                <button onClick={executeDismiss} disabled={isProcessing} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold flex justify-center gap-2 items-center shadow-md hover:bg-red-700">
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Revoke Post"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}