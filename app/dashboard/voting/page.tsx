// app/dashboard/voting/page.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, query, onSnapshot, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { Vote, Lock, Clock, CheckCircle2, ChevronRight, AlertTriangle, ShieldCheck, Globe } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function VotingHub() {
  const { userData, loadingUser } = useUser();
  const [elections, setElections] = useState<any[]>([]);
  const [votedElections, setVotedElections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) return;

    // 1. Fetch Elections
    const q = query(collection(db, "elections"), orderBy("createdAt", "desc"));
    const unsubscribeElections = onSnapshot(q, (snapshot) => {
      const docs: any[] = [];
      const now = new Date();

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === "draft") return;

        // ELIGIBILITY GATEKEEPER
        // 1. Check Jurisdiction
        let jurisdictionMatch = false;
        if (data.jurisdictionLevel === "National") jurisdictionMatch = true;
        else if (data.jurisdictionLevel === "State" && data.targetState === userData.state) jurisdictionMatch = true;
        else if (data.jurisdictionLevel === "District" && data.targetState === userData.state && data.targetDistrict === userData.district) jurisdictionMatch = true;

        // 2. Check Role Eligibility
        let roleMatch = false;
        const isLeader = userData.role && userData.role !== "member" && userData.role !== "active_member";
        if (data.allowedVoters === "all") roleMatch = true;
        else if (data.allowedVoters === "active" && (userData.status === "active_member" || isLeader)) roleMatch = true;
        else if (data.allowedVoters === "leaders" && isLeader) roleMatch = true;

        if (jurisdictionMatch && roleMatch) {
          // Dynamic Live Status Check
          let currentStatus = data.status;
          if (data.status === "scheduled" && new Date(data.startTime) <= now && new Date(data.endTime) > now) {
            currentStatus = "active";
          } else if (currentStatus === "active" && new Date(data.endTime) <= now && data.status !== "completed") {
            currentStatus = "locked"; // Voting time over, waiting for result
          }
          
          docs.push({ id: doc.id, ...data, dynamicStatus: currentStatus });
        }
      });
      setElections(docs);
    });

    // 2. Fetch User's Voting Receipts (To check if already voted)
    const fetchReceipts = async () => {
      const rQuery = query(collection(db, "election_receipts"), where("userId", "==", userData.id));
      const rSnap = await getDocs(rQuery);
      const votedIds = rSnap.docs.map(d => d.data().electionId);
      setVotedElections(votedIds);
      setLoading(false);
    };
    fetchReceipts();

    return () => unsubscribeElections();
  }, [userData]);

  if (loadingUser || loading) return <div className="min-h-[50vh] flex items-center justify-center"><Lock className="w-8 h-8 animate-pulse text-gray-400" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="bg-gray-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-[#007AFF]/30 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 text-xs font-bold uppercase tracking-widest mb-4">
            <ShieldCheck className="w-4 h-4 text-[#34C759]" /> Secure Voting Hub
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Cast Your Mandate</h1>
          <p className="text-gray-400 font-medium text-sm max-w-xl">
            Participate in democratic appointments and resolutions. Your vote is cryptographically sealed and 100% anonymous.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {elections.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50">
            <Vote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-gray-900 font-bold text-lg">No Active Elections</h3>
            <p className="text-sm text-gray-500 mt-1">There are no voting protocols active in your jurisdiction right now.</p>
          </div>
        ) : (
          elections.map((election, i) => {
            const hasVoted = votedElections.includes(election.id);
            const isLive = election.dynamicStatus === "active";
            const isUpcoming = election.dynamicStatus === "scheduled";
            
            return (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={election.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                {isLive && !hasVoted && <div className="absolute top-0 left-0 w-1.5 h-full bg-[#007AFF]"></div>}
                {hasVoted && <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>}

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {hasVoted ? (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Voted</span>
                    ) : isLive ? (
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase rounded border border-blue-200 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span> Live Now</span>
                    ) : isUpcoming ? (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase rounded border border-amber-200 flex items-center gap-1"><Clock className="w-3 h-3"/> Starts Soon</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase rounded border border-gray-200 flex items-center gap-1"><Lock className="w-3 h-3"/> Locked / Ended</span>
                    )}
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{election.type}</span>
                  </div>
                  
                  <h3 className="text-xl font-black text-gray-900 mb-1">{election.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-1 mb-3">{election.description}</p>
                  
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                    <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5"/> {election.locationDisplay}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> Ends: {new Date(election.endTime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>

                <div className="shrink-0 w-full md:w-auto">
                  {hasVoted || election.dynamicStatus === "locked" || election.status === "completed" ? (
                    <Link href={`/dashboard/voting/${election.id}`} className="w-full md:w-auto px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                      View Protocol Details <ChevronRight className="w-4 h-4" />
                    </Link>
                  ) : isLive ? (
                    <Link href={`/dashboard/voting/${election.id}`} className="w-full md:w-auto px-8 py-3.5 bg-[#007AFF] hover:bg-blue-600 text-white font-black rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                      Enter Voting Booth <ChevronRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <button disabled className="w-full md:w-auto px-8 py-3.5 bg-gray-100 text-gray-400 font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                      <Lock className="w-4 h-4" /> Booth Locked
                    </button>
                  )}
                </div>

              </motion.div>
            )
          })
        )}
      </div>
    </div>
  );
}