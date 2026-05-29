// app/admin/settings/page.tsx
"use client";

import { useState } from "react";
import { Shield, CreditCard, Key, Users, Sliders, Save, CheckCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export default function SystemSettings() {
  const [membershipFee, setMembershipFee] = useState("20");
  const [currency, setCurrency] = useState("INR");
  const [isSaving, setIsSaving] = useState(false);

  // Role-Based Access Control State
  const [adminUsers, setAdminUsers] = useState([
    { id: 1, name: "Sumit Singh", role: "Super Admin", region: "National" },
    { id: 2, name: "Lakshya Gangwar", role: "State Leader", region: "Uttar Pradesh" },
    { id: 3, name: "Rohit Singh", role: "Editor / Author", region: "Bareilly District" },
  ]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert("Configuration updated successfully across the core system!");
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">System Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure core portal rules, finances, and team access.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LEFT & CENTER NAVIGATION COLUMN: SETTINGS PANELS */}
        <div className="md:col-span-2 space-y-6">
          
          {/* FINANCIAL CONFIGURATION */}
          <form onSubmit={handleSaveSettings} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-2">
              <CreditCard className="w-5 h-5 text-[#007AFF]" />
              <h3 className="font-bold text-gray-900">Membership & Fee Rules</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pass Registration Fee</label>
                <div className="flex mt-1">
                  <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-sm font-semibold text-gray-500">₹</span>
                  <input 
                    type="number" 
                    value={membershipFee}
                    onChange={(e) => setMembershipFee(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-r-xl bg-gray-50 border border-gray-200 focus:border-[#007AFF] focus:bg-white outline-none text-sm font-medium transition-all" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Base Currency</label>
                <select 
                  value={currency} 
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:border-[#007AFF] focus:bg-white outline-none transition-all mt-1"
                >
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-sm disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? "Saving..." : "Apply Financials"}
              </button>
            </div>
          </form>

          {/* ROLE-BASED ACCESS CONTROL (RBAC) */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#34C759]" />
                <h3 className="font-bold text-gray-900">Access Control & Permissions</h3>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 shadow-xs transition-all">
                <Users className="w-3.5 h-3.5" /> Invite User
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 bg-white">
                    <th className="px-6 py-4 font-bold">Admin User</th>
                    <th className="px-6 py-4 font-bold">Assigned Role</th>
                    <th className="px-6 py-4 font-bold">Jurisdiction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {adminUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{user.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          user.role === 'Super Admin' ? 'bg-purple-50 text-purple-700' :
                          user.role === 'State Leader' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-500">{user.region}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: API PLUGINS & SECURITY RULES */}
        <div className="space-y-6">
          
          {/* GATEWAY STATUS */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2">
              <Key className="w-5 h-5 text-purple-500" />
              <h3 className="font-bold text-gray-900">Integration Vault</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-900">Razorpay API</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Live Gateway Engine</p>
                </div>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34C759] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34C759]"></span>
                </span>
              </div>

              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-900">Firebase Auth</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">OTP SMS Whitelist Policy</p>
                </div>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34C759] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34C759]"></span>
                </span>
              </div>
            </div>
          </div>

          {/* ENGINE METRICS POLICY */}
          <div className="bg-gradient-to-tr from-gray-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <Sliders className="w-5 h-5 text-[#007AFF]" />
              <h3 className="font-bold">Security Directive</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              All financial changes require explicit cryptographic verification. Changes to registration fees apply immediately to the webhook router endpoints.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}