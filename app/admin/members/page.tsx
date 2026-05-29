// app/admin/members/page.tsx
"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { collection, getDocs, query, orderBy, Timestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, Download, AlertCircle, CheckCircle2, ShieldCheck, X, Crown, Loader2, UserMinus } from "lucide-react";
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
  joinedAt: Timestamp | any;
}

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

function MembersLedgerContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  
  const [selectedMemberForPass, setSelectedMemberForPass] = useState<Member | null>(null);
  
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<Member | null>(null);
  const [assignLevel, setAssignLevel] = useState("District");
  const [assignTitle, setAssignTitle] = useState(POST_TITLES[0]);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

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
    if (!selectedMemberForRole) return;
    
    setIsUpdatingRole(true);

    let location = "India";
    if (assignLevel === "District") location = selectedMemberForRole.district;
    if (assignLevel === "State") location = selectedMemberForRole.state;

    const combinedRoleDisplay = assignLevel === "National" 
      ? `National ${assignTitle}` 
      : `${assignLevel} ${assignTitle}`;

    try {
      await updateDoc(doc(db, "members", selectedMemberForRole.id), {
        role: combinedRoleDisplay,
        roleLevel: assignLevel,
        roleTitle: assignTitle,
        roleLocation: location
      });
      
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
      await updateDoc(doc(db, "members", selectedMemberForRole.id), {
        role: null, roleLevel: null, roleTitle: null, roleLocation: null
      });
      
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
                <th className="px-6 py-5 font-bold">Status</th>
                <th className="px-6 py-5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm font-medium text-gray-400">Loading secure ledger...</td></tr>
              ) : filteredMembers.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm font-medium text-gray-400">No records found matching "{searchQuery}"</td></tr>
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
                          {member.role} ({member.roleLocation})
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">Citizen</p>
                      )}
                    </td>

                    <td className="px-6 py-4">
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
                              setAssignTitle(member.roleTitle || POST_TITLES[0]);
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
                      className="w-full mt-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:border-[#007AFF] outline-none shadow-sm"
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
                      className="w-full mt-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:border-[#007AFF] outline-none shadow-sm"
                    >
                      {POST_TITLES.map((title) => (
                        <option key={title} value={title}>{title}</option>
                      ))}
                    </select>
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
                    disabled={isUpdatingRole}
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