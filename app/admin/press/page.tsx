// app/admin/press/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDocs, where, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { 
  Megaphone, Clock, CheckCircle2, AlertTriangle, 
  Trash2, FileText, Send, Loader2, Edit3, Globe,
  ChevronRight, ChevronLeft, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminPressWire() {
  const { userData } = useUser();
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | null }>({ message: "", type: null });
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: null }), 4000);
  };

  const [indiaData, setIndiaData] = useState<Record<string, string[]>>({});
  
  // Compose State
  const [caption, setCaption] = useState("");
  const [content, setContent] = useState("");
  const [jurisdiction, setJurisdiction] = useState("National");
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Draft Edit State
  const [editReleaseId, setEditReleaseId] = useState<string | null>(null);

  const [signatoryName, setSignatoryName] = useState("High Command");
  const [signatoryTitle, setSignatoryTitle] = useState("Authorized Signatory");
  const [signatorySignature, setSignatorySignature] = useState<string | null>(null);

  const [refNo, setRefNo] = useState("");
  const [previewPage, setPreviewPage] = useState(0);

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
    if (!editReleaseId) {
      setRefNo(`DSA/PR/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
    }
    const q = query(collection(db, "press_releases"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const docs: any[] = [];
      snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
      setReleases(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [editReleaseId]);

  useEffect(() => {
    const fetchSignatory = async () => {
      let q;
      const membersRef = collection(db, "members");

      if (jurisdiction === "National") {
        q = query(membersRef, where("roleLevel", "==", "National"), where("roleTitle", "in", ["President", "National President"]));
      } else if (jurisdiction === "State" && selectedState) {
        q = query(membersRef, where("roleLevel", "==", "State"), where("state", "==", selectedState), where("roleTitle", "in", ["President", "State President"]));
      } else if (jurisdiction === "District" && selectedState && selectedDistrict) {
        q = query(membersRef, where("roleLevel", "==", "District"), where("state", "==", selectedState), where("district", "==", selectedDistrict), where("roleTitle", "in", ["President", "District President"]));
      } else {
        setSignatoryName("High Command");
        setSignatoryTitle(jurisdiction === "National" ? "National Command" : jurisdiction === "State" ? "State Command" : "District Command");
        setSignatorySignature(null);
        return;
      }

      try {
        const snap = await getDocs(q);
        if (!snap.empty) {
           const leader = snap.docs[0].data();
           setSignatoryName(leader.name);
           setSignatoryTitle(leader.role || "President");
           setSignatorySignature(leader.signatureUrl || leader.signature || leader.signatureImage || null); 
        } else {
           setSignatoryName("High Command");
           setSignatoryTitle(`Acting ${jurisdiction} President`);
           setSignatorySignature(null);
        }
      } catch(err) {
        console.error("Signatory fetch error:", err);
      }
    };
    fetchSignatory();
  }, [jurisdiction, selectedState, selectedDistrict]);

  const pages = useMemo(() => {
    if (!content) return [""];
    
    const LIMIT_PAGE_1 = 1800; 
    const LIMIT_NORMAL = 2400; 
    const SIGNATURE_COST = 400; 
    
    const paragraphs = content.split(/\n\s*\n/);
    const result: string[] = [];
    let currentPage = "";
    let currentCost = 0;

    paragraphs.forEach((p, idx) => {
      const isLastParagraph = idx === paragraphs.length - 1;
      const limit = result.length === 0 ? LIMIT_PAGE_1 : LIMIT_NORMAL;
      const effectiveLimit = isLastParagraph ? limit - SIGNATURE_COST : limit;

      const formattedP = p.trim() + "\n\n";

      if (currentCost + formattedP.length > effectiveLimit && currentPage.trim() !== "") {
        const sentences = p.match(/[^.!?]+[.!?]*\s*/g) || [p];
        
        sentences.forEach((s, sIdx) => {
          const wLimit = result.length === 0 ? LIMIT_PAGE_1 : LIMIT_NORMAL;
          const wEffectiveLimit = (isLastParagraph && sIdx === sentences.length - 1) ? wLimit - SIGNATURE_COST : wLimit;

          if (currentCost + s.length > wEffectiveLimit && currentPage.trim() !== "") {
            result.push(currentPage.trim());
            currentPage = s;
            currentCost = s.length;
          } else {
            currentPage += s;
            currentCost += s.length;
          }
        });
        currentPage += "\n\n";
        currentCost += 40; 
      } else {
        currentPage += formattedP;
        currentCost += formattedP.length + 40;
      }
    });
    
    if (currentPage.trim()) result.push(currentPage.trim());
    return result.length > 0 ? result : [""];
  }, [content]);

  useEffect(() => {
    if (previewPage >= pages.length) {
      setPreviewPage(Math.max(0, pages.length - 1));
    }
  }, [pages.length, previewPage]);

  const handleEditDraft = (release: any) => {
    setEditReleaseId(release.id);
    setCaption(release.caption || "");
    setContent(release.content || "");
    setJurisdiction(release.jurisdictionLevel || "National");
    setSelectedState(release.targetState || "");
    setSelectedDistrict(release.targetDistrict || "");
    setRefNo(release.refNumber);
    
    if (release.scheduledFor) {
      const d = new Date(release.scheduledFor);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
      setScheduledTime(localISOTime);
    } else {
      setScheduledTime("");
    }
    
    setPreviewPage(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditReleaseId(null);
    setCaption("");
    setContent("");
    setScheduledTime("");
    setJurisdiction("National");
    setSelectedState("");
    setSelectedDistrict("");
    setPreviewPage(0);
    setRefNo(`DSA/PR/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
  };

  // 🔥 FLAWLESS FIREBASE PAYLOAD FIX 🔥
  const handlePublish = async (status: "published" | "scheduled" | "draft") => {
    if (!content) return showToast("Official notice content is required.", "error");
    if (jurisdiction === "State" && !selectedState) return showToast("Please select a state.", "error");
    if (jurisdiction === "District" && (!selectedState || !selectedDistrict)) return showToast("Please select state and district.", "error");
    if (status === "scheduled" && !scheduledTime) return showToast("Schedule time is required.", "error");

    setIsProcessing(true);
    try {
      const locationDisplay = jurisdiction === "National" ? "All India" : jurisdiction === "State" ? selectedState : `${selectedDistrict}, ${selectedState}`;

      const payload: any = {
        caption: caption || "",
        content: content,
        jurisdictionLevel: jurisdiction,
        targetState: selectedState || "",
        targetDistrict: selectedDistrict || "",
        locationDisplay: locationDisplay,
        refNumber: refNo,
        status: status,
        scheduledFor: scheduledTime ? new Date(scheduledTime).toISOString() : null,
        signatoryName: signatoryName || "High Command",
        signatoryTitle: signatoryTitle || "Authorized Signatory",
        signatorySignature: signatorySignature || null,
        updatedAt: serverTimestamp(),
        issuedBy: userData?.id || "System"
      };

      if (editReleaseId) {
        // 🔥 updateDoc does not accept undefined, so we only update what's needed
        await updateDoc(doc(db, "press_releases", editReleaseId), payload);
      } else {
        // 🔥 Add createdAt only for new documents
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, "press_releases"), payload);
      }

      cancelEdit();
      showToast(`Press Release ${status} successfully.`, "success");
    } catch (err: any) {
      console.error(err);
      showToast("Failed to publish.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this press release permanently?")) return;
    try {
      await deleteDoc(doc(db, "press_releases", id));
      if (editReleaseId === id) cancelEdit();
      showToast("Press Release deleted.", "success");
    } catch (err) {
      showToast("Failed to delete.", "error");
    }
  };

  const filteredReleases = releases.filter(r => activeTab === "all" || r.status === activeTab);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 px-4 sm:px-6 relative">
      
      <AnimatePresence>
        {toast.type && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-8 right-8 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm border backdrop-blur-xl ${toast.type === "success" ? "bg-gray-900 text-white border-gray-800" : "bg-red-50 text-red-600 border-red-200"}`}>
            {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-gray-900 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 text-xs font-bold uppercase tracking-widest mb-4">
            <Megaphone className="w-4 h-4 text-blue-400" /> Official Press Wire
          </span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">Public Relations Engine</h1>
          <p className="text-gray-400 font-medium text-sm leading-relaxed">
            Draft, schedule, and broadcast official mandates. The system automatically converts your text into a perfectly formatted letterhead graphic for the public feed.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* ─── LEFT: COMPOSER ─── */}
        <div className="xl:col-span-5 space-y-6">
          <div className={`bg-white border ${editReleaseId ? 'border-amber-400 shadow-amber-100' : 'border-gray-200 shadow-sm'} rounded-3xl p-6 transition-colors`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#007AFF]"/> 
                {editReleaseId ? "Edit Draft Dispatch" : "Compose Dispatch"}
              </h2>
              {editReleaseId && (
                <button onClick={cancelEdit} className="text-xs font-bold text-gray-500 hover:text-red-500 flex items-center gap-1 bg-gray-50 hover:bg-red-50 px-2 py-1 rounded transition-colors">
                  <X className="w-3.5 h-3.5"/> Cancel
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <textarea 
                  placeholder="What's happening? (Optional Feed Caption)" 
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full bg-transparent text-gray-900 text-base resize-none outline-none placeholder-gray-400 min-h-[60px]"
                />
              </div>
              
              <div className={`border rounded-2xl p-4 transition-colors ${editReleaseId ? 'border-amber-200 bg-amber-50/30 focus-within:bg-white' : 'border-gray-200 bg-gray-50 focus-within:border-[#007AFF] focus-within:bg-white'}`}>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <FileText className="w-3 h-3"/> Official Notice Text (Will generate as Letter JPG)
                </label>
                <textarea 
                  placeholder="By the order of the High Command..." 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-transparent text-gray-900 text-sm resize-none outline-none placeholder-gray-300 min-h-[250px]"
                />
              </div>

              <div className="space-y-3 border-t border-gray-100 pt-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Globe className="w-3 h-3"/> Dispatch Targeting</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">Jurisdiction Level</label>
                    <select value={jurisdiction} onChange={e => {setJurisdiction(e.target.value); setSelectedState(""); setSelectedDistrict("");}} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none">
                      <option value="National">National (All India)</option>
                      <option value="State">State Command</option>
                      <option value="District">District Command</option>
                    </select>
                  </div>
                  
                  {jurisdiction !== "National" && (
                    <div className={jurisdiction === "State" ? "col-span-2" : "col-span-1"}>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">State</label>
                      <select value={selectedState} onChange={e => {setSelectedState(e.target.value); setSelectedDistrict("");}} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none">
                        <option value="">Select State</option>
                        {Object.keys(indiaData).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                  {jurisdiction === "District" && (
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">District</label>
                      <select value={selectedDistrict} disabled={!selectedState} onChange={e => setSelectedDistrict(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none disabled:opacity-50">
                        <option value="">Select District</option>
                        {selectedState && indiaData[selectedState]?.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                 <label className="text-[10px] font-bold text-gray-500 block mb-1">Schedule (Optional)</label>
                 <input type="datetime-local" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none" />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="text-[10px] font-bold text-gray-400">
                  Ref: <span className="font-mono text-gray-600">{refNo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handlePublish("draft")}
                    disabled={isProcessing || !content}
                    className={`px-4 py-2 font-bold text-xs rounded-full transition-colors disabled:opacity-50 ${editReleaseId ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {editReleaseId ? 'Update Draft' : 'Save Draft'}
                  </button>
                  <button 
                    onClick={() => handlePublish(scheduledTime ? "scheduled" : "published")}
                    disabled={isProcessing || !content}
                    className={`px-5 py-2 text-white font-bold text-xs rounded-full shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50 ${editReleaseId && !scheduledTime ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#007AFF] hover:bg-blue-600'}`}
                  >
                    {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Send className="w-3.5 h-3.5"/>} 
                    {scheduledTime ? "Schedule" : (editReleaseId ? "Publish Edit" : "Publish Now")}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ─── RIGHT: LIVE LETTER PREVIEW ─── */}
        <div className="xl:col-span-7 flex justify-center items-start relative px-4 md:px-12 py-4">
          
          {pages.length > 1 && (
            <>
              <button 
                onClick={() => setPreviewPage(p => Math.max(0, p - 1))}
                disabled={previewPage === 0}
                className="absolute left-0 xl:left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-gray-200 shadow-xl rounded-full flex items-center justify-center text-gray-900 hover:text-[#007AFF] hover:bg-blue-50 transition-all disabled:opacity-0 z-30"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              
              <button 
                onClick={() => setPreviewPage(p => Math.min(pages.length - 1, p + 1))}
                disabled={previewPage === pages.length - 1}
                className="absolute right-0 xl:right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#007AFF] border border-blue-600 shadow-xl rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-all disabled:opacity-0 z-30 shadow-blue-500/30 animate-pulse hover:animate-none"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="w-full max-w-[550px] aspect-[1/1.414] bg-white border border-gray-200 shadow-2xl flex flex-col relative overflow-hidden group">
            
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
              <img src="/dsa-logo.png" alt="watermark" className="w-[80%] h-auto grayscale" />
            </div>

            {previewPage === 0 && (
              <div className="relative bg-[#0f172a] text-white p-6 md:p-8 overflow-hidden shrink-0 z-10">
                <div className="absolute right-0 top-0 bottom-0 w-2/3 bg-[#1e3a8a] z-0" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}></div>
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#2563eb] z-20"></div>
                
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-full p-1.5 shrink-0 flex items-center justify-center shadow-lg">
                    <img src="/dsa-logo.png" alt="DSA" className="w-full h-full object-contain" onError={e => e.currentTarget.style.display='none'}/>
                  </div>
                  <div>
                    <h2 className="text-sm md:text-base font-black uppercase tracking-widest mb-0.5">Democratic Social Alliance</h2>
                    <p className="text-[9px] md:text-[10px] text-blue-200 font-medium tracking-wide">
                      Official Press Wire • {jurisdiction === "National" ? "National" : jurisdiction === "State" ? `${selectedState || "State"} Command` : `${selectedDistrict || "District"} Command`}
                    </p>
                  </div>
                </div>
                
                <div className="relative z-10 w-full h-[2px] bg-yellow-500 mt-5 mb-4 opacity-90"></div>

                <div className="relative z-10 flex justify-between items-end">
                   <h1 className="text-xl md:text-2xl font-black tracking-tight leading-none">OFFICIAL PRESS RELEASE</h1>
                   <span className="bg-[#10b981] text-white text-[8px] md:text-[9px] font-black uppercase px-2.5 py-1 rounded shadow-sm tracking-widest">PUBLIC MANDATE</span>
                </div>
              </div>
            )}

            <div className="px-8 md:px-12 pt-8 pb-16 flex flex-col relative z-10 h-full overflow-hidden">
              
              {previewPage === 0 && (
                <div className="flex justify-between items-center text-[9px] md:text-[10px] font-bold text-gray-500 mb-6 font-mono border-b border-gray-100 pb-4 shrink-0">
                  <span>Ref: {refNo}</span>
                  <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
                </div>
              )}

              <div className="flex-1 overflow-hidden relative flex flex-col">
                <div className="text-[10px] text-gray-900 leading-[2.1] font-serif whitespace-pre-wrap text-justify">
                  {pages[previewPage] || <span className="text-gray-300 italic">Official notice content will appear here...</span>}
                </div>

                {previewPage === pages.length - 1 && (
                  <div className="mt-8 flex justify-end shrink-0">
                    <div className="text-center min-w-[150px] flex flex-col items-center">
                      
                      {signatorySignature ? (
                        <div className="h-10 md:h-12 mb-1.5 flex items-end justify-center">
                           <img src={signatorySignature} alt="Signature" className="h-full object-contain mix-blend-multiply opacity-90" />
                        </div>
                      ) : (
                        <div className="h-10 md:h-12 mb-1.5 flex items-end justify-center">
                           <span className="text-gray-400 text-[10px] italic font-serif">Autographed</span>
                        </div>
                      )}
                      
                      <div className="w-[85%] border-b-[1px] border-gray-800 opacity-70 mb-1.5"></div>
                      
                      <p className="text-[10px] md:text-[11px] font-black text-gray-900 uppercase tracking-tight leading-tight">{signatoryName}</p>
                      <p className="text-[8px] md:text-[9px] font-bold text-gray-500 leading-tight">{signatoryTitle}</p>
                      
                      <p className="text-[9px] text-gray-600 mt-1.5 tracking-wide" style={{ fontFamily: "'Brush Script MT', cursive, serif", fontStyle: "italic" }}>
                        {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute bottom-6 left-0 right-0 text-center shrink-0">
                 <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">
                   Page {previewPage + 1} of {pages.length}
                 </p>
              </div>
              
            </div>
          </div>
        </div>

      </div>

      {/* ─── PUBLISHED FEED ARCHIVE ─── */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm min-h-[300px] mt-6">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
          <Clock className="w-4 h-4 text-[#007AFF]"/> Dispatches Log
        </h3>
        
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" /></div>
        ) : releases.length === 0 ? (
           <p className="text-center py-10 text-gray-400 text-sm font-bold">No press releases found.</p>
        ) : (
          <div className="space-y-3">
            {releases.map(release => (
              <div key={release.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:shadow-md transition-shadow gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${release.status === 'published' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : release.status === 'scheduled' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-gray-200 text-gray-600 border-gray-300'}`}>
                      {release.status}
                    </span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">{release.locationDisplay || release.jurisdictionLevel}</span>
                    <span className="text-[10px] font-mono text-gray-500">{release.refNumber}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 line-clamp-1">{release.caption || "Official Mandate Dispatch"}</p>
                  <p className="text-[10px] text-gray-500 mt-1">Issued by: {release.signatoryName} • {new Date(release.createdAt?.toDate()).toLocaleString()}</p>
                </div>
                
                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  {(release.status === 'draft' || release.status === 'scheduled') && (
                    <button onClick={() => handleEditDraft(release)} className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100">
                      <Edit3 className="w-4 h-4"/>
                    </button>
                  )}
                  <button onClick={() => handleDelete(release.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}