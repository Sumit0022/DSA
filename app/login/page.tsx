// app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ShieldCheck, Loader2, AlertCircle, Lock } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Step = "LOGIN_PHONE" | "LOGIN_OTP";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("LOGIN_PHONE");
  
  // Login States
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  
  // System States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // 🔥 BULLETPROOF RECAPTCHA INITIALIZATION 🔥
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Step 1: Agar pehle se koi verifier atka hua hai, usko clear karo (Fixes React Strict Mode issue)
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (error) {
          console.error("reCAPTCHA clear error:", error);
        }
        (window as any).recaptchaVerifier = null;
      }

      // Step 2: Fresh Verifier banao
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
    }

    // Step 3: Cleanup function jab user page chhod de
    return () => {
      if (typeof window !== "undefined" && (window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (error) {
          console.error("reCAPTCHA cleanup error:", error);
        }
        (window as any).recaptchaVerifier = null;
      }
    };
  }, []); // Yeh array khali hona zaroori hai

  // ==========================================
  // LOGIN FLOW (SECURE ACCESS)
  // ==========================================
  const handleLoginRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) { setErrorMsg("Please enter a valid 10-digit number."); return; }
    
    setLoading(true);
    setErrorMsg("");

    try {
      // Validation: Check if the user is actually a registered member
      const membersRef = collection(db, "members");
      const phoneQuery = query(membersRef, where("phone", "==", phone), where("status", "==", "active_member"));
      const phoneSnapshot = await getDocs(phoneQuery);

      if (phoneSnapshot.empty) {
        setErrorMsg("No active membership found for this number. Please register.");
        setLoading(false);
        return;
      }

      // Proceed with OTP for Login
      const formattedPhone = `+91${phone}`;
      const appVerifier = (window as any).recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setStep("LOGIN_OTP");
    } catch (err: any) {
      console.error("OTP Request Error:", err);
      // Extra safety: Check if it's a reCAPTCHA error again and notify
      if (err.message && err.message.includes("reCAPTCHA")) {
         setErrorMsg("Security check failed. Please refresh the page and try again.");
      } else {
         setErrorMsg("Failed to send OTP. Too many attempts or network issue.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (!confirmationResult) throw new Error("Session expired.");
      await confirmationResult.confirm(otp);
      
      // Successfully authenticated via Firebase, redirect to dashboard.
      router.push("/dashboard"); 
    } catch (err) {
      console.error(err);
      setErrorMsg("Invalid OTP. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-24 px-6 relative overflow-hidden bg-slate-50">
      {/* Abstract Background Design */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#007AFF] opacity-[0.04] blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#34C759] opacity-[0.04] blur-[80px] rounded-full pointer-events-none" />

      {/* Recaptcha Container (Always mounted in the DOM) */}
      <div id="recaptcha-container"></div>

      <div className="w-full max-w-md relative z-10">
        <AnimatePresence mode="wait">
          
          {/* ============================== */}
          {/* 1. LOGIN PHONE ENTRY STEP      */}
          {/* ============================== */}
          {step === "LOGIN_PHONE" && (
            <motion.div key="login_phone" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
                  <Lock className="w-8 h-8 text-[#007AFF]" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Member Login</h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized Access Only</p>
              </div>

              {errorMsg && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 mb-5 text-center font-medium flex items-center gap-2 justify-center">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleLoginRequestOTP}>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Registered Mobile Number</label>
                  <div className="flex mt-1 shadow-sm rounded-xl overflow-hidden focus-within:border-[#007AFF] border border-slate-200 bg-white transition-all">
                    <span className="inline-flex items-center px-4 border-r border-slate-200 bg-slate-50 text-sm font-black text-slate-500">+91</span>
                    <input type="tel" required maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-4 border-none outline-none text-sm font-bold bg-transparent text-slate-900" placeholder="Enter 10-digit number" />
                  </div>
                </div>
                <button disabled={loading} className="w-full py-4 mt-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Request Secure OTP"} <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-8 text-center border-t border-slate-100 pt-6">
                <p className="text-xs font-semibold text-slate-500">
                  New to Here?{" "}
                  <Link href="/join" className="font-bold text-[#007AFF] hover:underline uppercase tracking-wide">
                    Become a Member
                  </Link>
                </p>
              </div>
            </motion.div>
          )}

          {/* ============================== */}
          {/* 2. LOGIN OTP VERIFY STEP       */}
          {/* ============================== */}
          {step === "LOGIN_OTP" && ( 
            <motion.div key="login_otp" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-8 text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#34C759]">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-1">Access Dashboard</h2>
              <p className="text-sm font-medium text-slate-500 mb-6">Enter OTP sent to +91 {phone}</p>
              
              {errorMsg && <p className="text-red-500 text-xs font-bold mb-4 bg-red-50 p-2 rounded-lg">{errorMsg}</p>}
              
              <form onSubmit={handleLoginVerifyOTP} className="space-y-4">
                <input type="text" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="w-full px-4 py-4 text-center tracking-[0.75em] font-mono text-2xl font-black rounded-xl bg-white border border-slate-200 focus:border-[#34C759] outline-none shadow-inner text-slate-900" />
                <button disabled={loading} className="w-full py-4 bg-[#34C759] text-white font-bold rounded-xl hover:bg-green-600 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Access Dashboard"}
                </button>
                <button type="button" onClick={() => { setStep("LOGIN_PHONE"); setOtp(""); setErrorMsg(""); }} className="w-full text-[10px] font-bold text-slate-400 hover:text-slate-900 mt-2 uppercase tracking-widest transition-colors">
                  Wrong Number? Go Back
                </button>
              </form>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}