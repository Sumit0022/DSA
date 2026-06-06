"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  CreditCard, Key, Sliders, Save, CheckCircle2, Eye, EyeOff,
  Loader2, Server, Lock, AlertTriangle, X, Mail, GitMerge,
  ShieldAlert, Zap, ChevronRight, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function SystemSettings() {
  const [loading, setLoading] = useState(true);

  const [membershipFee, setMembershipFee] = useState("");
  const [isSavingFinances, setIsSavingFinances] = useState(false);

  const [razorpayId, setRazorpayId] = useState("");
  const [razorpaySecret, setRazorpaySecret] = useState("");
  const [resendKey, setResendKey] = useState("");
  const [isSavingApis, setIsSavingApis] = useState(false);

  const [showRzpSecret, setShowRzpSecret] = useState(false);
  const [showResendKey, setShowResendKey] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | null }>({ message: "", type: null });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: null }), 4000);
  };

  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const settingsRef = doc(db, "settings", "core_config");
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setMembershipFee(data.membershipFee || "20");
          setRazorpayId(data.razorpayId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "");
          setRazorpaySecret(data.razorpaySecret || "");
          setResendKey(data.resendKey || "");
        } else {
          await setDoc(settingsRef, {
            membershipFee: "20",
            razorpayId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
            razorpaySecret: "",
            resendKey: ""
          });
          setMembershipFee("20");
        }
      } catch (error) {
        console.error("Error fetching system configurations:", error);
        showToast("Failed to sync live configurations from database.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchSystemData();
  }, []);

  const handleSaveFinancials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFinances(true);
    try {
      await updateDoc(doc(db, "settings", "core_config"), { membershipFee });
      showToast("Financial rules updated successfully across the network.", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to update financial parameters.", "error");
    } finally {
      setIsSavingFinances(false);
    }
  };

  const handleSaveApis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingApis(true);
    try {
      await updateDoc(doc(db, "settings", "core_config"), { razorpayId, razorpaySecret, resendKey });
      showToast("API Vault successfully updated.", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to update API Vault.", "error");
    } finally {
      setIsSavingApis(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#007AFF]" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">Loading Configuration</p>
          <p className="text-xs text-gray-400 mt-0.5">Fetching live system settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-1 pb-16 space-y-5 relative">

      {/* TOAST */}
      <AnimatePresence>
        {toast.type && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`fixed bottom-6 right-6 z-[500] flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-lg text-sm max-w-xs border ${
              toast.type === "success"
                ? "bg-gray-950 text-white border-gray-800"
                : "bg-white text-red-600 border-red-100 shadow-red-100"
            }`}
          >
            {toast.type === "success"
              ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              : <ShieldAlert className="w-4 h-4 shrink-0" />
            }
            <p className="font-medium leading-snug flex-1">{toast.message}</p>
            <button
              onClick={() => setToast({ message: "", type: null })}
              className="opacity-40 hover:opacity-80 transition-opacity ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-[#007AFF]/10 flex items-center justify-center">
              <Sliders className="w-3.5 h-3.5 text-[#007AFF]" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">System Settings</h1>
          </div>
          <p className="text-sm text-gray-500 ml-9">Configure portal rules, API keys, and organizational hierarchy.</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full ml-9 sm:ml-0 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* ── 2-COLUMN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* ══ LEFT COLUMN ══ */}
        <div className="space-y-5">

          {/* FINANCIAL CONTROL CARD */}
          <form onSubmit={handleSaveFinancials} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            
            {/* Card Header */}
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 text-[#007AFF]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Financial Control</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Registration fee management</p>
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-5 space-y-4">

              {/* Alert Banner */}
              <div className="flex gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Changes reflect immediately on the citizen onboarding portal. All transactions processed in <strong>INR (₹)</strong>.
                </p>
              </div>

              {/* Fee Preview Strip */}
              <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current Active Fee</p>
                  <p className="text-2xl font-black text-gray-900 mt-0.5">
                    ₹{membershipFee || "—"}
                    <span className="text-xs font-semibold text-gray-400 ml-1.5">INR</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <Zap className="w-4 h-4 text-[#007AFF]" />
                </div>
              </div>

              {/* Fee Input */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                  Citizen Pass Registration Fee
                </label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white focus-within:border-[#007AFF] focus-within:ring-4 focus-within:ring-blue-50 transition-all shadow-sm">
                  <span className="flex items-center justify-center px-4 h-11 bg-gray-50 border-r border-gray-200 text-gray-600 font-bold text-sm shrink-0">₹</span>
                  <input
                    type="number"
                    value={membershipFee}
                    onChange={(e) => setMembershipFee(e.target.value)}
                    placeholder="Enter amount"
                    className="flex-1 px-4 h-11 outline-none text-sm font-semibold text-gray-900 bg-transparent"
                  />
                  <span className="flex items-center justify-center px-4 h-11 bg-gray-50 border-l border-gray-100 text-gray-400 font-semibold text-xs uppercase shrink-0">INR</span>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSavingFinances}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingFinances ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {isSavingFinances ? "Saving..." : "Apply Financial Rule"}
                </button>
              </div>
            </div>
          </form>

          {/* HIERARCHY MANAGER CARD */}
          <div className="bg-white border border-indigo-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 pt-5 pb-4 border-b border-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                  <GitMerge className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Hierarchy & Titles Matrix</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Organizational chain of command</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <p className="text-sm text-gray-500 leading-relaxed mb-5">
                Define the absolute chain of command. Add or reorganize multi-tier ranks and leadership posts across <strong className="font-semibold text-gray-700">National</strong>, <strong className="font-semibold text-gray-700">State</strong>, and <strong className="font-semibold text-gray-700">District</strong> regions.
              </p>

              {/* Quick stats row */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {["National", "State", "District"].map((tier) => (
                  <div key={tier} className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{tier}</p>
                    <p className="text-xs font-bold text-indigo-700 mt-0.5">Tier</p>
                  </div>
                ))}
              </div>

              <Link
                href="/admin/titles"
                className="flex items-center justify-between w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors group"
              >
                <span>Manage Structural Hierarchy</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* ══ RIGHT COLUMN ══ */}
        <div>
          {/* API VAULT CARD */}
          <form onSubmit={handleSaveApis} className="bg-[#0D0D12] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl">

            {/* Card Header */}
            <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <Key className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">API Vault</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Service credentials & keys</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.05] border border-white/[0.08] rounded-full">
                <Shield className="w-3 h-3 text-gray-500" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Encrypted</span>
              </div>
            </div>

            {/* Fields */}
            <div className="p-5 space-y-5">

              {/* Razorpay Section Label */}
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 rounded-full bg-purple-500" />
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Razorpay Gateway</p>
              </div>

              {/* Razorpay Key ID */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-0.5">Key ID</label>
                <div className="relative flex items-center">
                  <Server className="absolute left-3.5 w-4 h-4 text-gray-600 pointer-events-none" />
                  <input
                    type="text"
                    value={razorpayId}
                    onChange={(e) => setRazorpayId(e.target.value)}
                    placeholder="rzp_live_xxxxxxxxxxxx"
                    className="w-full pl-10 pr-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl outline-none text-sm font-medium text-gray-200 focus:border-purple-500/50 focus:bg-white/[0.07] transition-all placeholder:text-gray-700 font-mono"
                  />
                </div>
              </div>

              {/* Razorpay Secret */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-0.5">Secret Key</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-gray-600 pointer-events-none" />
                  <input
                    type={showRzpSecret ? "text" : "password"}
                    value={razorpaySecret}
                    onChange={(e) => setRazorpaySecret(e.target.value)}
                    placeholder="Enter secret key"
                    className="w-full pl-10 pr-11 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl outline-none text-sm font-medium text-gray-200 focus:border-purple-500/50 focus:bg-white/[0.07] transition-all placeholder:text-gray-700 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRzpSecret(!showRzpSecret)}
                    className="absolute right-3.5 text-gray-600 hover:text-gray-300 transition-colors"
                  >
                    {showRzpSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/[0.06]" />

              {/* Email Section Label */}
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 rounded-full bg-sky-400" />
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Email Service</p>
              </div>

              {/* Resend API Key */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-0.5">Resend API Key</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-gray-600 pointer-events-none" />
                  <input
                    type={showResendKey ? "text" : "password"}
                    value={resendKey}
                    onChange={(e) => setResendKey(e.target.value)}
                    placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full pl-10 pr-11 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl outline-none text-sm font-medium text-gray-200 focus:border-sky-500/50 focus:bg-white/[0.07] transition-all placeholder:text-gray-700 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResendKey(!showResendKey)}
                    className="absolute right-3.5 text-gray-600 hover:text-gray-300 transition-colors"
                  >
                    {showResendKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Info note */}
              <div className="flex gap-2 bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500/70 shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Keys are stored securely in Firestore. Never share these credentials. Rotate them immediately if compromised.
                </p>
              </div>

              {/* Submit */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSavingApis}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingApis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {isSavingApis ? "Saving Vault..." : "Save Cryptographic Vault"}
                </button>
              </div>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}