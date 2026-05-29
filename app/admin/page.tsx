// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Users, Wallet, MapPin, TrendingUp, RefreshCcw } from "lucide-react";
import Link from "next/link"; // Yeh import add kiya hai

interface Member {
  id: string;
  name: string;
  district: string;
  state: string;
  status: string;
  joinedAt: any;
}

export default function AdminDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const membersRef = collection(db, "members");
      const q = query(membersRef, where("status", "==", "active_member"), orderBy("joinedAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      const fetchedMembers: Member[] = [];
      querySnapshot.forEach((doc) => {
        fetchedMembers.push({ id: doc.id, ...doc.data() } as Member);
      });

      setTotalMembers(fetchedMembers.length);
      setMembers(fetchedMembers.slice(0, 5));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Live snapshot of the Alliance.</p>
        </div>
        <button onClick={fetchStats} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-all text-gray-600">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Citizens</h3>
              <Users className="w-5 h-5 text-[#007AFF]" />
            </div>
            <p className="text-4xl font-black text-gray-900">{loading ? "..." : totalMembers}</p>
            <p className="text-sm text-[#34C759] font-medium mt-2 flex items-center"><TrendingUp className="w-3 h-3 mr-1"/> Verified Only</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Alliance Funds</h3>
              <Wallet className="w-5 h-5 text-[#34C759]" />
            </div>
            <p className="text-4xl font-black text-gray-900">₹{loading ? "..." : (totalMembers * 20).toLocaleString()}</p>
            <p className="text-sm text-gray-500 font-medium mt-2">At ₹20 per membership pass</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Top Region</h3>
              <MapPin className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-gray-900 line-clamp-1">{loading ? "..." : "Bareilly"}</p>
            <p className="text-sm text-gray-500 font-medium mt-2">Highest active citizen count</p>
          </div>
        </div>
      </div>

      {/* RECENT CITIZENS TABLE */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-900">Recent Registrations</h3>
          
          {/* YAHAN LINK ADD KIYA HAI */}
          <Link href="/admin/members" className="text-sm font-semibold text-[#007AFF] hover:underline">
            View All Ledger &rarr;
          </Link>
          
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 bg-white">
                <th className="px-6 py-4 font-bold">Citizen Name</th>
                <th className="px-6 py-4 font-bold">Region</th>
                <th className="px-6 py-4 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-400">Syncing database...</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-400">No active members found.</td></tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{member.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{member.district}</p>
                      <p className="text-xs text-gray-500">{member.state}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-[10px] font-bold tracking-widest text-[#34C759] uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]"></span>
                        Verified
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}