// app/leader/workspace/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { Calendar, Users, Mail, Video, MapPin, Loader2, CheckCircle2, ClipboardList, ShieldAlert, Plus, Send, Clock, UserCheck, X, Search, Eye, PlayCircle, Crosshair, MessageSquare, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LeaderWorkspace() {
  const { userData, loadingUser } = useUser();
  const [activeTab, setActiveTab] = useState("meetings");

  const [localMembers, setLocalMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // 🔥 HIERARCHY IDENTIFICATION LOGIC 🔥
  const roleStr = (userData?.role || "").toLowerCase();
  const isNational = roleStr.includes("national");
  const isState = roleStr.includes("state");
  const isDistrict = roleStr.includes("district") || (!isNational && !isState); // Default to local

  const jurisdictionDisplay = isNational 
    ? "ALL INDIA (NATIONAL COMMAND)" 
    : isState 
    ? `${userData?.state?.toUpperCase()} (STATE COMMAND)` 
    : `${userData?.district}, ${userData?.state} (DISTRICT COMMAND)`;

  // 1. MEETING MANAGEMENT STATES
  const [meetings, setMeetings] = useState<any[]>([]);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingAgenda, setMeetingAgenda] = useState("");
  const [meetingType, setMeetingType] = useState("Digital");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [targetAudience, setTargetAudience] = useState(""); 
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);

  // 2. ATTENDANCE & REPORT STATES
  const [selectedMeetingForAttendance, setSelectedMeetingForAttendance] = useState<any>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  
  const [rosterSearch, setRosterSearch] = useState(""); 
  const [postMatters, setPostMatters] = useState("");
  const [postMood, setPostMood] = useState("Positive & Energetic");
  const [postFootage, setPostFootage] = useState("");

  const [inspectData, setInspectData] = useState<any>(null);

  // 3. LOCALIZED BROADCAST STATES
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isDispatchingBroadcast, setIsDispatchingBroadcast] = useState(false);

  // 🔥 NEW STATES FOR DYNAMIC HIERARCHY 🔥
  const [hierarchyData, setHierarchyData] = useState<any>(null);
  const [dynamicOptions, setDynamicOptions] = useState<{label: string, value: string}[]>([]);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | null }>({ message: "", type: null });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: null }), 4000);
  };

  // FETCH DYNAMIC HIERARCHY DATA
  useEffect(() => {
    const fetchHierarchy = async () => {
      try {
        const docRef = doc(db, "settings", "roles_hierarchy");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setHierarchyData(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching hierarchy:", error);
      }
    };
    fetchHierarchy();
  }, []);

  // BUILD DYNAMIC DROPDOWN OPTIONS BASED ON LEADER'S LEVEL
  useEffect(() => {
    if (!hierarchyData) return;
    
    let options: {label: string, value: string}[] = [];

    const getTitlesFromTierList = (tierList: any[], levelPrefix: string) => {
      let extracted: string[] = [];
      tierList.forEach(tier => {
        if (tier.titles) {
          tier.titles.forEach((t: any) => extracted.push(`${levelPrefix} ${t.title}`));
        }
      });
      return extracted;
    };

    if (isNational) {
      options.push({ label: "All State Leaders", value: "All State Leaders" });
      if (hierarchyData.State) {
         getTitlesFromTierList(hierarchyData.State, "State").forEach(title => {
           options.push({ label: `${title} Only`, value: title });
         });
      }
    } 
    else if (isState) {
      options.push({ label: "All State & District Leaders", value: "All State & District Leaders" });
      options.push({ label: "All State Subordinate Leaders", value: "All State Subordinate Leaders" });
      if (hierarchyData.State) {
        getTitlesFromTierList(hierarchyData.State, "State").forEach(title => {
          options.push({ label: `${title} Only`, value: title });
        });
      }
      options.push({ label: "All District Leaders", value: "All District Leaders" });
      if (hierarchyData.District) {
        getTitlesFromTierList(hierarchyData.District, "District").forEach(title => {
          options.push({ label: `${title} Only`, value: title });
        });
      }
    } 
    else if (isDistrict) {
      options.push({ label: "All District & Ground Cadre", value: "All District & Ground Cadre" });
      if (hierarchyData.District) {
        getTitlesFromTierList(hierarchyData.District, "District").forEach(title => {
          options.push({ label: `${title} Only`, value: title });
        });
      }
      options.push({ label: "All Booth Leaders", value: "All Booth Leaders" });
      options.push({ label: "Booth Presidents Only", value: "Booth President" });
      options.push({ label: "Active Members Only", value: "Active Members Only" });
    }

    setDynamicOptions(options);
    if (options.length > 0) {
      setTargetAudience(options[0].value);
    }
  }, [hierarchyData, isNational, isState, isDistrict]);

  // 🔥 ADVANCED AUDIENCE MATCHER ENGINE 🔥
  const matchAudience = (memberRole: string, targetValue: string) => {
    const r = (memberRole || "").toLowerCase();
    const t = targetValue.toLowerCase();

    // Specific "All" broad categories
    if (t === "all state leaders" || t === "all state subordinate leaders") return r.includes("state");
    if (t === "all district leaders") return r.includes("district");
    if (t === "all state & district leaders") return r.includes("state") || r.includes("district");
    if (t === "all booth leaders") return r.includes("booth");
    if (t === "all district & ground cadre") return !r.includes("state") && !r.includes("national");
    if (t === "active members only") return r === "active_member" || r === "member";

    // Dynamic Exact Match (e.g. "State President")
    // Note: The dropdown value now perfectly matches the exact combined string from hierarchy
    return r === t; 
  };

  useEffect(() => {
    if (!userData || !userData.state) return;

    const membersRef = collection(db, "members");
    let membersQuery;

    if (isNational) {
      membersQuery = query(membersRef); 
    } else if (isState) {
      membersQuery = query(membersRef, where("state", "==", userData.state)); 
    } else {
      membersQuery = query(membersRef, where("state", "==", userData.state), where("district", "==", userData.district)); 
    }

    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const r = (data.role || "").toLowerCase();
        
        if (docSnap.id === userData.id) return;

        if (isNational) {
          if (r.includes("state")) docs.push({ id: docSnap.id, ...data });
        } else if (isState) {
          if (r.includes("state") || r.includes("district")) docs.push({ id: docSnap.id, ...data });
        } else {
          if (!r.includes("state") && !r.includes("national")) {
            docs.push({ id: docSnap.id, ...data });
          }
        }
      });
      setLocalMembers(docs);
      setLoadingMembers(false);
    });

    const meetingsRef = collection(db, "meetings");
    let meetingsQuery;
    
    if (isNational) {
       meetingsQuery = query(meetingsRef, where("jurisdictionState", "in", ["All India", "National", userData.state]), orderBy("createdAt", "desc"));
    } else {
       meetingsQuery = query(meetingsRef, where("jurisdictionState", "==", userData.state), orderBy("createdAt", "desc"));
    }
    
    const unsubscribeMeetings = onSnapshot(meetingsQuery, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach((docSnap) => docs.push({ id: docSnap.id, ...docSnap.data() }));
      
      if (isState) {
        setMeetings(docs.filter(m => m.hostId === userData.id || m.jurisdictionDistrict === "State Wide"));
      } else if (isDistrict) {
        setMeetings(docs.filter(m => !m.jurisdictionDistrict || m.jurisdictionDistrict === userData.district));
      } else {
        setMeetings(docs.filter(m => m.hostId === userData.id)); 
      }
    });

    return () => {
      unsubscribeMembers();
      unsubscribeMeetings();
    };
  }, [userData]);

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim() || !meetingAgenda.trim() || !meetingLocation.trim() || !meetingDate || !meetingTime) {
      return showToast("All meeting scheduling parameters are mandatory.", "error");
    }

    setIsCreatingMeeting(true);
    try {
      await addDoc(collection(db, "meetings"), {
        title: meetingTitle,
        agenda: meetingAgenda,
        type: meetingType,
        location: meetingLocation,
        date: meetingDate,
        time: meetingTime,
        targetAudience: targetAudience,
        hostId: userData.id,
        hostName: userData.name,
        hostRole: userData.role,
        jurisdictionState: isNational ? "National" : userData.state,
        jurisdictionDistrict: isNational ? "All India" : isState ? "State Wide" : userData.district,
        attendanceStatus: "Pending",
        createdAt: serverTimestamp(),
      });

      setMeetingTitle("");
      setMeetingAgenda("");
      setMeetingLocation("");
      setMeetingDate("");
      setMeetingTime("");
      showToast("Command meeting scheduled and routed to respective cadre.", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to secure meeting slot in database.", "error");
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedMeetingForAttendance) return;
    if (!postMatters.trim()) return showToast("Matters discussed detail is mandatory.", "error");

    setIsSavingAttendance(true);
    try {
      const meetingRef = doc(db, "meetings", selectedMeetingForAttendance.id);
      await updateDoc(meetingRef, {
        attendanceRoster: attendanceMap,
        attendanceStatus: "Completed",
        attendanceUpdatedBy: userData.name,
        attendanceUpdatedAt: serverTimestamp(),
        postMatters: postMatters,
        postMood: postMood,
        postFootage: postFootage
      });

      setSelectedMeetingForAttendance(null);
      setAttendanceMap({});
      setRosterSearch("");
      setPostMatters("");
      setPostMood("Positive & Energetic");
      setPostFootage("");
      showToast("Meeting intelligence report logged successfully.", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to compile attendance spreadsheet logs.", "error");
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleLocalBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      return showToast("Subject line and core payload message are required.", "error");
    }

    const targetEmails = localMembers.filter(member => matchAudience(member.role, targetAudience)).map(m => m.email).filter(Boolean);

    if (targetEmails.length === 0) {
      return showToast("No targets found for the selected sub-category.", "error");
    }

    setIsDispatchingBroadcast(true);
    try {
      const apiResponse = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `[Command Directive] ${broadcastSubject}`,
          message: broadcastMessage,
          emails: targetEmails
        })
      });

      const apiResult = await apiResponse.json();
      if (!apiResponse.ok || apiResult.error) throw new Error(apiResult.error.message || "Broadcast failed.");

      await addDoc(collection(db, "newsletters"), {
        subject: broadcastSubject,
        message: broadcastMessage,
        targetGroup: targetAudience,
        targetScope: isNational ? "National" : isState ? "State" : "District",
        targetLocation: isNational ? "All India" : isState ? userData.state : `${userData.district}, ${userData.state}`,
        recipientCount: targetEmails.length,
        sentBy: `${userData.name} (${userData.role})`,
        status: "Sent",
        sentAt: serverTimestamp()
      });

      setBroadcastSubject("");
      setBroadcastMessage("");
      showToast(`Intelligence dispatch transmitted to ${targetEmails.length} specific leaders.`, "success");
    } catch (error) {
      console.error(error);
      showToast("Signal disruption. Dispatch aborted.", "error");
    } finally {
      setIsDispatchingBroadcast(false);
    }
  };

  const filteredMembers = localMembers.filter(member => {
    const meetingTarget = selectedMeetingForAttendance?.targetAudience || "All";
    
    // 1. Strict Filter by Target Category
    if (!matchAudience(member.role, meetingTarget)) return false;

    // 2. Search Text Filter
    if (!rosterSearch.trim()) return true;
    const s = rosterSearch.toLowerCase();
    return (
      (member.name && member.name.toLowerCase().includes(s)) ||
      (member.email && member.email.toLowerCase().includes(s)) ||
      (member.phone && member.phone.toLowerCase().includes(s))
    );
  });

  if (loadingUser) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#007AFF]"/></div>;
  if (!userData || !userData.role) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-red-200 rounded-3xl shadow-xl text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border-4 border-red-100">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-gray-900">Command Access Denied</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          This portal workspace is restricted to official authorized framework leaders only.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 relative">
      
      <AnimatePresence>
        {toast.type && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-[500] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm max-w-sm border ${
              toast.type === "success" ? "bg-gray-900 text-white border-gray-800" : "bg-red-50 text-red-600 border-red-200"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" /> : <ShieldAlert className="w-5 h-5 shrink-0" />}
            <p className="leading-snug">{toast.message}</p>
            <button onClick={() => setToast({ message: "", type: null })} className="ml-auto opacity-50 hover:opacity-100 transition-opacity">
              <X className="w-4 h-4 shrink-0" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-[#007AFF]" /> Leader Operations Workspace
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Jurisdiction Command: <strong className="text-gray-900 font-bold">{jurisdictionDisplay}</strong> | Role: <strong className="text-[#007AFF] font-bold">{userData.role.toUpperCase()}</strong>
          </p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
          <button onClick={() => { setActiveTab("meetings"); setSelectedMeetingForAttendance(null); }} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'meetings' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-900'}`}>
            Meetings Hub
          </button>
          <button onClick={() => { setActiveTab("broadcast"); setSelectedMeetingForAttendance(null); }} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'broadcast' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-900'}`}>
            Command Dispatch
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        <div className="lg:col-span-2 space-y-6">
          
          {activeTab === "meetings" && !selectedMeetingForAttendance && (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-gray-400" /> Dispatch Ground Meeting
              </h3>
              
              <form onSubmit={handleScheduleMeeting} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 🔥 DYNAMIC SUB-CATEGORY AUDIENCE SELECTOR WITH LIVE POSTS 🔥 */}
                <div className="md:col-span-2 bg-blue-50/50 p-4 border border-blue-100 rounded-2xl mb-2">
                  <label className="text-[10px] font-black text-[#007AFF] uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <Target className="w-3.5 h-3.5" /> Select Target Cadre Audience
                  </label>
                  <select 
                    value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} 
                    className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all shadow-sm cursor-pointer"
                  >
                    {dynamicOptions.length > 0 ? (
                      dynamicOptions.map((opt, idx) => (
                        <option key={idx} value={opt.value}>{opt.label}</option>
                      ))
                    ) : (
                      <option value="" disabled>Loading target groups...</option>
                    )}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Meeting Title</label>
                  <input type="text" placeholder="e.g., Strategic Campaign Discussion on Local Booth Rallies" value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-[#007AFF]" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Agenda / Mandate Docs</label>
                  <textarea placeholder="Draft the precise action plan or agenda topics for local cadre allocation..." value={meetingAgenda} onChange={(e) => setMeetingAgenda(e.target.value)} className="w-full h-24 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-[#007AFF] resize-none" />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Meeting Category</label>
                  <select value={meetingType} onChange={(e) => setMeetingType(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none">
                    <option value="Digital">Digital (Virtual Video Link)</option>
                    <option value="Physical">Physical (Ground Venue Address)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">{meetingType === 'Digital' ? 'Video Room URL' : 'Venue Physical Address'}</label>
                  <div className="relative">
                    {meetingType === 'Digital' ? <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /> : <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />}
                    <input type="text" placeholder={meetingType === 'Digital' ? 'https://meet.google.com/abc-xyz' : 'District Head Office Sector 4, Ground floor'} value={meetingLocation} onChange={(e) => setMeetingLocation(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-[#007AFF]" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Scheduled Date</label>
                  <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none" />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Timings (IST)</label>
                  <input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none" />
                </div>

                <div className="md:col-span-2 pt-2 border-t border-gray-100 flex justify-end">
                  <button type="submit" disabled={isCreatingMeeting} className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-bold text-sm rounded-xl shadow hover:bg-black transition-colors disabled:opacity-50">
                    {isCreatingMeeting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                    {isCreatingMeeting ? "Scheduling..." : "Schedule Roster Meeting"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "meetings" && selectedMeetingForAttendance && (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                <div>
                  <span className="text-[9px] bg-amber-50 border border-amber-200 text-amber-600 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Live Attendance Deck</span>
                  <h3 className="text-xl font-black text-gray-900 mt-1">{selectedMeetingForAttendance.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {selectedMeetingForAttendance.date} | {selectedMeetingForAttendance.time}</p>
                    <span className="text-xs font-bold px-2 py-0.5 bg-blue-50 text-[#007AFF] border border-blue-100 rounded-md">Target: {selectedMeetingForAttendance.targetAudience}</span>
                  </div>
                </div>
                <button onClick={() => { setSelectedMeetingForAttendance(null); setAttendanceMap({}); setRosterSearch(""); }} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search target cadre by name, email, or phone..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-blue-50 transition-all"
                />
              </div>

              <div className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto pr-2 border border-gray-100 rounded-xl p-2 bg-gray-50">
                {filteredMembers.length === 0 ? (
                  <p className="text-center py-8 text-sm text-gray-400 font-medium">No target personnel found matching your criteria.</p>
                ) : (
                  filteredMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between py-2.5 px-3 hover:bg-white rounded-lg transition-colors">
                      <div>
                        <p className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          {member.name}
                          <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded border border-gray-200 uppercase">{member.role?.replace(/_/g, ' ') || 'Member'}</span>
                        </p>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{member.email} | {member.phone}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={!!attendanceMap[member.id]} 
                          onChange={(e) => setAttendanceMap(prev => ({ ...prev, [member.id]: e.target.checked }))} 
                          className="w-5 h-5 text-[#007AFF] bg-gray-100 border-gray-300 rounded focus:ring-[#007AFF] cursor-pointer"
                        />
                      </label>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-6 border-t border-gray-100 space-y-4">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-[#007AFF]" /> Post-Meeting Intelligence Report
                </h4>
                
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Core Matters Discussed *</label>
                  <textarea 
                    placeholder="Summarize the key points, decisions, and cadre response..." 
                    value={postMatters} onChange={(e) => setPostMatters(e.target.value)} 
                    className="w-full h-20 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-[#007AFF] resize-none" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">General Mood & Vibe</label>
                    <select 
                      value={postMood} onChange={(e) => setPostMood(e.target.value)} 
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none"
                    >
                      <option value="Positive & Energetic">Positive & Energetic</option>
                      <option value="Highly Aggressive/Motivated">Highly Aggressive/Motivated</option>
                      <option value="Neutral/Informative">Neutral / Informative</option>
                      <option value="Disappointed/Needs Attention">Disappointed / Needs Attention</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Footage Link (Unlisted YT)</label>
                    <input 
                      type="url" placeholder="https://youtu.be/..." 
                      value={postFootage} onChange={(e) => setPostFootage(e.target.value)} 
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-[#007AFF]" 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-4">
                <button onClick={() => { setSelectedMeetingForAttendance(null); setAttendanceMap({}); setRosterSearch(""); }} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors">
                  Cancel Sheet
                </button>
                <button onClick={handleSaveAttendance} disabled={isSavingAttendance || filteredMembers.length === 0} className="px-6 py-2.5 bg-[#007AFF] text-white rounded-xl font-bold text-xs shadow hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                  {isSavingAttendance ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  {isSavingAttendance ? "Saving Ledger..." : "Commit Attendance Records"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "broadcast" && (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gray-400" /> Command Level Dispatch
                </h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Securely target specific subordinate levels within your structural jurisdiction boundaries.
                </p>
              </div>

              <form onSubmit={handleLocalBroadcast} className="space-y-4">
                
                {/* 🔥 DYNAMIC SUB-CATEGORY EMAIL SELECTOR 🔥 */}
                <div className="bg-orange-50/50 p-4 border border-orange-100 rounded-2xl mb-2">
                  <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <Target className="w-3.5 h-3.5" /> Sub-Category Recipient Target
                  </label>
                  <select 
                    value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} 
                    className="w-full px-4 py-3 bg-white border border-orange-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-4 focus:ring-orange-50 transition-all shadow-sm cursor-pointer"
                  >
                    {dynamicOptions.length > 0 ? (
                      dynamicOptions.map((opt, idx) => (
                        <option key={idx} value={opt.value}>{opt.label}</option>
                      ))
                    ) : (
                      <option value="" disabled>Loading target groups...</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 ml-1">Subject Line</label>
                  <input type="text" placeholder="e.g., Mandatory Directives for Target Cadre..." value={broadcastSubject} onChange={(e) => setBroadcastSubject(e.target.value)} className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold outline-none focus:bg-white focus:border-[#007AFF] shadow-sm" />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 ml-1">Message Content Payload</label>
                  <textarea placeholder="Draft your detailed ground directive orders here..." value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} className="w-full h-64 p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm leading-relaxed outline-none focus:bg-white focus:border-[#007AFF] resize-none shadow-sm" />
                </div>

                <div className="pt-2 border-t border-gray-100 flex justify-end">
                  <button type="submit" disabled={isDispatchingBroadcast || localMembers.length === 0} className="flex items-center gap-2 px-8 py-3.5 bg-[#007AFF] text-white font-bold rounded-xl shadow hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:bg-gray-400">
                    {isDispatchingBroadcast ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    {isDispatchingBroadcast ? "Transmitting..." : "Dispatch Intelligence"}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-900 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><Users className="w-20 h-20" /></div>
            <h4 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Subordinate Cadre Limit</h4>
            <h2 className="text-3xl font-black">{loadingMembers ? "..." : `${localMembers.length} Verified`}</h2>
            <p className="text-[11px] text-gray-400 leading-relaxed mt-2 font-medium">
              Operational personnel directly falling under your targeted command structure.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm flex flex-col h-[400px]">
            <h4 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-3 flex items-center gap-2 shrink-0">
               <Calendar className="w-4 h-4 text-gray-400" /> Action Log History
            </h4>
            
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 mt-2 pr-1">
              {meetings.length === 0 ? (
                <div className="text-center py-16 text-gray-400 space-y-2">
                  <Calendar className="w-8 h-8 mx-auto opacity-20" />
                  <p className="text-xs font-semibold">No schedules logged yet.</p>
                </div>
              ) : (
                meetings.map((meet) => (
                  <div key={meet.id} className="py-3.5 first:pt-1 space-y-2.5 group">
                    <div>
                      <h5 className="font-bold text-gray-900 text-xs line-clamp-1 group-hover:text-[#007AFF] transition-colors">{meet.title}</h5>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] ${meet.type === 'Digital' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                          {meet.type}
                        </span>
                        <span className="flex items-center gap-0.5"><Clock className="w-3 h-3"/> {meet.date}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded uppercase ${meet.attendanceStatus === 'Completed' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                        {meet.attendanceStatus === 'Completed' ? 'Logged' : 'Pending'}
                      </span>
                      
                      {meet.attendanceStatus !== 'Completed' ? (
                        <button 
                          onClick={() => {
                            setSelectedMeetingForAttendance(meet);
                            setAttendanceMap(meet.attendanceRoster || {});
                            setRosterSearch(""); 
                            setActiveTab("meetings"); 
                          }}
                          className="text-[10px] font-bold text-[#007AFF] bg-blue-50 border border-blue-100 hover:bg-[#007AFF] hover:text-white px-2.5 py-1 rounded-md transition-all shadow-sm"
                        >
                          Mark Roster
                        </button>
                      ) : (
                        <button 
                          onClick={() => setInspectData(meet)}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 px-2.5 py-1 rounded-md transition-colors"
                        >
                          <Eye className="w-3 h-3 text-gray-500" /> Inspect
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 🚀 INSPECTION MODAL OVERLAY 🚀 */}
      <AnimatePresence>
        {inspectData && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-gray-900 p-5 flex items-center justify-between text-white shrink-0">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-blue-400" /> Submitted Intelligence Report
                  </span>
                  <h2 className="text-xl font-black mt-1 leading-tight">{inspectData.title}</h2>
                </div>
                <button onClick={() => setInspectData(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-gray-100 p-3 rounded-2xl shadow-sm">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Date Logged</p>
                    <p className="text-sm font-black text-gray-900">{inspectData.date}</p>
                  </div>
                  <div className="bg-white border border-gray-100 p-3 rounded-2xl shadow-sm">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Target Cadre</p>
                    <p className="text-sm font-black text-gray-900 line-clamp-1">{inspectData.targetAudience}</p>
                  </div>
                  <div className="bg-white border border-gray-100 p-3 rounded-2xl shadow-sm md:col-span-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Ground Mood / Vibe</p>
                    <p className="text-sm font-black text-[#007AFF]">{inspectData.postMood || "Not Specified"}</p>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                    <MessageSquare className="w-4 h-4 text-[#007AFF]" /> Core Matters Discussed
                  </h3>
                  <p className="text-sm text-gray-700 font-medium whitespace-pre-wrap leading-relaxed">
                    {inspectData.postMatters}
                  </p>
                </div>

                {inspectData.postFootage ? (
                  <a 
                    href={inspectData.postFootage} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-4 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-2xl font-black text-sm transition-colors shadow-sm"
                  >
                    <PlayCircle className="w-5 h-5" /> Access Classified Meeting Footage
                  </a>
                ) : (
                  <div className="w-full py-4 bg-gray-100 border border-gray-200 text-gray-400 rounded-2xl font-bold text-xs text-center">
                    No Video Footage Provided
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}