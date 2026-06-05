// app/dashboard/leaders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Award, Megaphone, Users, MapPin, ShieldCheck, Crown, Loader2, Globe, AlertTriangle, CheckSquare, Square, X, Clock, CheckCircle2, ChevronRight, CalendarDays, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, getDocs, query, where, addDoc, serverTimestamp, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser"; 
import { useRouter } from "next/navigation";

const POST_TITLES = [
  "President",
  "Working President",
  "Vice President",
  "General Secretary",
  "Secretary",
  "Chief Spokesperson",
  "Treasurer",
  "Executive Member"
];

export default function LocalLeadersPage() {
  const router = useRouter();
  const { userData, loadingUser } = useUser();
  const currentUser = userData ? { id: userData.id, name: userData.name, phone: userData.phone, role: userData.role } : null;
  const userDistrict = userData?.district || "India"; 
  const userState = userData?.state || "India";
  
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(true);

  const [isIntakeOpen, setIsIntakeOpen] = useState(true);
  const [applicationStatus, setApplicationStatus] = useState("none"); 
  
  const [showRules, setShowRules] = useState(false);
  const [showPostSelect, setShowPostSelect] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [applyLevel, setApplyLevel] = useState("District");
  const [applyTitle, setApplyTitle] = useState(POST_TITLES[0]);

  // Identify Current User's Hierarchy
  const myRole = (userData?.role || "").toLowerCase();
  const isNational = myRole.includes("national");
  const isState = myRole.includes("state");
  const isDistrict = myRole.includes("district");
  const isNormalMember = !isNational && !isState && !isDistrict;

  // FETCH LEADERS & SETTINGS
  useEffect(() => {
    if (!userData) return;
    const fetchLiveLeaders = async () => {
      try {
        const membersRef = collection(db, "members");
        // Only fetch non-members
        const q = query(membersRef, where("role", "!=", "member"));
        
        const querySnapshot = await getDocs(q);
        const fetchedLeaders: any[] = [];
        
        querySnapshot.forEach((document) => {
          const data = document.data();
          if (data.role === 'active_member') return; // Exclude ground cadre

          const leaderRole = (data.role || "").toLowerCase();
          
          // 🔥 STRICT HIERARCHY ISOLATION LOGIC 🔥
          if (isNational) {
            // National sees ONLY National leaders
            if (leaderRole.includes("national")) fetchedLeaders.push({ id: document.id, ...data });
          } 
          else if (isState) {
            // State sees ONLY State leaders of the SAME state
            if (leaderRole.includes("state") && data.state === userData.state) {
              fetchedLeaders.push({ id: document.id, ...data });
            }
          } 
          else if (isDistrict) {
            // District sees ONLY District leaders of the SAME district
            if (leaderRole.includes("district") && data.state === userData.state && data.district === userData.district) {
              fetchedLeaders.push({ id: document.id, ...data });
            }
          } 
          else if (isNormalMember) {
            // Member sees District Leaders of their district AND State Leaders of their state
            if (
              (leaderRole.includes("district") && data.state === userData.state && data.district === userData.district) ||
              (leaderRole.includes("state") && data.state === userData.state)
            ) {
              fetchedLeaders.push({ id: document.id, ...data });
            }
          }
        });

        fetchedLeaders.sort((a, b) => {
          // Fix sorting based on role presence since roleLevel might not be consistently accurate
          const roleA = (a.role || "").toLowerCase();
          const roleB = (b.role || "").toLowerCase();
          const weightA = roleA.includes("national") ? 1 : roleA.includes("state") ? 2 : 3;
          const weightB = roleB.includes("national") ? 1 : roleB.includes("state") ? 2 : 3;
          return weightA - weightB;
        });
        
        setLeaders(fetchedLeaders);
      } catch (error) {
        console.error("Error fetching leaders:", error);
      } finally {
        setLoadingLeaders(false);
      }
    };
    fetchLiveLeaders();

    const unsubscribeSettings = onSnapshot(doc(db, "settings", "applications"), (docSnap) => {
      if (docSnap.exists()) setIsIntakeOpen(docSnap.data().isOpen);
    });

    return () => unsubscribeSettings();
  }, [userData?.id, userDistrict, userState]);

  // SYNC APPLICATION
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "applications"), where("userId", "==", currentUser.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setApplicationStatus(snapshot.docs[0].data().status);
      }
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  const handleRulesAccept = () => {
    setShowRules(false);
    setShowPostSelect(true); 
  };

  const submitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSubmitting(true);

    const location = applyLevel === "District" ? userDistrict : applyLevel === "State" ? userState : "India";
    const requestedRole = `${applyLevel} ${applyTitle}`;

    try {
      await addDoc(collection(db, "applications"), {
        userId: currentUser.id, 
        name: currentUser.name, 
        phone: currentUser.phone,
        district: userDistrict, 
        state: userState, 
        status: "pending",
        appliedAt: serverTimestamp(), 
        requestedRole: requestedRole,
        messages: [
          { 
            id: 1, sender: "admin", 
            text: `Welcome to the DSA Leadership Screening.\n\nWe see you are applying for the post of *${requestedRole}* for ${location}.\n\nRemember, this is not just a title; it's a strict operational responsibility. Why do you believe you are the right fit for this specific post? Please provide details of any past social work.`, 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          }
        ]
      });
      router.push("/dashboard/chat");
    } catch (error) {
      alert("Failed to create application.");
      setIsSubmitting(false);
    }
  };

  const getLevelStyles = (roleStr: string) => {
    const r = (roleStr || "").toLowerCase();
    if (r.includes("national")) return { icon: Globe, color: "from-purple-600 to-indigo-700", bgLight: "bg-purple-50", textColor: "text-purple-700", label: "National Command" };
    if (r.includes("state")) return { icon: Crown, color: "from-blue-500 to-blue-700", bgLight: "bg-blue-50", textColor: "text-blue-700", label: "State Command" };
    return { icon: Award, color: "from-amber-500 to-orange-600", bgLight: "bg-orange-50", textColor: "text-orange-700", label: "District Command" };
  };

  if (loadingUser) return <div className="flex justify-center py-20 text-[#007AFF]"><Loader2 className="animate-spin w-8 h-8"/></div>;
  if (!userData) return <div className="text-center py-20 text-gray-500">Please log in.</div>;

  const hierarchyDisplay = isNational ? "National Command Matrix" 
                         : isState ? "State Command Directory" 
                         : isDistrict ? "District Command Directory" 
                         : "Local Jurisdiction Leaders";

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-12">
      
      {/* 🚀 PERSONAL LEADERSHIP POST WIDGET (ONLY FOR LEADERS) 🚀 */}
      {!isNormalMember && (
        <div className="bg-gradient-to-br from-[#007AFF] to-blue-700 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 border border-white/20 shadow-inner backdrop-blur-sm">
            <Award className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black mb-1">Your Active Commission</h2>
          <p className="text-blue-100 text-sm font-medium max-w-lg mb-6 leading-relaxed">
            You are actively serving the alliance framework. Uphold the constitution, guide your subordinate cadre, and lead with absolute integrity.
          </p>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 w-full max-w-2xl flex flex-col md:flex-row items-center justify-between gap-4 text-left">
            <div>
              <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest mb-1">Official Designation</p>
              <h3 className="text-xl font-black capitalize flex items-center gap-2">
                {userData.role?.replace(/_/g, ' ')} <ShieldCheck className="w-5 h-5 text-blue-300" />
              </h3>
            </div>
            <div className="h-10 w-px bg-white/20 hidden md:block"></div>
            <div>
              <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest mb-1">Active Jurisdiction</p>
              <p className="text-sm font-bold flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-300"/> {isNational ? "All India" : isState ? userData.state : `${userData.district}, ${userData.state}`}</p>
            </div>
            <div className="h-10 w-px bg-white/20 hidden md:block"></div>
            <div>
              <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest mb-1">Appointed On</p>
              <p className="text-sm font-bold flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-blue-300"/> {userData.appointedAt ? new Date(userData.appointedAt.toDate()).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : "Recently"}</p>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-4 md:pb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">{hierarchyDisplay}</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Official directory of authenticated leaders corresponding to your clearance level.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-gray-900 text-white rounded-lg md:rounded-xl w-max">
          <Users className="w-3 h-3 md:w-4 md:h-4 text-[#007AFF]" />
          <span className="text-xs md:text-sm font-bold">{leaders.length} Active Commanders</span>
        </div>
      </div>

      {/* LEADERS GRID */}
      {loadingLeaders ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#007AFF]"/></div>
      ) : leaders.length === 0 ? (
        <div className="bg-white border rounded-3xl p-12 text-center text-gray-500">No Leaders Assigned Yet in this Jurisdiction.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {leaders.map((leader) => {
            const styles = getLevelStyles(leader.role);
            const Icon = styles.icon;
            return (
              <motion.div key={leader.id} className="bg-white border border-gray-200 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className={`h-1.5 md:h-2 w-full bg-gradient-to-r ${styles.color}`}></div>
                <div className="p-5 md:p-6">
                  <div className="flex justify-between items-start mb-4 md:mb-6">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${styles.bgLight}`}><Icon className={`w-5 h-5 ${styles.textColor}`} /></div>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[9px] md:text-[10px] font-bold uppercase rounded-md border border-gray-200">{styles.label}</span>
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-gray-900 line-clamp-1">{leader.name}</h3>
                    <p className={`text-xs md:text-sm font-bold mt-0.5 capitalize ${styles.textColor}`}>{leader.role?.replace(/_/g, ' ')}</p>
                  </div>

                  <div className="space-y-3 pt-4 mt-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="line-clamp-1">{leader.role.includes("national") ? "All India" : leader.role.includes("state") ? leader.state : `${leader.district}, ${leader.state}`}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                      <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>Appointed: {leader.appointedAt ? new Date(leader.appointedAt.seconds * 1000).toLocaleDateString([], { year: 'numeric', month: 'short' }) : "Recently"}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* DYNAMIC APPLICATION CTA / APPOINTMENT VIEW (Only for members trying to apply) */}
      {isNormalMember && (
        <div className="mt-8 bg-white border border-gray-200 rounded-2xl md:rounded-3xl p-6 md:p-8 text-center shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            {(() => {
              if (applicationStatus === "pending") {
                return (
                  <>
                    <Award className="w-10 h-10 text-[#007AFF] mx-auto mb-4" />
                    <h3 className="text-lg md:text-xl font-black text-gray-900">Application in Progress</h3>
                    <p className="text-xs md:text-sm text-gray-500 mt-2 mb-6 max-w-lg mx-auto">
                      Your screening interview is active. The High Command is reviewing your profile.
                    </p>
                    <button onClick={() => router.push("/dashboard/chat")} className="px-6 py-3 bg-[#007AFF] text-white font-bold rounded-xl text-xs hover:bg-blue-600 shadow-md flex items-center justify-center gap-2 mx-auto">
                      <MessageSquare className="w-4 h-4" /> Go to Headquarters Chat
                    </button>
                  </>
                );
              }

              if (applicationStatus === "rejected") {
                 return (
                  <>
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-6 h-6" /></div>
                    <h3 className="text-lg md:text-xl font-black text-gray-900">Application Under Cooldown</h3>
                    <p className="text-xs md:text-sm text-gray-500 mt-2 mb-6 max-w-lg mx-auto">
                      Your application was reviewed but not approved. Keep working on the ground and re-apply in 90 days.
                    </p>
                    <button onClick={() => router.push("/dashboard/chat")} className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs border border-gray-200 hover:bg-gray-200 mx-auto">
                      View High Command Feedback
                    </button>
                  </>
                );
              }

              if (!isIntakeOpen) {
                return (
                  <>
                    <Clock className="w-10 h-10 text-orange-500 mx-auto mb-4" />
                    <h3 className="text-lg md:text-xl font-black text-gray-900">Leadership Intake Closed</h3>
                    <p className="text-xs md:text-sm text-gray-500 mt-2 max-w-lg mx-auto">
                      The High Command has currently paused new leadership applications in your region. Please wait for the next screening cycle.
                    </p>
                  </>
                );
              }

              return (
                <>
                  <Award className="w-10 h-10 text-[#007AFF] mx-auto mb-4" />
                  <h3 className="text-lg md:text-xl font-black text-gray-900">Want to join the leadership?</h3>
                  <p className="text-xs md:text-sm text-gray-500 mt-2 mb-6 max-w-lg mx-auto">
                    The alliance is looking for dedicated citizens. Apply for a post today.
                  </p>
                  <button onClick={() => setShowRules(true)} className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl text-xs md:text-sm hover:bg-black shadow-md mx-auto">
                    View Eligibility & Apply
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* 1. ELIGIBILITY RULES MODAL */}
      <AnimatePresence>
        {showRules && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-2xl md:rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh]">
              <div className="bg-gray-900 text-white p-4 md:p-6 flex justify-between items-center shrink-0">
                <h3 className="text-base md:text-xl font-black">Official Eligibility Protocol</h3>
                <button onClick={() => {setShowRules(false); setAgreed(false);}} className="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
              </div>
              
              <div className="p-4 md:p-8 space-y-4 md:space-y-6 overflow-y-auto flex-1">
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex gap-2 text-red-800">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-xs md:text-sm font-semibold">Leadership in DSA is a strict operational duty, not a social media badge. Read the 10 constitutional rules carefully.</p>
                </div>
                
                <div className="space-y-4">
                  {[
                    { title: "Active Ground Participation", desc: "You must physically organize and lead regional meetings, protests, and social drives." },
                    { title: "Zero 'Sleeping Members' Policy", desc: "Inactivity for more than 14 days without prior High Command notice will result in immediate suspension." },
                    { title: "Chain of Command", desc: "You must report directly to your higher hierarchy officials and maintain absolute discipline." },
                    { title: "Monthly Field Reports", desc: "Mandatory submission of monthly progress, photos, and ground-work proof to the Headquarters." },
                    { title: "Financial Transparency", desc: "Absolute honesty regarding any funds raised locally. Zero tolerance for corruption." },
                    { title: "Ethical Conduct", desc: "No hate speech, violence, or criminal activity. Always uphold democratic values." },
                    { title: "Rapid Action Protocol", desc: "Must be able to mobilize local teams within 24 hours of receiving HQ alerts." },
                    { title: "Citizen Recruitment", desc: "You are responsible for scaling the alliance by actively adding verified citizens from your region." },
                    { title: "Non-Partisan Actions", desc: "You cannot publicly endorse or campaign for other political outfits while holding a DSA post." },
                    { title: "Termination Clause", desc: "High command reserves the right to terminate the post without prior notice for constitutional violations." }
                  ].map((rule, idx) => (
                    <div key={idx} className="flex gap-3 items-start bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="w-6 h-6 rounded-full bg-[#007AFF] text-white flex items-center justify-center shrink-0 font-bold text-[10px]">{idx + 1}</div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-xs md:text-sm">{rule.title}</h4>
                        <p className="text-[11px] md:text-xs text-gray-500 mt-0.5 leading-relaxed">{rule.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-start gap-2 cursor-pointer bg-blue-50 p-4 rounded-xl border border-blue-100" onClick={() => setAgreed(!agreed)}>
                    {agreed ? <CheckSquare className="w-5 h-5 text-[#007AFF] shrink-0" /> : <Square className="w-5 h-5 text-gray-400 shrink-0" />}
                    <p className="text-xs md:text-sm font-bold text-blue-900 select-none">
                      I have read all 10 constitutional rules. I agree to the terms and am ready to take full responsibility.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                <button 
                  disabled={!agreed} 
                  onClick={handleRulesAccept} 
                  className="w-full py-3.5 md:py-4 bg-[#007AFF] text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Proceed to Select Post <ChevronRight className="w-4 h-4"/>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. POST SELECTION MODAL */}
      <AnimatePresence>
        {showPostSelect && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-2xl md:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
              <div className="bg-gray-50 border-b border-gray-100 p-4 md:p-6 flex justify-between items-start shrink-0">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900">Select Desired Post</h3>
                  <p className="text-xs md:text-sm text-gray-500 mt-1">What post are you applying for?</p>
                </div>
                <button onClick={() => setShowPostSelect(false)} className="p-1.5 md:p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><X className="w-4 h-4 md:w-5 h-5" /></button>
              </div>
              
              <form onSubmit={submitApplication} className="p-4 md:p-6 space-y-4 md:space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Applying At Level</label>
                    <select value={applyLevel} onChange={(e) => setApplyLevel(e.target.value)} className="w-full mt-1 px-3 py-2.5 md:px-4 md:py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:border-[#007AFF] outline-none shadow-sm">
                      <option value="District">District ({userDistrict})</option>
                      <option value="State">State ({userState})</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Official Post Title</label>
                    <select value={applyTitle} onChange={(e) => setApplyTitle(e.target.value)} className="w-full mt-1 px-3 py-2.5 md:px-4 md:py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:border-[#007AFF] outline-none shadow-sm">
                      {POST_TITLES.map((title) => <option key={title} value={title}>{title}</option>)}
                    </select>
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                  {isSubmitting ? "Processing..." : "Start Screening Chat"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}