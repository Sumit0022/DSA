// app/admin/voting/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDocs, where, getDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Vote, Plus, Search, CalendarClock, Globe, Shield, Award, 
  ChevronRight, ArrowLeft, Loader2, FileText, XCircle, 
  Clock, CheckSquare, UploadCloud, Star, AlertTriangle, Users, CheckCircle2, Download, BarChart3, Edit3, Eye, Trash2, ArrowRight, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminVotingDashboard() {
  const [elections, setElections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [indiaData, setIndiaData] = useState<Record<string, string[]>>({});
  
  const [activeTab, setActiveTab] = useState("all");

  // Modern Toast & Confirm States
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | null }>({ message: "", type: null });
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; isDanger?: boolean; onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: null }), 4000);
  };

  // Wizard & Edit State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingElectionId, setEditingElectionId] = useState<string | null>(null);

  // Modals
  const [showReportModal, setShowReportModal] = useState<any>(null);
  const [showInspectModal, setShowInspectModal] = useState<any>(null); // New Inspect Modal

  // --- WIZARD FORM DATA ---
  const [pollType, setPollType] = useState<"appointment" | "resolution">("appointment");
  const [pollTitle, setPollTitle] = useState("");
  const [pollDesc, setPollDesc] = useState("");
  const [jurisdiction, setJurisdiction] = useState("State");
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [targetPost, setTargetPost] = useState("");
  const [allowedVoters, setAllowedVoters] = useState("all");

  // DYNAMIC HIERARCHY STATES & VACANCY
  const [hierarchyData, setHierarchyData] = useState<any>(null);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [vacancyData, setVacancyData] = useState<{title: string, maxLimit: number, filled: number, isAvailable: boolean}[]>([]);

  // Step 2: Candidates / Options
  const [candidates, setCandidates] = useState<any[]>([]);
  const [searchPhone, setSearchPhone] = useState("");
  const [searchingMember, setSearchingMember] = useState(false);
  const [resolutionOptions, setResolutionOptions] = useState([{ id: 1, text: "Yes, I agree" }, { id: 2, text: "No, I disagree" }]);
  
  // Step 3: Timings
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [resultTime, setResultTime] = useState("");

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/sab99r/Indian-States-And-Districts/master/states-and-districts.json')
      .then(res => res.json())
      .then(data => {
        const formatted: Record<string, string[]> = {};
        data.states.forEach((s: any) => formatted[s.state] = s.districts);
        setIndiaData(formatted);
      })
      .catch(err => console.error("Location load error:", err));

    const q = query(collection(db, "elections"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const docs: any[] = [];
      snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
      setElections(docs);
      setLoading(false);
    });

    const fetchHierarchy = async () => {
      try {
        const docSnap = await getDoc(doc(db, "settings", "roles_hierarchy"));
        if (docSnap.exists()) setHierarchyData(docSnap.data());
      } catch (error) { console.error("Error fetching hierarchy:", error); }
    };
    fetchHierarchy();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const membersRef = collection(db, "members");
    const q = query(membersRef, where("role", "!=", "member"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
      setLeaders(docs.filter(d => d.role !== "active_member" && d.roleLevel));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (hierarchyData && hierarchyData[jurisdiction]) {
      const tiers = hierarchyData[jurisdiction];
      const computedVacancies: any[] = [];

      tiers.forEach((tier: any) => {
        if (tier.titles) {
          tier.titles.forEach((t: any) => {
            const filledCount = leaders.filter((l: any) => {
              const levelMatch = l.roleLevel === jurisdiction;
              const titleMatch = l.roleTitle === t.title;
              const regionMatch = jurisdiction === "National" ? true : jurisdiction === "State" ? l.state === selectedState : l.state === selectedState && l.district === selectedDistrict;
              return levelMatch && titleMatch && regionMatch;
            }).length;
            
            const max = t.maxLimit || 1;
            computedVacancies.push({ title: t.title, maxLimit: max, filled: filledCount, isAvailable: filledCount < max });
          });
        }
      });
      setVacancyData(computedVacancies);
      
      if (!editingElectionId) {
        const available = computedVacancies.filter(v => v.isAvailable);
        if (available.length > 0 && !available.find(v => v.title === targetPost)) {
          setTargetPost(available[0].title);
        } else if (available.length === 0) {
          setTargetPost("");
        }
      }
    }
  }, [hierarchyData, jurisdiction, selectedState, selectedDistrict, leaders, editingElectionId]);

  // --- FORM RESETTER ---
  const resetWizard = () => {
    setEditingElectionId(null);
    setPollType("appointment");
    setPollTitle(""); setPollDesc(""); setJurisdiction("State"); setSelectedState(""); setSelectedDistrict("");
    setTargetPost(""); setAllowedVoters("all"); setCandidates([]);
    setResolutionOptions([{ id: 1, text: "Yes, I agree" }, { id: 2, text: "No, I disagree" }]);
    setStartTime(""); setEndTime(""); setResultTime("");
    setWizardStep(1);
  };

  const handleLaunchNew = () => {
    resetWizard();
    setIsWizardOpen(true);
  };

  // --- FORMAT TIME FOR INPUT ---
  const formatTimeForInput = (isoStr: string) => {
    if (!isoStr) return "";
    const date = new Date(isoStr);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  // --- EDIT ELECTION (PRE-FILL WIZARD) ---
  const handleEditDraft = (election: any) => {
    setEditingElectionId(election.id);
    setPollType(election.type);
    setPollTitle(election.title);
    setPollDesc(election.description);
    setJurisdiction(election.jurisdictionLevel);
    setSelectedState(election.targetState);
    setSelectedDistrict(election.targetDistrict);
    setTargetPost(election.targetPost || "");
    setAllowedVoters(election.allowedVoters || "all");
    
    if (election.type === "appointment") {
      setCandidates(election.candidates || []);
    } else {
      setResolutionOptions(election.options?.map((opt: string, idx: number) => ({ id: idx, text: opt })) || []);
    }

    setStartTime(formatTimeForInput(election.startTime));
    setEndTime(formatTimeForInput(election.endTime));
    setResultTime(formatTimeForInput(election.resultTime));

    setWizardStep(1);
    setIsWizardOpen(true);
  };

  // --- DELETE ELECTION ---
  const executeDelete = async (id: string) => {
    setIsProcessing(true);
    setConfirmModal(null);
    try {
      await deleteDoc(doc(db, "elections", id));
      showToast("Protocol permanently deleted.", "success");
    } catch (err: any) {
      console.error("Delete Error:", err);
      showToast("Failed to delete: " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- CANDIDATE SEARCH & ADD ---
  const searchAndAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchPhone.length !== 10) return showToast("Enter valid 10-digit phone number.", "error");
    setSearchingMember(true);
    
    try {
      const q = query(collection(db, "members"), where("phone", "==", searchPhone));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        showToast("Citizen not found in database.", "error");
      } else {
        const member: any = { id: snap.docs[0].id, ...snap.docs[0].data() };
        if (candidates.some(c => c.memberId === member.id)) {
          showToast("Candidate already added to this poll.", "error");
          return;
        }
        setCandidates(prev => [...prev, {
          memberId: member.id, 
          name: member.name || "Unknown", 
          phone: member.phone || "",
          photo: member.profilePic || member.profileImage || member.photoURL || "", 
          vision: "", 
          isNewPhoto: false 
        }]);
        setSearchPhone("");
      }
    } catch (err) { console.error(err); } finally { setSearchingMember(false); }
  };

  // --- COMPRESSION UPLOAD ---
  const handleImageUpload = (candidateId: string, file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 500; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setCandidates(prev => prev.map(c => c.memberId === candidateId ? { ...c, photo: compressedBase64, isNewPhoto: true } : c));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeCandidate = (id: string) => setCandidates(prev => prev.filter(c => c.memberId !== id));

  const addResolutionOption = () => setResolutionOptions(prev => [...prev, { id: Date.now(), text: "" }]);
  const updateResolutionOption = (id: number, text: string) => setResolutionOptions(prev => prev.map(opt => opt.id === id ? { ...opt, text } : opt));
  const removeResolutionOption = (id: number) => {
    if (resolutionOptions.length <= 2) return showToast("Minimum 2 options required.", "error");
    setResolutionOptions(prev => prev.filter(opt => opt.id !== id));
  };

  // --- SUBMIT / UPDATE ELECTION ---
  const submitElection = async (status: "draft" | "scheduled") => {
    if (!pollTitle) return showToast("Title is mandatory.", "error");
    if (pollType === "appointment" && candidates.length < 2) return showToast("Minimum 2 candidates required.", "error");
    if (pollType === "resolution" && resolutionOptions.some(o => !o.text.trim())) return showToast("All resolution options must have text.", "error");
    if (status === "scheduled" && (!startTime || !endTime || !resultTime)) return showToast("Timings are mandatory to schedule.", "error");

    setIsProcessing(true);
    try {
      if (status === "scheduled" && pollType === "appointment") {
        for (const candidate of candidates) {
          if (candidate.isNewPhoto && candidate.photo) {
            await updateDoc(doc(db, "members", candidate.memberId), { profilePic: candidate.photo });
          }
        }
      }

      const location = jurisdiction === "National" ? "All India" : jurisdiction === "State" ? selectedState : `${selectedDistrict}, ${selectedState}`;
      
      const payload: any = {
        title: pollTitle || "",
        description: pollDesc || "",
        type: pollType,
        jurisdictionLevel: jurisdiction,
        targetState: selectedState || "",
        targetDistrict: selectedDistrict || "",
        locationDisplay: location || "",
        allowedVoters: allowedVoters || "all",
        startTime: startTime ? new Date(startTime).toISOString() : null,
        endTime: endTime ? new Date(endTime).toISOString() : null,
        resultTime: resultTime ? new Date(resultTime).toISOString() : null,
        status: status, 
      };

      if (pollType === "appointment") {
        payload.targetPost = targetPost || "";
        payload.candidates = candidates.map(c => ({ 
          memberId: c.memberId || "", 
          name: c.name || "Unknown", 
          photo: c.photo || "", 
          vision: c.vision || "" 
        }));
      } else {
        payload.options = resolutionOptions.map(o => o.text || "");
      }

      let electionId = editingElectionId;
      if (editingElectionId) {
        await updateDoc(doc(db, "elections", editingElectionId), payload);
      } else {
        payload.createdAt = serverTimestamp();
        payload.totalVotes = 0;
        const freshDoc = await addDoc(collection(db, "elections"), payload);
        electionId = freshDoc.id;
      }

      // 🔔 🔥 AUTOMATED INSTANT NOTIFICATION CADRE LOOP 🔥 🔔
      if (status === "scheduled") {
        const membersRef = collection(db, "members");
        let memberConstraints: any[] = [];

        // Build localized filters dynamically
        if (jurisdiction === "State") {
          memberConstraints.push(where("state", "==", selectedState));
        } else if (jurisdiction === "District") {
          memberConstraints.push(where("state", "==", selectedState));
          memberConstraints.push(where("district", "==", selectedDistrict));
        }

        const querySnapshot = await getDocs(query(membersRef, ...memberConstraints));
        const batch = writeBatch(db);

        querySnapshot.forEach((userDoc) => {
          const uData = userDoc.data();
          const isLeader = uData.role && uData.role !== "member" && uData.role !== "active_member";
          
          // Cross-check voter eligibility role gatekeeper
          let isEligible = false;
          if (allowedVoters === "all") isEligible = true;
          else if (allowedVoters === "active" && (uData.status === "active_member" || isLeader)) isEligible = true;
          else if (allowedVoters === "leaders" && isLeader) isEligible = true;

          if (isEligible) {
  const notifRef = doc(collection(db, "notifications"));
  batch.set(notifRef, {
    userId: userDoc.id,
    title: "Electoral Protocol Live Soon",
    message: `A mandate has been published: "${pollTitle}" for ${location}. Voting window activates on ${new Date(startTime).toLocaleString()}.`,
    link: `/dashboard/voting/${electionId}`, // 🚀 Dynamic Link Added
    type: "info",
    isRead: false,
    timestamp: serverTimestamp()
  });
}
        });

        // Commit all notifications simultaneously
        await batch.commit();
      }

      setIsWizardOpen(false); 
      resetWizard();
      showToast(`Election successfully ${editingElectionId ? 'updated' : 'saved'} and cadre notified.`, "success");

    } catch (err: any) { 
      console.error(err); 
      showToast("Failed to save election protocol: " + err.message, "error"); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  // 🚀 DECLARE RESULTS ENGINE 🚀
  const executeDeclareResults = async (election: any) => {
    setIsProcessing(true);
    setConfirmModal(null);
    try {
      const ballotsSnap = await getDocs(query(collection(db, "election_ballots"), where("electionId", "==", election.id)));
      
      if (ballotsSnap.empty && election.type === "appointment") {
        showToast("No votes were cast. Cannot execute appointment.", "error");
        setIsProcessing(false); return;
      }

      const voteCounts: Record<string, number> = {};
      const hourCounts: Record<string, number> = {};
      
      ballotsSnap.forEach(doc => {
        const data = doc.data();
        voteCounts[data.candidateId] = (voteCounts[data.candidateId] || 0) + 1;
        
        if (data.timestamp) {
          const dateObj = new Date(data.timestamp.seconds * 1000);
          const hour = dateObj.getHours();
          const hourKey = `${hour}:00 - ${hour+1}:00`;
          hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1;
        }
      });

      let peakHour = "N/A";
      let maxHourVotes = -1;
      for (const [hr, count] of Object.entries(hourCounts)) {
        if (count > maxHourVotes) { maxHourVotes = count; peakHour = hr; }
      }

      const totalVotes = ballotsSnap.size;

      if (election.type === "appointment") {
        let winnerId = "";
        let maxVotes = -1;
        for (const [id, count] of Object.entries(voteCounts)) {
          if (count > maxVotes) { maxVotes = count; winnerId = id; }
        }

        let winnerDetails: any = null;

        if (winnerId) {
          const winnerRef = doc(db, "members", winnerId);
          const winnerSnap = await getDoc(winnerRef);
          const winnerData = winnerSnap.data();
          const oldRoleDisplay = winnerData?.role || null;
          const oldRoleLoc = winnerData?.roleLocation || null;

          let newRoleDisplay = `${election.jurisdictionLevel} ${election.targetPost}`;
          newRoleDisplay = newRoleDisplay.replace(/National National/ig, "National").replace(/State State/ig, "State").replace(/District District/ig, "District");

          await updateDoc(winnerRef, {
            role: newRoleDisplay,
            roleLevel: election.jurisdictionLevel,
            roleTitle: election.targetPost,
            roleLocation: election.locationDisplay,
            appointmentDate: serverTimestamp(),
            termYears: 2
          });

          await addDoc(collection(db, "notifications"), {
            userId: winnerId,
            title: "Election Victory & Promotion",
            message: oldRoleDisplay 
              ? `Congratulations! You have won the democratic election. Your previous post of ${oldRoleDisplay} has been vacated. You are now officially appointed as the ${newRoleDisplay}.` 
              : `Congratulations! You have won the election. You are now officially appointed as the ${newRoleDisplay}.`,
            type: "success",
            isRead: false,
            timestamp: serverTimestamp()
          });

          winnerDetails = {
            id: winnerId,
            name: winnerData?.name || "Unknown",
            preElectionPost: oldRoleDisplay || "Active Citizen (No Post)",
            preElectionLoc: oldRoleLoc || "N/A",
            postElectionPost: newRoleDisplay,
            postElectionLoc: election.locationDisplay,
            isPostVacated: !!oldRoleDisplay
          };
        }
        
        await updateDoc(doc(db, "elections", election.id), { 
          status: "completed", 
          winnerId: winnerId,
          totalVotes: totalVotes,
          voteDistribution: voteCounts,
          peakHour: peakHour,
          reportMetrics: winnerDetails
        });
      } 
      else {
        await updateDoc(doc(db, "elections", election.id), { 
          status: "completed",
          totalVotes: totalVotes,
          voteDistribution: voteCounts,
          peakHour: peakHour
        });
      }

      showToast("Results declared and mandate executed successfully.", "success");
    } catch (error: any) {
      console.error("Error executing mandate:", error);
      showToast("Failed to declare results: " + error.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredElections = elections.filter(e => activeTab === "all" || e.status === activeTab);

  const getStatusBadge = (status: string) => {
    if (status === "draft") return <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded border border-gray-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><FileText className="w-3 h-3"/> Draft</span>;
    if (status === "scheduled") return <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Clock className="w-3 h-3"/> Scheduled</span>;
    if (status === "active") return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded border border-emerald-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Live Now</span>;
    return <span className="px-2.5 py-1 bg-purple-50 text-purple-600 rounded border border-purple-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><CheckSquare className="w-3 h-3"/> Completed</span>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 px-4 sm:px-6 relative">
      
      {/* ─── TOAST NOTIFICATION ─── */}
      <AnimatePresence>
        {toast.type && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-8 right-8 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm border backdrop-blur-xl ${toast.type === "success" ? "bg-gray-900 text-white border-gray-800" : "bg-red-50 text-red-600 border-red-200"}`}>
            {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CONFIRMATION MODAL ─── */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border shadow-sm ${confirmModal.isDanger ? 'bg-red-50 text-red-500 border-red-100' : 'bg-blue-50 text-[#007AFF] border-blue-100'}`}>
                {confirmModal.isDanger ? <AlertTriangle className="w-8 h-8" /> : <Shield className="w-8 h-8" />}
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">{confirmModal.title}</h2>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">{confirmModal.message}</p>
              
              <div className="flex gap-3">
                <button onClick={() => setConfirmModal(null)} disabled={isProcessing} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button onClick={confirmModal.onConfirm} disabled={isProcessing} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${confirmModal.isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#007AFF] hover:bg-blue-600'}`}>
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Action"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HEADER ─── */}
      <div className="bg-gray-900 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-white print:hidden">
        <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 text-xs font-bold uppercase tracking-widest mb-4">
              <Vote className="w-4 h-4 text-blue-400" /> Election Commission HQ
            </span>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">Democratic Poll Engine</h1>
            <p className="text-gray-400 font-medium text-sm leading-relaxed">
              Create, schedule, and monitor transparent elections for specific jurisdictions. Assign candidates, verify visions, and publish absolute results safely.
            </p>
          </div>
          <button 
            onClick={handleLaunchNew}
            className="px-6 py-4 bg-[#007AFF] hover:bg-blue-600 text-white rounded-xl font-black shadow-lg transition-transform hover:-translate-y-1 flex items-center gap-2 shrink-0"
          >
            <Plus className="w-5 h-5" /> Launch New Election
          </button>
        </div>
      </div>

      {/* ─── MAIN DASHBOARD ─── */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm min-h-[500px] flex flex-col print:hidden">
        
        {/* TABS */}
        <div className="flex gap-2 overflow-x-auto pb-4 border-b border-gray-100 shrink-0">
          {[
            { id: "all", label: "All Records" },
            { id: "draft", label: "Drafts" },
            { id: "scheduled", label: "Upcoming" },
            { id: "active", label: "Live Polls" },
            { id: "completed", label: "Past Results" }
          ].map(tab => (
            <button 
              key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ELECTION LIST */}
        <div className="mt-6 flex-1">
          {loading ? (
             <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" /></div>
          ) : filteredElections.length === 0 ? (
            <div className="text-center py-24 text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
              <Vote className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-bold text-sm">No electoral protocols found in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredElections.map(election => {
                const canDeclareResult = election.status !== "completed" && election.status !== "draft" && new Date() >= new Date(election.resultTime);

                return (
                  <div key={election.id} className="border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow group flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        {getStatusBadge(election.status)}
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${election.type === 'appointment' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          {election.type}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-gray-900 leading-tight mb-1">{election.title}</h3>
                      <p className="text-xs text-gray-500 font-medium line-clamp-1 mb-4">{election.description || "No description provided."}</p>
                      
                      <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-4">
                        <span className="bg-gray-50 px-2 py-1 rounded border border-gray-200 flex items-center gap-1">
                          <Globe className="w-3 h-3 text-gray-400"/> {election.locationDisplay}
                        </span>
                        <span className="bg-gray-50 px-2 py-1 rounded border border-gray-200 flex items-center gap-1">
                          <Users className="w-3 h-3 text-gray-400"/> {election.allowedVoters === "all" ? "All Citizens" : election.allowedVoters === "leaders" ? "Leaders Only" : "Active Members"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                      <div className="text-[10px] text-gray-500 font-bold flex justify-between items-center w-full">
                        <span>Ends: {election.endTime ? new Date(election.endTime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'TBD'}</span>
                        <span className={canDeclareResult ? "text-red-500 animate-pulse" : "text-[#007AFF]"}>Results: {election.resultTime ? new Date(election.resultTime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'TBD'}</span>
                      </div>
                      
                      {/* ACTION BUTTONS */}
                      <div className="flex justify-between items-center w-full gap-2 mt-2">
                        {/* LEFT ACTIONS (Edit/View/Declare) */}
                        <div className="flex-1">
                          {election.status === "draft" ? (
                            <button 
                              onClick={() => handleEditDraft(election)}
                              className="w-full px-3 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors flex justify-center items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit & Publish
                            </button>
                          ) : election.status === "completed" ? (
                            <button 
                              onClick={() => setShowReportModal(election)}
                              className="w-full px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-black transition-colors flex justify-center items-center gap-1"
                            >
                              <BarChart3 className="w-3.5 h-3.5" /> View Report
                            </button>
                          ) : canDeclareResult ? (
                            <button 
                              onClick={() => setConfirmModal({
                                title: "Execute Mandate?",
                                message: "Are you sure you want to declare results and execute the mandate? This will notify users and process appointments automatically.",
                                onConfirm: () => executeDeclareResults(election)
                              })}
                              disabled={isProcessing}
                              className="w-full px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-red-700 transition-colors flex justify-center items-center gap-1"
                            >
                              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Declare Results
                            </button>
                          ) : (
                            <button 
                              onClick={() => setShowInspectModal(election)}
                              className="w-full px-3 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors flex justify-center items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Inspect Protocol
                            </button>
                          )}
                        </div>

                        {/* RIGHT ACTION (Delete - Always Available) */}
                        <button 
                          onClick={() => setConfirmModal({
                            title: "Delete Protocol?",
                            message: "Are you sure you want to permanently delete this election? This cannot be undone.",
                            isDanger: true,
                            onConfirm: () => executeDelete(election.id)
                          })}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── INSPECT MODAL (READ-ONLY FOR SCHEDULED/ACTIVE) ─── */}
      <AnimatePresence>
        {showInspectModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
              
              <div className="bg-gray-50 border-b border-gray-200 p-6 flex justify-between items-center shrink-0">
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2"><Eye className="w-6 h-6 text-[#007AFF]" /> Inspect Protocol</h2>
                <button onClick={() => setShowInspectModal(null)} className="p-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-full transition-colors">
                  <XCircle className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-black text-gray-900">{showInspectModal.title}</h3>
                  <p className="text-sm text-gray-500 mt-2">{showInspectModal.description || "No description."}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Type</p>
                    <p className="text-sm font-black text-gray-900 uppercase">{showInspectModal.type}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Jurisdiction</p>
                    <p className="text-sm font-black text-gray-900">{showInspectModal.locationDisplay}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Starts</p>
                    <p className="text-xs font-bold text-gray-900">{new Date(showInspectModal.startTime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Results</p>
                    <p className="text-xs font-bold text-blue-600">{new Date(showInspectModal.resultTime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest border-b border-gray-200 pb-2 mb-4">
                    {showInspectModal.type === 'appointment' ? 'Nominated Candidates' : 'Resolution Options'}
                  </h4>
                  {showInspectModal.type === 'appointment' ? (
                    <div className="space-y-3">
                      {showInspectModal.candidates?.map((cand: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-4 bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                          <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                            {cand.photo ? <img src={cand.photo} alt={cand.name} className="w-full h-full object-cover"/> : <Users className="w-full h-full p-2 text-gray-400"/>}
                          </div>
                          <div>
                            <h5 className="font-bold text-gray-900">{cand.name}</h5>
                            <p className="text-[10px] text-gray-500 font-mono mb-1">{cand.memberId}</p>
                            <p className="text-xs text-gray-600">{cand.vision || "No manifesto provided."}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {showInspectModal.options?.map((opt: string, idx: number) => (
                        <li key={idx} className="bg-gray-50 border border-gray-100 p-3 rounded-lg text-sm font-bold text-gray-800 flex gap-3 items-center">
                          <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px]">{String.fromCharCode(65 + idx)}</span> {opt}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ELECTION REPORT MODAL (PDF TARGET) ─── */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:block print:inset-auto print:relative print:z-0">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden print:shadow-none print:max-h-none print:rounded-none">
              
              <div className="bg-gray-50 border-b border-gray-200 p-6 flex justify-between items-center shrink-0 print:hidden">
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2"><FileText className="w-6 h-6 text-[#007AFF]" /> Official Mandate Report</h2>
                <div className="flex items-center gap-3">
                  <button onClick={() => window.print()} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors flex items-center gap-1 shadow-sm">
                    <Download className="w-4 h-4" /> Save PDF
                  </button>
                  <button onClick={() => setShowReportModal(null)} className="p-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-full transition-colors">
                    <XCircle className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* PDF PRINTABLE CONTENT */}
              <div className="flex-1 overflow-y-auto p-8 md:p-12 print:p-0 bg-white">
                <div className="border-[10px] border-double border-gray-100 p-8 rounded-xl print:border-none print:p-0">
                  
                  {/* HEADER */}
                  <div className="text-center mb-8 border-b-2 border-gray-900 pb-6">
                    <img src="/dsa-logo.png" alt="DSA Logo" className="w-20 h-20 mx-auto mb-4 object-contain" onError={(e) => e.currentTarget.style.display='none'} />
                    <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase font-serif">Official Election Report</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-2">Democratic Social Alliance Command Center</p>
                  </div>

                  {/* SECTION 1: METADATA */}
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Protocol Title</p>
                      <p className="text-base font-black text-gray-900">{showReportModal.title}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Jurisdiction</p>
                      <p className="text-base font-black text-gray-900">{showReportModal.locationDisplay} ({showReportModal.jurisdictionLevel})</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Election Type</p>
                      <p className="text-base font-black text-blue-600 uppercase">{showReportModal.type}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mandate Target</p>
                      <p className="text-base font-black text-gray-900">{showReportModal.targetPost || "Public Resolution"}</p>
                    </div>
                  </div>

                  {/* SECTION 2: STATISTICS */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8 flex justify-between items-center print:bg-white print:border-y-2 print:border-x-0 print:rounded-none">
                    <div className="text-center flex-1">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Votes Cast</p>
                      <p className="text-3xl font-black text-gray-900 font-mono">{showReportModal.totalVotes || 0}</p>
                    </div>
                    <div className="w-px h-12 bg-gray-200"></div>
                    <div className="text-center flex-1">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Peak Voting Hour</p>
                      <p className="text-xl font-black text-[#007AFF] font-mono">{showReportModal.peakHour || "N/A"}</p>
                    </div>
                  </div>

                  {/* SECTION 3: VOTE DISTRIBUTION */}
                  <div className="mb-10">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest border-b border-gray-200 pb-2 mb-4">Mandate Distribution</h3>
                    <div className="space-y-4">
                      {(showReportModal.type === 'appointment' ? showReportModal.candidates : showReportModal.options?.map((o:any, i:any)=>({memberId: o, name: o})) || []).map((cand: any, idx: number) => {
                        const votes = showReportModal.voteDistribution?.[cand.memberId] || showReportModal.voteDistribution?.[cand.name] || 0;
                        const percentage = showReportModal.totalVotes > 0 ? ((votes / showReportModal.totalVotes) * 100).toFixed(1) : 0;
                        const isWinner = showReportModal.winnerId === cand.memberId;
                        
                        return (
                          <div key={idx} className="relative">
                            <div className="flex justify-between items-end mb-1 relative z-10">
                              <span className={`text-sm font-bold ${isWinner ? 'text-emerald-700' : 'text-gray-700'}`}>{cand.name} {isWinner && '👑 (Winner)'}</span>
                              <span className="text-sm font-black font-mono">{percentage}% ({votes} Votes)</span>
                            </div>
                            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full ${isWinner ? 'bg-emerald-500' : 'bg-gray-400'}`} style={{ width: `${percentage}%` }}></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* SECTION 4: DETAILED PRE/POST METRICS (IF APPOINTMENT) */}
                  {showReportModal.type === 'appointment' && showReportModal.reportMetrics && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 print:bg-white print:border-gray-300">
                      <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-4 flex items-center gap-2"><Award className="w-4 h-4"/> Official Reassignment Log</h3>
                      
                      <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="flex-1 bg-white border border-gray-200 p-4 rounded-xl shadow-sm w-full text-center">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pre-Election Status</p>
                          <p className="font-bold text-gray-900 text-sm line-clamp-1">{showReportModal.reportMetrics.preElectionPost}</p>
                          <p className="text-xs text-gray-500 mt-1">{showReportModal.reportMetrics.preElectionLoc}</p>
                          {showReportModal.reportMetrics.isPostVacated && (
                            <span className="inline-block mt-2 px-2 py-0.5 bg-red-50 text-red-600 text-[9px] font-black uppercase rounded border border-red-100">Now Vacant</span>
                          )}
                        </div>
                        
                        <ArrowRight className="w-6 h-6 text-gray-300 hidden md:block print:hidden" />
                        
                        <div className="flex-1 bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-sm w-full text-center">
                          <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1">Post-Election Command</p>
                          <p className="font-black text-emerald-900 text-sm line-clamp-1">{showReportModal.reportMetrics.postElectionPost}</p>
                          <p className="text-xs text-emerald-700 mt-1">{showReportModal.reportMetrics.postElectionLoc}</p>
                          <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded border border-emerald-200">Newly Appointed</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-12 text-center text-[10px] text-gray-400 font-medium uppercase tracking-widest pt-4 border-t border-gray-200">
                    Document Auto-Generated by DSA Command Engine • {new Date().toLocaleString()}
                  </div>

                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ELECTION CREATION/EDIT WIZARD MODAL ─── */}
      <AnimatePresence>
        {isWizardOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-4 print:hidden">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
              
              {/* WIZARD HEADER */}
              <div className="bg-gray-50 border-b border-gray-200 p-6 flex justify-between items-center shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Vote className="w-24 h-24" /></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-[#007AFF]">
                    <Vote className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">{editingElectionId ? 'Edit Protocol' : 'Election Creation Protocol'}</h2>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">Step {wizardStep} of 3 • {wizardStep === 1 ? 'Configuration' : wizardStep === 2 ? (pollType === 'appointment' ? 'Candidates' : 'Options Builder') : 'Scheduling'}</p>
                  </div>
                </div>
                <button onClick={() => setIsWizardOpen(false)} className="p-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-full transition-colors relative z-10">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* WIZARD PROGRESS BAR */}
              <div className="w-full bg-gray-100 h-1.5 shrink-0">
                <div className="bg-[#007AFF] h-full transition-all duration-300" style={{ width: `${(wizardStep / 3) * 100}%` }}></div>
              </div>

              {/* WIZARD CONTENT AREA */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                
                {/* STEP 1: CONFIGURATION */}
                {wizardStep === 1 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 max-w-2xl mx-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div 
                        onClick={() => setPollType("appointment")}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${pollType === "appointment" ? 'border-[#007AFF] bg-blue-50/50' : 'border-gray-200 bg-white hover:border-blue-300'}`}
                      >
                        <Award className={`w-8 h-8 mb-3 ${pollType === "appointment" ? 'text-[#007AFF]' : 'text-gray-400'}`} />
                        <h4 className="font-black text-gray-900 text-sm">Post Appointment</h4>
                        <p className="text-[10px] text-gray-500 mt-1 font-medium">Select candidates for an official hierarchy post.</p>
                      </div>
                      <div 
                        onClick={() => setPollType("resolution")}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${pollType === "resolution" ? 'border-amber-500 bg-amber-50/50' : 'border-gray-200 bg-white hover:border-amber-300'}`}
                      >
                        <FileText className={`w-8 h-8 mb-3 ${pollType === "resolution" ? 'text-amber-500' : 'text-gray-400'}`} />
                        <h4 className="font-black text-gray-900 text-sm">Public Resolution</h4>
                        <p className="text-[10px] text-gray-500 mt-1 font-medium">Take votes on a specific decision or policy.</p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Election / Poll Title</label>
                        <input type="text" placeholder={pollType === "appointment" ? "e.g., General Secretary Election 2026" : "e.g., Should we organize a state-wide protest?"} value={pollTitle} onChange={e => setPollTitle(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-[#007AFF]" />
                      </div>
                      <div>
                        <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ml-1 ${pollType === 'resolution' ? 'text-amber-600' : 'text-gray-400'}`}>Mandate / Description {pollType === 'resolution' && '(Crucial for clarity)'}</label>
                        <textarea placeholder="Describe the purpose, rules, and vision of this voting protocol..." value={pollDesc} onChange={e => setPollDesc(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-[#007AFF] min-h-[100px] resize-none" />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <h3 className="text-sm font-black text-gray-900 flex items-center gap-2"><Globe className="w-4 h-4 text-[#007AFF]"/> Target Jurisdiction & Voters</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 block mb-1 ml-1">Jurisdiction Level</label>
                          <select value={jurisdiction} onChange={e => setJurisdiction(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold shadow-sm outline-none">
                            <option value="National">National (All India)</option>
                            <option value="State">State Level</option>
                            <option value="District">District Level</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 block mb-1 ml-1">Voter Eligibility Gatekeeper</label>
                          <select value={allowedVoters} onChange={e => setAllowedVoters(e.target.value)} className="w-full px-4 py-3 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-sm font-bold shadow-sm outline-none focus:border-blue-400">
                            <option value="all">All Registered Citizens</option>
                            <option value="active">Active Members Only</option>
                            <option value="leaders">Leaders/Commanders Only</option>
                          </select>
                        </div>
                        
                        {jurisdiction !== "National" && (
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-1 ml-1">State</label>
                            <select value={selectedState} onChange={e => {setSelectedState(e.target.value); setSelectedDistrict("");}} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold shadow-sm outline-none">
                              <option value="">Select State</option>
                              {Object.keys(indiaData).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        )}
                        {jurisdiction === "District" && (
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-1 ml-1">District</label>
                            <select value={selectedDistrict} disabled={!selectedState} onChange={e => setSelectedDistrict(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold shadow-sm outline-none disabled:opacity-50">
                              <option value="">Select District</option>
                              {selectedState && indiaData[selectedState]?.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    {pollType === "appointment" && (
                      <div className="pt-4 border-t border-gray-100">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Target Vacant Post</label>
                        <select 
                          value={targetPost} 
                          onChange={(e) => setTargetPost(e.target.value)} 
                          className={`w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none shadow-sm ${vacancyData.length > 0 && vacancyData.every(v => !v.isAvailable) && !editingElectionId ? 'opacity-60 cursor-not-allowed' : 'focus:border-[#007AFF]'}`}
                        >
                          {editingElectionId ? (
                            <option value={targetPost}>{targetPost}</option>
                          ) : vacancyData.length > 0 ? (
                            vacancyData.map((v) => (
                              <option key={v.title} value={v.title} disabled={!v.isAvailable}>
                                {v.title} {v.isAvailable ? `(${v.filled}/${v.maxLimit} Filled)` : `(No Vacancy - Full)`}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>No posts defined for this tier.</option>
                          )}
                        </select>

                        {vacancyData.length > 0 && vacancyData.every(v => !v.isAvailable) && !editingElectionId && (
                          <div className="mt-3 flex items-start gap-1.5 p-3 bg-red-50 border border-red-100 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                            <p className="text-[11px] text-red-700 font-bold leading-tight uppercase tracking-wider">
                              All posts in this jurisdiction are currently occupied. Cannot hold an appointment election.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* STEP 2: CANDIDATES / OPTIONS BUILDER */}
                {wizardStep === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                    
                    {pollType === "appointment" ? (
                      <>
                        <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl">
                          <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-2 ml-1">Nominate Citizen (Phone No.)</label>
                          <form onSubmit={searchAndAddCandidate} className="flex gap-3">
                            <div className="relative flex-1">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input type="tel" maxLength={10} placeholder="Search by 10-digit number..." value={searchPhone} onChange={e => setSearchPhone(e.target.value.replace(/\D/g,''))} className="w-full pl-11 pr-4 py-3 bg-white border border-blue-200 rounded-xl text-sm font-bold outline-none shadow-sm focus:ring-2 focus:ring-blue-100" />
                            </div>
                            <button type="submit" disabled={searchingMember || searchPhone.length !== 10} className="px-6 bg-[#007AFF] text-white rounded-xl font-bold hover:bg-blue-600 shadow-md disabled:opacity-50 disabled:shadow-none flex items-center gap-2">
                              {searchingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Add"}
                            </button>
                          </form>
                        </div>

                        <div className="space-y-4">
                          {candidates.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                              <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                              <p className="font-bold text-sm">No candidates nominated yet.</p>
                              <p className="text-xs">Add at least 2 candidates to proceed.</p>
                            </div>
                          ) : (
                            candidates.map((cand, idx) => (
                              <div key={cand.memberId} className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden flex flex-col md:flex-row">
                                <div className="p-6 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col items-center justify-center shrink-0 w-full md:w-48 relative group">
                                  <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center overflow-hidden relative mb-3">
                                    {cand.photo ? (
                                      <img src={cand.photo} alt={cand.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <Users className="w-10 h-10 text-gray-400" />
                                    )}
                                    <div 
                                      onClick={() => fileInputRefs.current[cand.memberId]?.click()}
                                      className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    >
                                      <UploadCloud className="w-5 h-5 text-white mb-1" />
                                      <span className="text-[8px] text-white font-black uppercase tracking-widest">Update Sync</span>
                                    </div>
                                    <input 
                                      type="file" accept="image/*" className="hidden"
                                      ref={(el) => { fileInputRefs.current[cand.memberId] = el; }}
                                      onChange={(e) => { if (e.target.files && e.target.files[0]) handleImageUpload(cand.memberId, e.target.files[0]); }}
                                    />
                                  </div>
                                  <h4 className="font-black text-gray-900 text-center leading-tight">{cand.name}</h4>
                                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">{cand.phone}</p>
                                  {cand.isNewPhoto && <span className="absolute top-2 left-2 bg-blue-100 text-blue-700 text-[8px] px-1.5 py-0.5 rounded font-bold border border-blue-200">Pic Synced ✅</span>}
                                </div>

                                <div className="p-6 flex-1 relative">
                                  <button onClick={() => removeCandidate(cand.memberId)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 transition-colors bg-red-50 p-1.5 rounded-lg border border-red-100">
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                  
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1.5">
                                    <Star className="w-3 h-3 text-amber-500" /> Candidate Vision / Manifesto
                                  </label>
                                  <textarea 
                                    placeholder="Enter the candidate's agenda, past work, and promises..." 
                                    value={cand.vision}
                                    onChange={e => setCandidates(prev => prev.map(c => c.memberId === cand.memberId ? {...c, vision: e.target.value} : c))}
                                    className="w-full h-28 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-[#007AFF] resize-none shadow-inner" 
                                  />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="max-w-2xl mx-auto space-y-4">
                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                          <h4 className="font-black text-gray-900">Define Options/Choices</h4>
                          <button onClick={addResolutionOption} className="text-xs font-bold text-[#007AFF] bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5"/> Add Option
                          </button>
                        </div>
                        
                        {resolutionOptions.map((opt, index) => (
                          <div key={opt.id} className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-black text-xs shrink-0">
                              {String.fromCharCode(65 + index)}
                            </span>
                            <input 
                              type="text" 
                              placeholder={`Option ${index + 1}`}
                              value={opt.text}
                              onChange={(e) => updateResolutionOption(opt.id, e.target.value)}
                              className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-amber-500 shadow-sm"
                            />
                            <button onClick={() => removeResolutionOption(opt.id)} className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* STEP 3: SCHEDULING & PUBLISH */}
                {wizardStep === 3 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 max-w-2xl mx-auto">
                    
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
                      <h4 className="font-black text-amber-800 flex items-center gap-2 mb-2"><CalendarClock className="w-5 h-5"/> Timeline Protocol</h4>
                      <p className="text-xs text-amber-700/80 font-medium">Once published, the system will automatically open and close the ballot based on these precise timings. Results will be concealed until the Declaration Time.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Voting Start Time (Live)</label>
                        <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-[#007AFF]" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Voting End Time (Lock)</label>
                        <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-[#007AFF]" />
                      </div>
                      <div className="md:col-span-2 pt-2">
                        <label className="text-[10px] font-black text-[#007AFF] uppercase tracking-widest mb-1.5 block ml-1">Result Declaration Time</label>
                        <input type="datetime-local" value={resultTime} onChange={e => setResultTime(e.target.value)} className="w-full px-4 py-3.5 bg-blue-50 border border-blue-200 rounded-xl text-sm font-black text-blue-900 outline-none shadow-inner" />
                      </div>
                    </div>

                  </motion.div>
                )}

              </div>

              {/* WIZARD FOOTER (CONTROLS) */}
              <div className="bg-gray-50 border-t border-gray-200 p-6 flex justify-between items-center shrink-0">
                <button 
                  onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : setIsWizardOpen(false)}
                  disabled={isProcessing}
                  className="px-6 py-3 text-gray-600 font-bold text-sm bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> {wizardStep === 1 ? 'Cancel' : 'Cancel Edit'}
                </button>

                <div className="flex items-center gap-3">
                  {wizardStep === 3 && (
                    <button 
                      onClick={() => submitElection("draft")}
                      disabled={isProcessing}
                      className="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
                    >
                      {editingElectionId ? 'Update Draft' : 'Save as Draft'}
                    </button>
                  )}
                  
                  {wizardStep < 3 ? (
                    <button 
                      onClick={() => setWizardStep(wizardStep + 1)}
                      disabled={pollType === "appointment" && wizardStep === 1 && (!targetPost && !editingElectionId)}
                      className="px-8 py-3 bg-[#007AFF] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      Next Step <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => submitElection("scheduled")}
                      disabled={isProcessing}
                      className="px-8 py-3 bg-emerald-500 text-white rounded-xl text-sm font-black shadow-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                      Publish & Schedule Protocol
                    </button>
                  )}
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}