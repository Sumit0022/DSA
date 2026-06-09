// app/admin/members/page.tsx
"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { collection, getDocs, query, orderBy, Timestamp, doc, updateDoc, deleteDoc, getDoc, onSnapshot, where, serverTimestamp, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, Download, AlertCircle, CheckCircle2, ShieldCheck, X, Crown, Loader2, UserMinus, Trash2, AlertTriangle, Star } from "lucide-react";
import DigitalPass from "@/components/DigitalPass";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation"; 

interface Member {
  id: string;
  name: string;
  phone: string;
  email?: string;
  district: string;
  state: string;
  status: string;
  memberId?: string;
  role?: string; 
  roleLevel?: string;
  roleTitle?: string;
  roleLocation?: string;
  points?: number; // 🔥 Points logic added
  joinedAt: Timestamp | any;
}

function MembersLedgerContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  
  const [selectedMemberForPass, setSelectedMemberForPass] = useState<Member | null>(null);
  
  // ROLE ASSIGNMENT STATES
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<Member | null>(null);
  const [assignLevel, setAssignLevel] = useState("District");
  const [assignTitle, setAssignTitle] = useState("");
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // DELETE MEMBER STATES
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 🔥 NEW STATES FOR DYNAMIC HIERARCHY & VACANCY 🔥
  const [hierarchyData, setHierarchyData] = useState<any>(null);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [vacancyData, setVacancyData] = useState<{title: string, maxLimit: number, filled: number, isAvailable: boolean}[]>([]);

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

  // FETCH DYNAMIC HIERARCHY TITLES
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

  // FETCH ALL LEADERS TO CALCULATE VACANCY
  useEffect(() => {
    const membersRef = collection(db, "members");
    const q = query(membersRef, where("role", "!=", "member"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
      // Filter out non-leaders just in case
      setLeaders(docs.filter(d => d.role !== "active_member" && d.roleLevel));
    });
    return () => unsubscribe();
  }, []);

  // CALCULATE VACANCY FOR SELECTED LEVEL & MEMBER
  useEffect(() => {
    if (hierarchyData && hierarchyData[assignLevel] && selectedMemberForRole) {
      const tiers = hierarchyData[assignLevel];
      const computedVacancies: any[] = [];
      
      const targetState = selectedMemberForRole.state;
      const targetDistrict = selectedMemberForRole.district;

      tiers.forEach((tier: any) => {
        if (tier.titles) {
          tier.titles.forEach((t: any) => {
            // Count filled posts based on exact level and region
            const filledCount = leaders.filter((l: any) => {
              const levelMatch = l.roleLevel === assignLevel;
              const titleMatch = l.roleTitle === t.title;
              const regionMatch = assignLevel === "National" 
                                  ? true 
                                  : assignLevel === "State" 
                                      ? l.state === targetState 
                                      : l.state === targetState && l.district === targetDistrict;
              
              return levelMatch && titleMatch && regionMatch;
            }).length;
            
            const max = t.maxLimit || 1;
            computedVacancies.push({
              title: t.title,
              maxLimit: max,
              filled: filledCount,
              isAvailable: filledCount < max
            });
          });
        }
      });
      setVacancyData(computedVacancies);
      
      // Auto-select the first available title
      const available = computedVacancies.filter(v => v.isAvailable);
      if (available.length > 0 && !available.find(v => v.title === assignTitle)) {
        setAssignTitle(available[0].title);
      } else if (available.length === 0) {
        setAssignTitle("");
      }
    }
  }, [hierarchyData, assignLevel, selectedMemberForRole, leaders]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const membersRef = collection(db, "members");
      const q = query(membersRef, orderBy("joinedAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      const fetchedMembers: Member[] = [];
      querySnapshot.forEach((doc) => {
        fetchedMembers.push({ id: doc.id, ...doc.data() } as Member);
      });
      setMembers(fetchedMembers);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    const q = searchParams.get("search");
    if (q !== null) setSearchQuery(q);
  }, [searchParams]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    const lowerQuery = searchQuery.toLowerCase();
    return members.filter((m) => 
      m.name?.toLowerCase().includes(lowerQuery) ||
      m.phone?.includes(lowerQuery) ||
      m.district?.toLowerCase().includes(lowerQuery) ||
      m.memberId?.toLowerCase().includes(lowerQuery) ||
      m.role?.toLowerCase().includes(lowerQuery)
    );
  }, [members, searchQuery]);

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForRole || !assignTitle) return;
    
    setIsUpdatingRole(true);

    let location = "India";
    if (assignLevel === "District") location = selectedMemberForRole.district;
    if (assignLevel === "State") location = selectedMemberForRole.state;

    const combinedRoleDisplay = assignTitle.toLowerCase().includes(assignLevel.toLowerCase()) 
  ? assignTitle 
  : assignLevel === "National" ? `National ${assignTitle}` : `${assignLevel} ${assignTitle}`;

    try {
      await updateDoc(doc(db, "members", selectedMemberForRole.id), {
        role: combinedRoleDisplay,
        roleLevel: assignLevel,
        roleTitle: assignTitle,
        roleLocation: location,
        appointmentDate: serverTimestamp(),
        termYears: 2 // Default term assign from ledger
      });
      
      // 🔥 Dispatch Notification for Appointment 🔥
      await sendNotification(
        selectedMemberForRole.id, 
        "Official Appointment Confirmed", 
        `You have been officially appointed as the ${combinedRoleDisplay}. Please review your workspace for operational directives.`, 
        "success"
      );

      setMembers(members.map(m => 
        m.id === selectedMemberForRole.id 
          ? { ...m, role: combinedRoleDisplay, roleLevel: assignLevel, roleTitle: assignTitle, roleLocation: location } 
          : m
      ));
      
      setSelectedMemberForRole(null);
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to assign role.");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleRemoveRole = async () => {
    if (!selectedMemberForRole) return;
    setIsUpdatingRole(true);
    
    try {
      const pastRole = selectedMemberForRole.role || selectedMemberForRole.roleTitle;

      await updateDoc(doc(db, "members", selectedMemberForRole.id), {
        role: null, roleLevel: null, roleTitle: null, roleLocation: null, appointmentDate: null, termYears: null
      });
      
      // 🔥 Dispatch Notification for Removal 🔥
      await sendNotification(
        selectedMemberForRole.id, 
        "Command Clearance Revoked", 
        `Your assignment as ${pastRole} has been terminated by the High Command. Your access to the leadership workspace is now restricted.`, 
        "alert"
      );

      setMembers(members.map(m => 
        m.id === selectedMemberForRole.id 
          ? { ...m, role: undefined, roleLevel: undefined, roleTitle: undefined, roleLocation: undefined } 
          : m
      ));
      
      setSelectedMemberForRole(null);
    } catch (error) {
      console.error("Error removing role:", error);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // 🔥 DELETE MEMBER LOGIC 🔥
  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "members", memberToDelete.id));
      setMembers(members.filter(m => m.id !== memberToDelete.id));
      setMemberToDelete(null);
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Failed to wipe member records.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Citizens Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">Immutable record of all alliance members.</p>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors shadow-sm w-max">
          <Download className="w-4 h-4" /> Export CSV (Audit)
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search by Name, Phone, Region, Member ID, or Post..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm text-sm focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/10 outline-none transition-all placeholder:text-gray-400 font-medium"
        />
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 bg-gray-50/50">
                <th className="px-6 py-5 font-bold">Identity</th>
                <th className="px-6 py-5 font-bold">Contact</th>
                <th className="px-6 py-5 font-bold">Region & Post</th>
                {/* 🔥 POINTS ADDED TO TABLE HEADER 🔥 */}
                <th className="px-6 py-5 font-bold text-center">Action Pts</th>
                <th className="px-6 py-5 font-bold text-center">Status</th>
                <th className="px-6 py-5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm font-medium text-gray-400">Loading secure ledger...</td></tr>
              ) : filteredMembers.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm font-medium text-gray-400">No records found matching "{searchQuery}"</td></tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors group">
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900">{member.name}</p>
                        {member.role && (
                          <span title="Alliance Leader">
                            <Crown className="w-4 h-4 text-amber-500" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-gray-500 mt-0.5">{member.memberId || "Pending ID"}</p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-700">+91 {member.phone}</p>
                      {member.email && <p className="text-xs text-gray-500 mt-0.5">{member.email}</p>}
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">{member.district}, {member.state}</p>
                      {member.role ? (
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1 bg-amber-50 inline-block px-2 py-0.5 rounded-sm border border-amber-100/50">
                          {member.roleTitle || member.role} ({member.roleLocation})
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">Citizen</p>
                      )}
                    </td>

                    {/* 🔥 POINTS VALUE RENDERED 🔥 */}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 text-xs">
                        <Star className="w-3.5 h-3.5 fill-amber-500" /> {member.points || 0}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {member.status === "active_member" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-[10px] font-bold tracking-widest text-[#34C759] uppercase border border-green-100/50">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : member.status === "payment_failed" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-[10px] font-bold tracking-widest text-red-500 uppercase border border-red-100/50">
                          <AlertCircle className="w-3 h-3" /> Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-50 text-[10px] font-bold tracking-widest text-orange-500 uppercase border border-orange-100/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span> Pending
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      {member.status === "active_member" && (
                        <>
                          <button 
                            onClick={() => {
                              setSelectedMemberForRole(member);
                              setAssignLevel(member.roleLevel || "District");
                              setAssignTitle(member.roleTitle || "");
                            }}
                            className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Assign Hierarchy Role"
                          >
                            <Crown className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => setSelectedMemberForPass(member)}
                            className="p-2 text-gray-400 hover:text-[#007AFF] hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="View Freedom Pass"
                          >
                            <ShieldCheck className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => setMemberToDelete(member)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Delete Citizen Record"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedMemberForPass && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="min-h-full flex items-center justify-center p-4 py-12 relative">
              <div className="absolute inset-0 z-0" onClick={() => setSelectedMemberForPass(null)} />
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="relative z-10 w-full max-w-sm flex flex-col items-center">
                <button onClick={() => setSelectedMemberForPass(null)} className="absolute -top-12 md:-right-12 right-0 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md border border-white/20 shadow-xl">
                  <X className="w-5 h-5" />
                </button>
                <DigitalPass name={selectedMemberForPass.name} state={selectedMemberForPass.state} district={selectedMemberForPass.district} memberId={selectedMemberForPass.memberId || "PENDING"} />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedMemberForRole && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
              
              <div className="bg-gray-50 border-b border-gray-100 p-6 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Assign Hierarchy Post</h3>
                  <p className="text-sm text-gray-500 mt-1">Select jurisdiction and post for {selectedMemberForRole.name}.</p>
                </div>
                <button onClick={() => setSelectedMemberForRole(null)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAssignRole} className="p-6 space-y-5">
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Jurisdiction Level</label>
                    <select 
                      value={assignLevel} 
                      onChange={(e) => setAssignLevel(e.target.value)}
                      className="w-full mt-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:border-[#007AFF] outline-none shadow-sm text-gray-900"
                    >
                      <option value="District">District Level ({selectedMemberForRole.district})</option>
                      <option value="State">State Level ({selectedMemberForRole.state})</option>
                      <option value="National">National Command (India)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Official Post</label>
                    <select 
                      value={assignTitle} 
                      onChange={(e) => setAssignTitle(e.target.value)}
                      className={`w-full mt-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none shadow-sm text-gray-900 ${vacancyData.length > 0 && vacancyData.every(v => !v.isAvailable) ? 'opacity-60 cursor-not-allowed' : 'focus:border-[#007AFF]'}`}
                    >
                      {vacancyData.length > 0 ? (
                        vacancyData.map((v) => (
                          <option key={v.title} value={v.title} disabled={!v.isAvailable}>
                            {v.title} {v.isAvailable ? `(${v.filled}/${v.maxLimit} Filled)` : `(No Vacancy - Full)`}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No posts defined for this tier.</option>
                      )}
                    </select>
                    
                    {/* RED ALERT FOR FULL POSTS */}
                    {vacancyData.length > 0 && vacancyData.every(v => !v.isAvailable) && (
                      <div className="mt-3 flex items-start gap-1.5 p-3 bg-red-50 border border-red-100 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        <p className="text-[11px] text-red-700 font-bold leading-tight uppercase tracking-wider">
                          All posts in this jurisdiction are currently occupied. Cannot assign new roles.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                  <Crown className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 font-medium">
                    This citizen will be officially appointed as the <strong>{assignLevel === "National" ? "National" : assignLevel} {assignTitle}</strong>.
                  </p>
                </div>

                <div className="flex gap-3">
                  {selectedMemberForRole.role && (
                    <button 
                      type="button"
                      onClick={handleRemoveRole}
                      disabled={isUpdatingRole}
                      className="w-14 py-3.5 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors"
                      title="Revoke Role"
                    >
                      <UserMinus className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    type="submit" 
                    disabled={isUpdatingRole || !assignTitle || (vacancyData.length > 0 && vacancyData.every(v => !v.isAvailable))}
                    className="flex-1 py-3.5 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUpdatingRole ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crown className="w-5 h-5" />}
                    {isUpdatingRole ? "Processing..." : "Confirm Appointment"}
                  </button>
                </div>
              </form>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔥 DELETE CONFIRMATION MODAL 🔥 */}
      <AnimatePresence>
        {memberToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Delete Citizen Record?</h2>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                You are about to permanently delete <strong>{memberToDelete.name}</strong> from the database. This action cannot be reversed.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setMemberToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteMember}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Forever"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// 4. Wrap with Suspense for Vercel
export default function MembersLedger() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading ledger...</div>}>
      <MembersLedgerContent />
    </Suspense>
  );
}