// app/join/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ShieldCheck, Loader2, AlertCircle, RefreshCcw, Lock, UserPlus } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, query, where, getDocs } from "firebase/firestore";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import DigitalPass from "@/components/DigitalPass";
import { useRouter } from "next/navigation";

// Naye login steps add kiye hain
type Step = "FORM" | "OTP" | "FAILED" | "SUCCESS" | "LOGIN_PHONE" | "LOGIN_OTP";

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("FORM");
  
  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("Uttar Pradesh");
  const [district, setDistrict] = useState("Bareilly");
  
  // System States
  const [indiaData, setIndiaData] = useState<Record<string, string[]>>({});
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [memberId, setMemberId] = useState("");
  const [docId, setDocId] = useState("");

  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // 1. Fetch Complete Indian States & Districts
  useEffect(() => {
    const fetchIndiaData = async () => {
      try {
        const res = await fetch('https://raw.githubusercontent.com/sab99r/Indian-States-And-Districts/master/states-and-districts.json');
        const data = await res.json();
        const formattedData: Record<string, string[]> = {};
        data.states.forEach((item: any) => {
          formattedData[item.state] = item.districts;
        });
        setIndiaData(formattedData);
      } catch (err) {
        console.error("Failed to load locations", err);
      }
    };
    fetchIndiaData();
  }, []);

  // 2. Initialize invisible Recaptcha
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
    }
  }, []);

  // ==========================================
  // REGISTRATION FLOW (ORIGINAL - UNTOUCHED)
  // ==========================================
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) { setErrorMsg("Please enter a valid 10-digit number."); return; }
    if (!state || !district) { setErrorMsg("Please select your State and District."); return; }
    
    setLoading(true);
    setErrorMsg("");

    try {
      // Duplicate Check
      const membersRef = collection(db, "members");
      const phoneQuery = query(membersRef, where("phone", "==", phone));
      const phoneSnapshot = await getDocs(phoneQuery);
      
      let isDuplicate = false;
      phoneSnapshot.forEach((doc) => {
        if (doc.data().status === "active_member") isDuplicate = true;
      });

      if (isDuplicate) {
        setErrorMsg("You are already registered! Please switch to Login.");
        setLoading(false);
        return; 
      }

      // Send OTP
      const formattedPhone = `+91${phone}`;
      const appVerifier = (window as any).recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      
      const docRef = await addDoc(collection(db, "members"), {
        name, email, phone, state, district, status: "otp_pending", joinedAt: new Date()
      });
      setDocId(docRef.id);
      setStep("OTP");

    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to send OTP. Network issue or too many attempts.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (!confirmationResult) throw new Error("Session expired.");
      await confirmationResult.confirm(otp);
      await updateDoc(doc(db, "members", docId), { status: "payment_pending" });
      await initiateRazorpay();
    } catch (err) {
      console.error(err);
      setErrorMsg("Invalid OTP. Please try again.");
      setLoading(false);
    }
  };

  const initiateRazorpay = async () => {
    return new Promise(async (resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(script);

      script.onload = async () => {
        try {
          const res = await fetch("/api/razorpay", { method: "POST" });
          const orderData = await res.json();

          const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "Democratic Social Alliance",
            description: "DSA Freedom Pass",
            order_id: orderData.id,
            prefill: { name, email, contact: phone },
            theme: { color: "#007AFF" },
            handler: async function (response: any) {
              const generatedId = `DSA-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
              setMemberId(generatedId);
              
              await updateDoc(doc(db, "members", docId), {
                status: "active_member",
                paymentId: response.razorpay_payment_id,
                memberId: generatedId
              });
              setStep("SUCCESS");
              setLoading(false);
            },
          };

          const paymentObject = new (window as any).Razorpay(options);
          paymentObject.on('payment.failed', function () {
            updateDoc(doc(db, "members", docId), { status: "payment_failed" });
            setStep("FAILED");
            setLoading(false);
          });
          paymentObject.open();
        } catch (err) {
          setStep("FAILED");
          setLoading(false);
        }
      };
    });
  };

  // ==========================================
  // NEW LOGIN FLOW (SECURE ACCESS)
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
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to send OTP. Too many attempts or network issue.");
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
      
      // Successfully authenticated via Firebase, redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setErrorMsg("Invalid OTP. Please try again.");
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center py-24 px-6 relative overflow-hidden bg-[var(--color-dsa-bg)]">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[var(--color-dsa-blue)] opacity-[0.04] blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[var(--color-dsa-green)] opacity-[0.04] blur-[80px] rounded-full pointer-events-none" />

      <div id="recaptcha-container"></div>

      <div className="w-full max-w-md relative z-10">
        <AnimatePresence mode="wait">
          
          {/* ============================== */}
          {/* 1. REGISTRATION FORM STEP      */}
          {/* ============================== */}
          {step === "FORM" && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-apple-hover rounded-3xl p-8">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 shadow-sm">
                  <UserPlus className="w-6 h-6 text-[var(--color-dsa-blue)]" />
                </div>
                <h1 className="text-2xl font-bold text-[var(--color-dsa-text)] tracking-tight">Join the Alliance</h1>
              </div>

              {errorMsg && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 mb-4 text-center font-medium">
                  {errorMsg}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleRequestOTP}>
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase ml-1">Full Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-[var(--color-dsa-blue)] outline-none text-sm mt-1" />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase ml-1">Email</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-[var(--color-dsa-blue)] outline-none text-sm mt-1" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase ml-1">Phone Number</label>
                  <div className="flex mt-1">
                    <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-sm text-gray-500">+91</span>
                    <input type="tel" required maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-2.5 rounded-r-xl bg-white border border-gray-200 focus:border-[var(--color-dsa-blue)] outline-none text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase ml-1">State</label>
                    <select required value={state} onChange={(e) => { setState(e.target.value); setDistrict(""); }} className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-[var(--color-dsa-blue)] outline-none text-sm mt-1">
                      <option value="">Select State</option>
                      {Object.keys(indiaData).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase ml-1">District</label>
                    <select required disabled={!state} value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-[var(--color-dsa-blue)] outline-none text-sm mt-1 disabled:opacity-50">
                      <option value="">Select District</option>
                      {state && indiaData[state]?.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <button disabled={loading} className="w-full py-3.5 mt-2 bg-[var(--color-dsa-text)] text-white font-medium rounded-xl hover:bg-black transition-all shadow-md flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Verify & Proceed"}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200/50 text-center">
                <p className="text-sm font-medium text-[var(--color-text-muted)]">
                  Already an active member?{" "}
                  <button onClick={() => { setStep("LOGIN_PHONE"); setErrorMsg(""); setPhone(""); }} className="font-bold text-[var(--color-dsa-blue)] hover:underline">
                    Login via Mobile
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {/* ============================== */}
          {/* 2. REGISTRATION OTP STEP       */}
          {/* ============================== */}
          {step === "OTP" && ( 
            <motion.div key="otp" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-apple-hover rounded-3xl p-8 text-center">
              <h2 className="text-xl font-bold mb-2">Verify your number</h2>
              <p className="text-sm text-gray-500 mb-6">We sent an OTP to +91 {phone}</p>
              {errorMsg && <p className="text-red-500 text-xs mb-4">{errorMsg}</p>}
              <form onSubmit={handleVerifyAndPay} className="space-y-4">
                <input type="text" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" className="w-full px-4 py-3 text-center tracking-[0.5em] font-mono text-lg rounded-xl bg-white border border-gray-200 focus:border-[var(--color-dsa-blue)] outline-none" />
                <button disabled={loading} className="w-full py-3.5 bg-[var(--color-dsa-text)] text-white font-medium rounded-xl hover:bg-black transition-all shadow-md flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Verify & Pay ₹20"}
                </button>
              </form>
            </motion.div>
          )}

          {/* ============================== */}
          {/* 3. LOGIN PHONE ENTRY STEP      */}
          {/* ============================== */}
          {step === "LOGIN_PHONE" && (
            <motion.div key="login_phone" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-apple-hover rounded-3xl p-8">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 shadow-sm">
                  <Lock className="w-6 h-6 text-[var(--color-dsa-blue)]" />
                </div>
                <h1 className="text-2xl font-bold text-[var(--color-dsa-text)] tracking-tight">Citizen Login</h1>
              </div>

              {errorMsg && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 mb-4 text-center font-medium">
                  {errorMsg}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleLoginRequestOTP}>
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase ml-1">Registered Mobile Number</label>
                  <div className="flex mt-1">
                    <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-sm text-gray-500">+91</span>
                    <input type="tel" required maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-3.5 rounded-r-xl bg-white border border-gray-200 focus:border-[var(--color-dsa-blue)] outline-none text-sm font-semibold" placeholder="Enter 10-digit number" />
                  </div>
                </div>
                <button disabled={loading} className="w-full py-3.5 mt-2 bg-[var(--color-dsa-text)] text-white font-medium rounded-xl hover:bg-black transition-all shadow-md flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Send Login OTP"} <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200/50 text-center">
                <p className="text-sm font-medium text-[var(--color-text-muted)]">
                  Don't have a Freedom Pass?{" "}
                  <button onClick={() => { setStep("FORM"); setErrorMsg(""); setPhone(""); }} className="font-bold text-[var(--color-dsa-blue)] hover:underline">
                    Register Here
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {/* ============================== */}
          {/* 4. LOGIN OTP VERIFY STEP       */}
          {/* ============================== */}
          {step === "LOGIN_OTP" && ( 
            <motion.div key="login_otp" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-apple-hover rounded-3xl p-8 text-center">
              <h2 className="text-xl font-bold mb-2">Secure Access</h2>
              <p className="text-sm text-gray-500 mb-6">OTP sent to +91 {phone}</p>
              {errorMsg && <p className="text-red-500 text-xs mb-4">{errorMsg}</p>}
              <form onSubmit={handleLoginVerifyOTP} className="space-y-4">
                <input type="text" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="w-full px-4 py-3 text-center tracking-[0.5em] font-mono text-lg rounded-xl bg-white border border-gray-200 focus:border-[var(--color-dsa-blue)] outline-none" />
                <button disabled={loading} className="w-full py-3.5 bg-[var(--color-dsa-text)] text-white font-medium rounded-xl hover:bg-black transition-all shadow-md flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Access HQ Dashboard"} <ShieldCheck className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => { setStep("LOGIN_PHONE"); setOtp(""); setErrorMsg(""); }} className="w-full text-xs font-semibold text-gray-500 hover:text-gray-900 mt-2">
                  Change Mobile Number
                </button>
              </form>
            </motion.div>
          )}

          {/* ============================== */}
          {/* 5. RAZORPAY FAIL & SUCCESS     */}
          {/* ============================== */}
          {step === "FAILED" && ( 
             <motion.div key="failed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-apple-hover rounded-3xl p-8 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Incomplete</h2>
              <p className="text-sm text-gray-500 mb-6">Your transaction couldn't be completed. No charges were made.</p>
              <button onClick={() => { setStep("OTP"); initiateRazorpay(); }} className="w-full py-3.5 bg-white border border-gray-200 text-gray-900 font-medium rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                <RefreshCcw className="w-4 h-4" /> Try Payment Again
              </button>
            </motion.div>
          )}

          {step === "SUCCESS" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <DigitalPass name={name} state={state} district={district} memberId={memberId} />
              
              {/* Added a button here to easily proceed to dashboard after generating pass */}
              <button onClick={() => router.push("/dashboard")} className="w-full py-3 mt-4 bg-[var(--color-dsa-text)] text-white font-medium rounded-xl hover:bg-black transition-all shadow-md flex items-center justify-center gap-2">
                Continue to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}