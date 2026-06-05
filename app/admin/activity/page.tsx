// app/admin/activity/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Mail, Calendar, MapPin, Filter, Loader2, Users, Search, ShieldAlert, Crosshair, Eye, PlayCircle, MessageSquare, X } from "lucide-react";

const stateList = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", 
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Lakshadweep", 
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", 
  "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
  "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

export default function AdminActivityTracker() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tactical Radar States
  const [radarActive, setRadarActive] = useState(false);
  const [searchScope, setSearchScope] = useState("National"); // Only National or State
  const [filterState, setFilterState] = useState(""); 
  const [filterDistrict, setFilterDistrict] = useState(""); 
  const [activeQuery, setActiveQuery] = useState({ scope: "", state: "", district: "" });

  // Modal States
  const [inspectData, setInspectData] = useState<any>(null);
  const [readMoreData, setReadMoreData] = useState<any>(null); // 🔥 NAYA STATE "SEE MORE" KE LIYE

  useEffect(() => {
    const nlQuery = query(collection(db, "newsletters"), orderBy("sentAt", "desc"));
    const unsubNL = onSnapshot(nlQuery, (nlSnap) => {
      const nlDocs = nlSnap.docs.map(doc => ({ 
        id: doc.id, 
        _type: "broadcast", 
        _timestamp: doc.data().sentAt?.toMillis() || Date.now(), 
        ...doc.data() 
      }));

      const meetQuery = query(collection(db, "meetings"), orderBy("createdAt", "desc"));
      const unsubMeet = onSnapshot(meetQuery, (meetSnap) => {
        const meetDocs = meetSnap.docs.map(doc => ({ 
          id: doc.id, 
          _type: "meeting", 
          _timestamp: doc.data().createdAt?.toMillis() || Date.now(), 
          ...doc.data() 
        }));

        const combined = [...nlDocs, ...meetDocs].sort((a, b) => b._timestamp - a._timestamp);
        setActivities(combined);
        setLoading(false);
      });
      return () => unsubMeet();
    });
    return () => unsubNL();
  }, []);

  const handleActivateRadar = () => {
    if (searchScope === "State" && !filterState.trim()) {
      return alert("Please specify a State before activating the radar.");
    }
    
    setActiveQuery({ 
      scope: searchScope, 
      state: filterState.trim().toLowerCase(), 
      district: filterDistrict.trim().toLowerCase() 
    });
    setRadarActive(true);
  };

  const handleResetRadar = () => {
    setRadarActive(false);
    setFilterState("");
    setFilterDistrict("");
    setActiveQuery({ scope: "", state: "", district: "" });
  };

  // 🔥 ADVANCED STRICT ISOLATION FILTERING ENGINE 🔥
  const filteredActivities = activities.filter((item) => {
    if (!radarActive) return false;
    
    const isBroadcast = item._type === "broadcast";

    if (activeQuery.scope === "National") {
      if (isBroadcast) return item.targetScope === "National";
      return item.jurisdictionState === "National" || item.jurisdictionState === "All India";
    }

    if (activeQuery.scope === "State") {
      const itemState = isBroadcast ? (item.targetLocation || "").toLowerCase() : (item.jurisdictionState || "").toLowerCase();
      
      if (!itemState.includes(activeQuery.state)) return false;

      if (activeQuery.district) {
        if (isBroadcast) {
          return item.targetScope === "District" && (item.targetLocation || "").toLowerCase().includes(activeQuery.district);
        } else {
          return item.jurisdictionDistrict !== "State Wide" && (item.jurisdictionDistrict || "").toLowerCase().includes(activeQuery.district);
        }
      } 
      else {
        if (isBroadcast) {
          return item.targetScope === "State";
        } else {
          return item.jurisdictionDistrict === "State Wide";
        }
      }
    }
    
    return false;
  });

  if (loading) return <div className="flex justify-center items-center h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#007AFF]"/></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 relative">
      
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-md relative overflow-hidden">
        {radarActive && <div className="absolute top-0 right-0 w-64 h-64 bg-green-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 transition-all duration-1000"></div>}
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Crosshair className={`w-6 h-6 ${radarActive ? 'text-green-500 animate-pulse' : 'text-[#007AFF]'}`} /> 
              Jurisdiction Activity Radar
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              Select specific operational parameters to decrypt and extract localized intelligence logs.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-4 w-full lg:w-auto">
            
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1 shrink-0 w-full sm:w-auto">
                  <Filter className="w-4 h-4 text-gray-400 mx-2" />
                  {["National", "State"].map(lvl => (
                    <button 
                      key={lvl} 
                      onClick={() => { setSearchScope(lvl); setRadarActive(false); setFilterState(""); setFilterDistrict(""); }}
                      className={`flex-1 sm:flex-none px-5 py-2 text-xs font-bold rounded-lg transition-all ${searchScope === lvl ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      {lvl} Level
                    </button>
                  ))}
                </div>

                {searchScope === "State" && (
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" list="state-list" placeholder="Select State..."
                      value={filterState} onChange={(e) => { setFilterState(e.target.value); setRadarActive(false); setFilterDistrict(""); }}
                      className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-[#007AFF] focus:bg-white shadow-sm transition-all h-full"
                    />
                  </div>
                )}
              </div>

              {searchScope === "State" && filterState && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }} 
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  className="relative w-full"
                >
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" placeholder="Search and Select Target District (Optional)..."
                    value={filterDistrict} onChange={(e) => { setFilterDistrict(e.target.value); setRadarActive(false); }}
                    className="w-full pl-9 pr-4 py-2.5 bg-[#f8fafc] border border-[#CBD5E1] rounded-xl text-sm font-bold outline-none focus:border-[#007AFF] focus:bg-white focus:ring-4 focus:ring-blue-50 shadow-sm transition-all"
                  />
                </motion.div>
              )}
            </div>

            <datalist id="state-list">
              {stateList.map(state => <option key={state} value={state} />)}
            </datalist>

            <div className="w-full sm:w-auto shrink-0 mt-0 sm:mt-1">
              {radarActive ? (
                <button onClick={handleResetRadar} className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-200 transition-all">
                  Clear Radar
                </button>
              ) : (
                <button onClick={handleActivateRadar} className="w-full sm:w-auto px-6 py-2.5 bg-[#007AFF] text-white font-bold text-sm rounded-xl shadow-md hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                  <Activity className="w-4 h-4" /> Initialize Scan
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!radarActive ? (
          <motion.div 
            key="offline"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center h-[50vh]"
          >
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
              <ShieldAlert className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Radar Currently Offline</h2>
            <p className="text-sm font-medium text-gray-500 max-w-md">
              Awaiting jurisdictional parameters. Select a specific tier (National or State) and initialize the scan to extract highly isolated localized operational logs.
            </p>
          </motion.div>
        ) : (
          <motion.div 
            key="online"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-2 px-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse border border-white shadow-sm"></span>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                Displaying intelligence logs for: <strong className="text-gray-900">
                  {activeQuery.scope === "National" ? "ALL INDIA (NATIONAL COMMAND)" : 
                   activeQuery.district ? `${activeQuery.district.toUpperCase()}, ${activeQuery.state.toUpperCase()} (DISTRICT LEVEL)` : 
                   `${activeQuery.state.toUpperCase()} (STATE LEVEL)`}
                </strong>
              </p>
            </div>

            {filteredActivities.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-3xl p-16 text-center text-gray-400 shadow-sm">
                <Activity className="w-12 h-12 mx-auto opacity-20 mb-3" />
                <p className="font-bold">No operational activity detected in this designated sector.</p>
              </div>
            ) : (
              filteredActivities.map((act) => {
                // Determine the main content payload
                const payloadContent = act._type === 'broadcast' ? act.message : act.agenda;
                const isLongContent = payloadContent && payloadContent.length > 100;

                return (
                  <div key={act.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-5 relative overflow-hidden group">
                    
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${act._type === 'broadcast' ? 'bg-[#007AFF]' : 'bg-orange-500'}`}></div>

                    <div className="md:w-1/4 shrink-0 border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-4 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${act._type === 'broadcast' ? 'bg-blue-50 text-[#007AFF]' : 'bg-orange-50 text-orange-500'}`}>
                          {act._type === 'broadcast' ? <Mail className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            {act._type === 'broadcast' ? 'Newsletter' : (act.attendanceStatus === 'Completed' ? 'Report Submitted' : 'Scheduled Meeting')}
                          </p>
                          <p className="text-xs font-bold text-gray-900 mt-0.5">{new Date(act._timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5 mt-2 border border-gray-100">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Target Jurisdiction</p>
                        <p className="text-xs font-bold text-gray-700 flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400"/> {act._type === 'broadcast' ? act.targetLocation : `${act.jurisdictionDistrict !== 'State Wide' ? act.jurisdictionDistrict + ', ' : ''}${act.jurisdictionState}`}</p>
                      </div>
                    </div>

                    <div className="md:w-3/4 flex flex-col justify-center">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <h3 className="text-lg font-black text-gray-900 leading-tight">
                          {act._type === 'broadcast' ? act.subject : act.title}
                        </h3>
                        {act._type === 'meeting' && (
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0 border ${act.type === 'Digital' ? 'bg-blue-50 text-[#007AFF] border-blue-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                            {act.type} Meet
                          </span>
                        )}
                      </div>
                      
                      {/* 🔥 "SEE MORE" LOGIC ADDED HERE 🔥 */}
                      <div>
                        <p className="text-sm text-gray-600 line-clamp-2 font-medium">
                          {payloadContent}
                        </p>
                        {isLongContent && (
                          <button 
                            onClick={() => setReadMoreData(act)}
                            className="text-[10px] font-black text-[#007AFF] hover:text-blue-800 uppercase tracking-widest mt-1.5 transition-colors"
                          >
                            See More...
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-50 text-xs font-bold">
                        {act._type === 'broadcast' ? (
                          <>
                            <span className="flex items-center gap-1.5 text-gray-500"><Users className="w-4 h-4 text-gray-400"/> Delivered to {act.recipientCount} members</span>
                            <span className="text-gray-400 hidden sm:inline">•</span>
                            <span className="text-gray-500 hidden sm:inline">Dispatched by: <strong className="text-gray-900">{act.sentBy}</strong></span>
                          </>
                        ) : (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 w-full">
                            <span className="flex items-center gap-1.5 text-gray-500">
                              <Calendar className="w-4 h-4 text-gray-400"/>
                              Scheduled at: {act.date} • {act.time}
                            </span>
                            <span className="text-gray-400 hidden sm:inline">•</span>
                            <span className="text-gray-500">
                              Hosted by: <strong className="text-gray-900">{act.hostName}, <span className="capitalize">{act.hostRole?.replace(/_/g, ' ') || 'Leader'}</span></strong>
                            </span>
                            
                            <div className="flex items-center gap-3 ml-auto">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${act.attendanceStatus === 'Completed' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                                {act.attendanceStatus === 'Completed' ? 'Roster Logged' : 'Pending'}
                              </span>

                              {act.attendanceStatus === 'Completed' && act.postMatters && (
                                <button 
                                  onClick={() => setInspectData(act)}
                                  className="flex items-center gap-1.5 text-[10px] font-bold text-[#007AFF] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition-colors"
                                >
                                  <Eye className="w-3 h-3" /> Inspect Report
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
                    <Crosshair className="w-3.5 h-3.5 text-blue-400" /> Classified Intelligence Report
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
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Host / Leader</p>
                    <p className="text-sm font-black text-gray-900 line-clamp-1">{inspectData.hostName}</p>
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

      {/* 🔥 FULL CONTENT "READ MORE" MODAL OVERLAY 🔥 */}
      <AnimatePresence>
        {readMoreData && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-gray-900 p-5 flex items-center justify-between text-white shrink-0">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    {readMoreData._type === 'broadcast' ? <Mail className="w-3.5 h-3.5 text-blue-400" /> : <Calendar className="w-3.5 h-3.5 text-blue-400" />}
                    Full {readMoreData._type === 'broadcast' ? 'Newsletter' : 'Meeting Agenda'}
                  </span>
                  <h2 className="text-xl font-black mt-1 leading-tight">{readMoreData._type === 'broadcast' ? readMoreData.subject : readMoreData.title}</h2>
                </div>
                <button onClick={() => setReadMoreData(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <p className="text-sm text-gray-800 font-medium whitespace-pre-wrap leading-relaxed">
                    {readMoreData._type === 'broadcast' ? readMoreData.message : readMoreData.agenda}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}