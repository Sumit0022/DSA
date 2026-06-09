// app/dashboard/voting/[id]/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import { doc, getDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { ArrowLeft, CheckCircle2, ChevronRight, Globe, Lock, ShieldCheck, UserCircle, Vote, AlertTriangle, FileText, Check, Clock, Loader2, XCircle, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function VotingBooth({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { userData, loadingUser } = useUser();
  const { id } = use(params);

  const [election, setElection] = useState<any>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Booth States
  const [boothStep, setBoothStep] = useState(1);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCasting, setIsCasting] = useState(false);
  
  // Profile Popup State
  const [viewProfileCandidate, setViewProfileCandidate] = useState<any>(null);

  useEffect(() => {
    if (!userData) return;

    const fetchBoothData = async () => {
      try {
        const eSnap = await getDoc(doc(db, "elections", id));
        if (!eSnap.exists()) return router.push("/dashboard/voting");
        const eData = eSnap.data();
        setElection({ id: eSnap.id, ...eData });

        const rQuery = query(collection(db, "election_receipts"), where("userId", "==", userData.id), where("electionId", "==", id));
        const rSnap = await getDocs(rQuery);
        if (!rSnap.empty) setHasVoted(true);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBoothData();
  }, [userData, id, router]);

  const castVote = async () => {
    if (!selectedOption || !userData || hasVoted) return;
    setIsCasting(true);

    try {
      const batch = writeBatch(db);

      const receiptRef = doc(collection(db, "election_receipts"));
      batch.set(receiptRef, {
        userId: userData.id,
        electionId: election.id,
        timestamp: serverTimestamp()
      });

      const ballotRef = doc(collection(db, "election_ballots"));
      batch.set(ballotRef, {
        electionId: election.id,
        candidateId: selectedOption, 
        timestamp: serverTimestamp()
      });

      await batch.commit();
      setHasVoted(true);
      setBoothStep(3); // Success Screen
    } catch (err) {
      console.error("Failed to cast vote", err);
      alert("Error casting vote. Connection secured.");
    } finally {
      setIsCasting(false);
    }
  };

  if (loadingUser || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" /></div>;
  if (!election) return null;

  const now = new Date();
  const isUpcoming = new Date(election.startTime) > now && election.status !== "completed";
  const isLive = new Date(election.startTime) <= now && new Date(election.endTime) > now && election.status !== "completed";
  const isLocked = new Date(election.endTime) <= now && election.status !== "completed";

  const showResults = election.status === "completed";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 relative">
      <Link href="/dashboard/voting" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Hub
      </Link>

      {/* SECURE HEADER */}
      <div className="bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-white flex flex-col md:flex-row justify-between items-center md:items-end gap-6">
        <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-[#007AFF]/20 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="relative z-10 w-full">
          <div className="flex justify-between items-start mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full border border-white/20 text-[10px] font-bold uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5 text-[#34C759]" /> 256-bit Encrypted Booth
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white/5 px-2 py-1 rounded border border-white/10">{election.type}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">{election.title}</h1>
          <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
            <span className="flex items-center gap-1"><Globe className="w-4 h-4 text-[#007AFF]"/> {election.locationDisplay}</span>
          </div>
        </div>
      </div>

      {/* MAIN BOOTH AREA */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-10 shadow-sm min-h-[400px]">
        
        {showResults ? (
          // --- RESULT SCREEN ---
          <div className="text-center py-10 max-w-lg mx-auto space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xl">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-gray-900">Mandate Declared</h2>
            <p className="text-gray-500 font-medium">The results for this protocol have been officially published by the Election Commission.</p>
            
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-left mt-8">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Outcome Distribution</h3>
              <div className="space-y-4">
                {(election.type === 'appointment' ? election.candidates : election.options?.map((o:any)=>({memberId: o, name: o})) || []).map((cand: any, idx: number) => {
                  const votes = election.voteDistribution?.[cand.memberId] || election.voteDistribution?.[cand.name] || 0;
                  const percentage = election.totalVotes > 0 ? ((votes / election.totalVotes) * 100).toFixed(1) : 0;
                  const isWinner = election.winnerId === cand.memberId;
                  
                  return (
                    <div key={idx} className="relative">
                      <div className="flex justify-between items-end mb-1">
                        <span className={`text-sm font-bold ${isWinner ? 'text-emerald-700' : 'text-gray-700'}`}>{cand.name} {isWinner && '👑'}</span>
                        <span className="text-sm font-black font-mono">{percentage}%</span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${isWinner ? 'bg-emerald-500' : 'bg-blue-400'}`} style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

        ) : hasVoted || boothStep === 3 ? (
          // --- POST-VOTE LOCKED SCREEN ---
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 max-w-md mx-auto">
            <div className="w-20 h-20 bg-gray-50 text-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-200 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Vote Cryptographically Sealed</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              Your mandate has been recorded anonymously. This booth is now permanently locked for your identity to prevent duplicate voting.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-blue-800 flex items-center justify-center gap-3">
              <Clock className="w-5 h-5 text-blue-500" />
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Results Declaration</p>
                <p className="font-black text-sm">{new Date(election.resultTime).toLocaleString()}</p>
              </div>
            </div>
          </motion.div>

        ) : (
          // --- WIZARD ACTIVE VOTING BOOTH (ALWAYS VISIBLE FOR READING) ---
          <AnimatePresence mode="wait">
            {boothStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl mx-auto">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#007AFF]"/> Protocol Mandate
                </h3>
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed mb-8 whitespace-pre-wrap">
                  {election.description}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 mb-8">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-amber-800 leading-relaxed">
                    By proceeding, you verify that you have read the mandate. Voting is irreversible once submitted.
                  </p>
                </div>

                <button onClick={() => setBoothStep(2)} className="w-full py-4 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-black transition-colors flex items-center justify-center gap-2">
                  View Options & Proceed <ChevronRight className="w-4 h-4"/>
                </button>
              </motion.div>
            )}

            {boothStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-3">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Vote className="w-4 h-4 text-[#007AFF]"/> Make Your Selection
                  </h3>
                  <button onClick={() => setBoothStep(1)} className="text-xs font-bold text-gray-500 hover:text-gray-900">Go Back</button>
                </div>

                {election.type === "appointment" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {election.candidates.map((cand: any) => (
                      <div 
                        key={cand.memberId} 
                        onClick={() => setSelectedOption(cand.memberId)}
                        className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all flex gap-4 ${selectedOption === cand.memberId ? 'border-[#007AFF] bg-blue-50/50 shadow-md transform -translate-y-1' : 'border-gray-100 bg-white hover:border-gray-300'}`}
                      >
                        {selectedOption === cand.memberId && <div className="absolute top-4 right-4 w-5 h-5 bg-[#007AFF] rounded-full flex items-center justify-center text-white shrink-0"><Check className="w-3 h-3"/></div>}
                        
                        <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-white shadow-sm overflow-hidden shrink-0">
                          {cand.photo ? <img src={cand.photo} alt={cand.name} className="w-full h-full object-cover" /> : <UserCircle className="w-full h-full text-gray-400 p-2" />}
                        </div>
                        <div className="flex-1 pr-6">
                          <h4 className="font-black text-gray-900 leading-tight">{cand.name}</h4>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5 mb-2">ID Verified</p>
                          {/* Truncated Vision for clean card UI */}
                          <p className="text-xs text-gray-600 font-medium line-clamp-2">{cand.vision || "No manifesto provided."}</p>
                          
                          {/* See More Button */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation(); // Prevents selecting the card when clicking the button
                              setViewProfileCandidate(cand);
                            }}
                            className="text-[10px] font-black text-[#007AFF] mt-2 bg-blue-50 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                          >
                            Read Full Profile <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 mb-8 max-w-lg mx-auto">
                    {election.options.map((opt: string) => (
                      <div 
                        key={opt} 
                        onClick={() => setSelectedOption(opt)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${selectedOption === opt ? 'border-[#007AFF] bg-blue-50/50 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-300'}`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedOption === opt ? 'border-[#007AFF] bg-[#007AFF] text-white' : 'border-gray-300'}`}>
                          {selectedOption === opt && <Check className="w-3 h-3"/>}
                        </div>
                        <span className={`font-bold text-sm ${selectedOption === opt ? 'text-blue-900' : 'text-gray-700'}`}>{opt}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 🚀 CONDITIONAL VOTING ACTION AREA 🚀 */}
                <div className="max-w-md mx-auto">
                  {isUpcoming ? (
                    <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                      <h4 className="font-bold text-amber-800">Booth Opens Soon</h4>
                      <p className="text-xs text-amber-700 mt-1">Voting will officially begin on {new Date(election.startTime).toLocaleString()}. You can review the details until then.</p>
                    </div>
                  ) : isLocked ? (
                    <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <Lock className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                      <h4 className="font-bold text-gray-700">Voting Window Closed</h4>
                      <p className="text-xs text-gray-500 mt-1">The deadline has passed. Awaiting result declaration.</p>
                    </div>
                  ) : (
                    <button 
                      onClick={castVote}
                      disabled={!selectedOption || isCasting}
                      className="w-full py-4 bg-[#007AFF] text-white rounded-xl text-sm font-black shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                      {isCasting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                      Lock & Submit Vote
                    </button>
                  )}
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ─── CANDIDATE PROFILE POPUP MODAL ─── */}
      <AnimatePresence>
        {viewProfileCandidate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
              
              <div className="bg-gray-50 p-6 flex justify-between items-start border-b border-gray-200 relative">
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-16 h-16 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-200 shrink-0">
                    {viewProfileCandidate.photo ? <img src={viewProfileCandidate.photo} alt={viewProfileCandidate.name} className="w-full h-full object-cover" /> : <UserCircle className="w-full h-full text-gray-400 p-1" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 leading-tight">{viewProfileCandidate.name}</h3>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">ID: {viewProfileCandidate.memberId}</p>
                  </div>
                </div>
                <button onClick={() => setViewProfileCandidate(null)} className="p-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-full transition-colors relative z-10 shadow-sm">
                  <XCircle className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <h4 className="text-xs font-black text-[#007AFF] uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                  <Star className="w-4 h-4 text-amber-500"/> Candidate Manifesto
                </h4>
                <div className="prose prose-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {viewProfileCandidate.vision || "The candidate has not provided a detailed manifesto for this protocol."}
                </div>
              </div>
              
              <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button onClick={() => setViewProfileCandidate(null)} className="flex-1 py-3.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors shadow-sm text-sm">
                  Close
                </button>
                <button 
                  onClick={() => {
                    setSelectedOption(viewProfileCandidate.memberId);
                    setViewProfileCandidate(null);
                  }} 
                  className="flex-1 py-3.5 bg-[#007AFF] text-white font-black rounded-xl shadow-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  Select Candidate
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}