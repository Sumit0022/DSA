// app/dashboard/progress/page.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { Trophy, Medal, Star, TrendingUp, Target, Loader2, Crown, Zap, Flame, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VanguardMember {
  id: string;
  name: string;
  points: number;
  roleTitle?: string;
  role?: string;
}

export default function VanguardProgressPage() {
  const { userData, loadingUser } = useUser();
  const [topMembers, setTopMembers] = useState<VanguardMember[]>([]);
  const [loading, setLoading] = useState(true);

  const userDistrict = userData?.district || "India";
  const userPoints = userData?.points || 0;

  useEffect(() => {
    if (!userData || !userData.district) return;

    const membersRef = collection(db, "members");
    // Fetch Top 100 members in the same district, ordered by points
    const q = query(
      membersRef, 
      where("district", "==", userData.district),
      orderBy("points", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: VanguardMember[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Only include people who actually have points to avoid showing 0-point ties randomly
        if (data.points && data.points > 0) {
          docs.push({ 
            id: doc.id, 
            name: data.name, 
            points: data.points,
            roleTitle: data.roleTitle,
            role: data.role
          });
        }
      });
      setTopMembers(docs);
      setLoading(false);
    }, (error) => {
      console.error("Leaderboard fetch error (Might need Firebase Index):", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData]);

  if (loadingUser || loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#007AFF]" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Compiling Vanguard Ranks...</p>
      </div>
    );
  }

  if (!userData) return null;

  // Separate Top 3 from the rest
  const top3 = topMembers.slice(0, 3);
  const theRest = topMembers.slice(3, 100);

  // Check if current user is in Top 100
  const myRankIndex = topMembers.findIndex(m => m.id === userData.id);
  const isInTop100 = myRankIndex !== -1;
  const myActualRank = isInTop100 ? myRankIndex + 1 : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* ─── HEADER ─── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center relative z-10 pt-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#007AFF] text-[10px] font-black uppercase tracking-widest mb-3 shadow-sm">
          <Target className="w-3 h-3" /> Jurisdiction: {userDistrict}
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight uppercase">The Vanguard</h1>
        <p className="text-sm text-gray-500 font-medium mt-2 max-w-lg mx-auto">
          Top 100 operational leaders and citizens in your district. Earn action points by participating in ground operations and digital meetings.
        </p>
      </motion.div>

      {topMembers.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center relative z-10 shadow-sm">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-gray-900">Leaderboard Empty</h3>
          <p className="text-sm text-gray-500 mt-1">Be the first in your district to attend a meeting and secure the #1 rank!</p>
        </div>
      ) : (
        <>
          {/* ─── OLYMPIC PODIUM (TOP 3) ─── */}
          <div className="relative z-10 pt-10 pb-8 px-4 flex justify-center items-end gap-2 md:gap-6 min-h-[320px]">
            
            {/* Rank 2 - Silver */}
            {top3[1] && (
              <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center w-28 md:w-36">
                <div className="relative flex flex-col items-center mb-4">
                  <div className={`w-14 h-14 md:w-20 md:h-20 rounded-full border-4 ${top3[1].id === userData.id ? 'border-[#007AFF] shadow-[0_0_20px_rgba(0,122,255,0.5)]' : 'border-gray-200'} bg-gradient-to-tr from-gray-100 to-gray-300 flex items-center justify-center text-gray-600 text-xl md:text-3xl font-black shadow-xl z-20`}>
                    {top3[1].name.charAt(0)}
                  </div>
                  <div className="bg-white shadow-lg rounded-xl px-2 py-1.5 md:px-3 text-center -mt-4 z-30 border border-gray-100 w-[110%]">
                    <p className="text-[10px] md:text-xs font-black text-gray-900 truncate">{top3[1].name}</p>
                    <p className="text-[9px] md:text-[10px] font-bold text-[#007AFF] mt-0.5">{top3[1].points} PTS</p>
                  </div>
                </div>
                <div className="w-full h-32 md:h-40 bg-gradient-to-t from-gray-300 to-gray-100 rounded-t-2xl border-t border-x border-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex justify-center pt-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
                  <h2 className="text-4xl md:text-5xl font-black text-gray-400 drop-shadow-md">2</h2>
                </div>
              </motion.div>
            )}

            {/* Rank 1 - Gold */}
            {top3[0] && (
              <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col items-center w-32 md:w-44 z-20">
                <Crown className="w-8 h-8 md:w-10 md:h-10 text-amber-400 mb-2 drop-shadow-lg animate-bounce" />
                <div className="relative flex flex-col items-center mb-4">
                  <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full border-4 ${top3[0].id === userData.id ? 'border-[#007AFF] shadow-[0_0_30px_rgba(0,122,255,0.6)]' : 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]'} bg-gradient-to-tr from-amber-200 to-amber-500 flex items-center justify-center text-amber-900 text-3xl md:text-5xl font-black z-20`}>
                    {top3[0].name.charAt(0)}
                  </div>
                  <div className="bg-white shadow-xl rounded-xl px-3 py-2 md:px-4 md:py-2.5 text-center -mt-5 z-30 border border-amber-100 w-[115%]">
                    <p className="text-[11px] md:text-sm font-black text-gray-900 truncate">{top3[0].name}</p>
                    <p className="text-[10px] md:text-xs font-black text-amber-600 mt-0.5 flex items-center justify-center gap-1"><Flame className="w-3 h-3"/> {top3[0].points} PTS</p>
                  </div>
                </div>
                <div className="w-full h-44 md:h-56 bg-gradient-to-t from-amber-400 to-amber-200 rounded-t-3xl border-t-2 border-x-2 border-amber-100 shadow-[0_-10px_50px_rgba(251,191,36,0.3)] flex justify-center pt-5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30 mix-blend-overlay"></div>
                  <h2 className="text-5xl md:text-7xl font-black text-amber-600 drop-shadow-lg">1</h2>
                </div>
              </motion.div>
            )}

            {/* Rank 3 - Bronze */}
            {top3[2] && (
              <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col items-center w-28 md:w-36">
                <div className="relative flex flex-col items-center mb-4">
                  <div className={`w-14 h-14 md:w-20 md:h-20 rounded-full border-4 ${top3[2].id === userData.id ? 'border-[#007AFF] shadow-[0_0_20px_rgba(0,122,255,0.5)]' : 'border-orange-300'} bg-gradient-to-tr from-orange-300 to-orange-500 flex items-center justify-center text-orange-900 text-xl md:text-3xl font-black shadow-xl z-20`}>
                    {top3[2].name.charAt(0)}
                  </div>
                  <div className="bg-white shadow-lg rounded-xl px-2 py-1.5 md:px-3 text-center -mt-4 z-30 border border-orange-100 w-[110%]">
                    <p className="text-[10px] md:text-xs font-black text-gray-900 truncate">{top3[2].name}</p>
                    <p className="text-[9px] md:text-[10px] font-bold text-orange-600 mt-0.5">{top3[2].points} PTS</p>
                  </div>
                </div>
                <div className="w-full h-24 md:h-32 bg-gradient-to-t from-orange-400 to-orange-200 rounded-t-2xl border-t border-x border-orange-100 shadow-[0_-10px_40px_rgba(234,88,12,0.15)] flex justify-center pt-3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
                  <h2 className="text-3xl md:text-4xl font-black text-orange-700 drop-shadow-md">3</h2>
                </div>
              </motion.div>
            )}
          </div>

          {/* ─── THE VANGUARD LIST (RANK 4-100) ─── */}
          {theRest.length > 0 && (
            <div className="relative z-10 bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden mt-8">
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-gray-400" />
                <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">The Vanguard (Ranks 4-100)</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {theRest.map((member, index) => {
                  const actualRank = index + 4;
                  const isMe = member.id === userData.id;

                  return (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
                      key={member.id} 
                      className={`flex items-center justify-between p-4 sm:p-5 transition-colors ${isMe ? 'bg-blue-50/80 border-l-4 border-[#007AFF]' : 'hover:bg-gray-50/50 border-l-4 border-transparent'}`}
                    >
                      <div className="flex items-center gap-4 sm:gap-6">
                        <span className={`w-8 text-center font-black ${isMe ? 'text-[#007AFF]' : 'text-gray-400'}`}>
                          #{actualRank}
                        </span>
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shadow-sm ${isMe ? 'bg-[#007AFF] text-white' : 'bg-gray-100 text-gray-600'}`}>
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className={`text-sm sm:text-base font-bold flex items-center gap-2 ${isMe ? 'text-[#007AFF]' : 'text-gray-900'}`}>
                              {member.name} {isMe && <span className="text-[9px] bg-[#007AFF] text-white px-1.5 py-0.5 rounded uppercase tracking-wider">You</span>}
                            </h4>
                            <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase mt-0.5">{member.roleTitle || member.role?.replace(/_/g, ' ') || 'Citizen'}</p>
                          </div>
                        </div>
                      </div>
                      <div className={`text-right ${isMe ? 'text-[#007AFF]' : 'text-gray-600'}`}>
                        <p className="text-base sm:text-lg font-black">{member.points}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">Points</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── MOTIVATION / CURRENT STATUS CARD ─── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className={`fixed bottom-0 left-0 right-0 md:relative md:bottom-auto z-50 md:z-10 p-4 md:p-0 md:mt-8`}
      >
        <div className={`rounded-3xl p-5 md:p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 border ${isInTop100 ? 'bg-gradient-to-r from-emerald-500 to-teal-600 border-emerald-400 text-white' : 'bg-gray-900 border-gray-800 text-white'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isInTop100 ? 'bg-white/20' : 'bg-white/10'}`}>
              {isInTop100 ? <Star className="w-6 h-6 text-white" /> : <Zap className="w-6 h-6 text-yellow-400" />}
            </div>
            <div>
              <h4 className="text-sm font-bold opacity-80 uppercase tracking-widest">Your Current Standing</h4>
              <h2 className="text-xl md:text-2xl font-black mt-0.5 flex items-center gap-2">
                {userPoints} Action Points 
                {isInTop100 && <span className="text-sm bg-white/20 px-2 py-1 rounded-lg">Rank #{myActualRank}</span>}
              </h2>
            </div>
          </div>
          
          <div className="text-center sm:text-right">
            {isInTop100 ? (
              <p className="text-xs md:text-sm font-medium text-emerald-50 max-w-xs leading-relaxed">
                You are in the Vanguard! Keep attending operations to defend your rank and climb higher.
              </p>
            ) : (
              <p className="text-xs md:text-sm font-medium text-gray-400 max-w-xs leading-relaxed">
                You are currently <strong className="text-white">Not Ranked</strong>. Attend official ground operations and digital meetings to secure your place in the Top 100.
              </p>
            )}
          </div>
        </div>
      </motion.div>

    </div>
  );
}