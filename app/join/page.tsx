// app/join/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, ShieldCheck, Loader2, AlertCircle, RefreshCcw, Lock, UserPlus, MapPin, Phone, User, CheckCircle2 } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, query, where, getDocs, getDoc } from "firebase/firestore";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import DigitalPass from "@/components/DigitalPass";
import { useRouter } from "next/navigation";

type Step = "FORM" | "OTP" | "FAILED" | "SUCCESS" | "LOGIN_PHONE" | "LOGIN_OTP";

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("FORM");
  const [formStep, setFormStep] = useState(1); // Naya Internal Step Logic (1 to 3)
  
  // Form States (Default Empty removed UP/Bareilly)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  
  // System States
  const [indiaData, setIndiaData] = useState<Record<string, string[]>>({});
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [memberId, setMemberId] = useState("");
  const [docId, setDocId] = useState("");
  const [liveFee, setLiveFee] = useState("20"); // Live fee state

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

  // 2. Fetch Live Membership Fee
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, "settings", "core_config"));
        if (settingsSnap.exists() && settingsSnap.data().membershipFee) {
          setLiveFee(settingsSnap.data().membershipFee);
        }
      } catch (error) {
        console.error("Failed to fetch live fee:", error);
      }
    };
    fetchSettings();
  }, []);

  // 3. Initialize invisible Recaptcha
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
    }
  }, []);

  // Internal Step Handlers
  const nextFormStep = () => {
    setErrorMsg("");
    if (formStep === 1) {
      if (!name.trim() || !email.trim()) return setErrorMsg("Please fill in your name and email.");
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return setErrorMsg("Please enter a valid email format.");
    }
    if (formStep === 2) {
      if (phone.length !== 10) return setErrorMsg("Please enter a valid 10-digit mobile number.");
    }
    setFormStep((prev) => prev + 1);
  };

  const prevFormStep = () => {
    setErrorMsg("");
    setFormStep((prev) => prev - 1);
  };

  // ==========================================
  // REGISTRATION FLOW (ORIGINAL - UNTOUCHED)
  // ==========================================
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formStep !== 3) return; // Prevent early submission

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
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#007AFF] opacity-[0.04] blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#34C759] opacity-[0.04] blur-[80px] rounded-full pointer-events-none" />

      <div id="recaptcha-container"></div>

      <div className="w-full max-w-md relative z-10">
        <AnimatePresence mode="wait">
          
          {/* ============================== */}
          {/* 1. PROGRESSIVE REGISTRATION FORM */}
          {/* ============================== */}
          {step === "FORM" && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl overflow-hidden flex flex-col">
              
              {/* Progress Header */}
              <div className="bg-gray-50/80 px-8 py-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-gray-900 tracking-tight">Join Alliance</h1>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Step {formStep} of 3</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${formStep === s ? "w-6 bg-[#007AFF]" : formStep > s ? "w-2 bg-[#34C759]" : "w-2 bg-gray-200"}`} />
                  ))}
                </div>
              </div>

              <div className="p-8">
                {errorMsg && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 mb-5 text-center font-medium flex items-center gap-2 justify-center">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                  </div>
                )}

                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (formStep === 3) handleRequestOTP(e); }}>
                  <AnimatePresence mode="wait">
                    
                    {/* SUB-STEP 1: IDENTITY */}
                    {formStep === 1 && (
                      <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                        <div className="flex justify-center mb-6">
                          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100 shadow-sm text-[#007AFF]">
                            <User className="w-8 h-8" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Sharma" className="w-full px-4 py-3.5 rounded-xl bg-white border border-gray-200 focus:border-[#007AFF] outline-none text-sm font-semibold mt-1 transition-colors shadow-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Personal Email</label>
                          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rahul@example.com" className="w-full px-4 py-3.5 rounded-xl bg-white border border-gray-200 focus:border-[#007AFF] outline-none text-sm font-semibold mt-1 transition-colors shadow-sm" />
                        </div>
                      </motion.div>
                    )}

                    {/* SUB-STEP 2: CONTACT */}
                    {formStep === 2 && (
                      <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                        <div className="flex justify-center mb-6">
                          <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center border border-orange-100 shadow-sm text-orange-500">
                            <Phone className="w-8 h-8" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Mobile Number (WhatsApp)</label>
                          <div className="flex mt-1 shadow-sm rounded-xl overflow-hidden focus-within:border-[#007AFF] border border-gray-200 bg-white transition-all">
                            <span className="inline-flex items-center px-4 border-r border-gray-200 bg-gray-50 text-sm font-black text-gray-500">+91</span>
                            <input type="tel" required maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="Enter 10-digit number" className="w-full px-4 py-3.5 border-none outline-none text-sm font-bold bg-transparent" />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-2 ml-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-green-500"/> Verified for secure login.</p>
                        </div>
                      </motion.div>
                    )}

                    {/* SUB-STEP 3: LOCATION */}
                    {formStep === 3 && (
                      <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                        <div className="flex justify-center mb-6">
                          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center border border-green-100 shadow-sm text-green-600">
                            <MapPin className="w-8 h-8" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Resident State</label>
                          <select required value={state} onChange={(e) => { setState(e.target.value); setDistrict(""); }} className="w-full px-3 py-3.5 rounded-xl bg-white border border-gray-200 focus:border-[#007AFF] outline-none text-sm font-bold mt-1 shadow-sm cursor-pointer transition-colors">
                            <option value="" disabled>Select your State...</option>
                            {Object.keys(indiaData).map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Resident District</label>
                          <select required disabled={!state} value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full px-3 py-3.5 rounded-xl bg-white border border-gray-200 focus:border-[#007AFF] outline-none text-sm font-bold mt-1 disabled:opacity-50 shadow-sm cursor-pointer transition-colors">
                            <option value="" disabled>Select your District...</option>
                            {state && indiaData[state]?.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* NAVIGATION CONTROLS */}
                  <div className="flex items-center gap-3 pt-4 mt-6 border-t border-gray-100">
                    {formStep > 1 && (
                      <button type="button" onClick={prevFormStep} className="px-5 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    )}
                    
                    {formStep < 3 ? (
                      <button type="button" onClick={nextFormStep} className="flex-1 py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-md flex items-center justify-center gap-2">
                        Continue <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button type="submit" disabled={loading} className="flex-1 py-3.5 bg-[#007AFF] text-white font-bold rounded-xl hover:bg-blue-600 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : `Verify & Pay ₹${liveFee}`}
                      </button>
                    )}
                  </div>
                </form>

                {/* LOGIN SWITCH */}
                <div className="mt-8 text-center">
                  <p className="text-xs font-semibold text-gray-500">
                    Already have a pass?{" "}
                    <button onClick={() => { setStep("LOGIN_PHONE"); setErrorMsg(""); setPhone(""); setFormStep(1); }} className="font-bold text-[#007AFF] hover:underline uppercase tracking-wide">
                      Login Securely
                    </button>
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ============================== */}
          {/* 2. REGISTRATION OTP STEP       */}
          {/* ============================== */}
          {step === "OTP" && ( 
            <motion.div key="otp" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-8 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#007AFF]">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Verify Mobile</h2>
              <p className="text-sm font-medium text-gray-500 mb-6">Enter the encrypted OTP sent to +91 {phone}</p>
              
              {errorMsg && <p className="text-red-500 text-xs font-bold mb-4 bg-red-50 p-2 rounded-lg">{errorMsg}</p>}
              
              <form onSubmit={handleVerifyAndPay} className="space-y-4">
                <input type="text" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="w-full px-4 py-4 text-center tracking-[0.75em] font-mono text-2xl font-bold rounded-xl bg-white border border-gray-200 focus:border-[#007AFF] outline-none shadow-inner" />
                <button disabled={loading} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : `Authenticate & Pay ₹${liveFee}`}
                </button>
              </form>
            </motion.div>
          )}

          {/* ============================== */}
          {/* 3. LOGIN PHONE ENTRY STEP      */}
          {/* ============================== */}
          {step === "LOGIN_PHONE" && (
            <motion.div key="login_phone" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 shadow-sm">
                  <Lock className="w-8 h-8 text-gray-900" />
                </div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Citizen HQ Login</h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Authorized Access Only</p>
              </div>

              {errorMsg && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 mb-5 text-center font-medium flex items-center gap-2 justify-center">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleLoginRequestOTP}>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Registered Mobile Number</label>
                  <div className="flex mt-1 shadow-sm rounded-xl overflow-hidden focus-within:border-[#007AFF] border border-gray-200 bg-white transition-all">
                    <span className="inline-flex items-center px-4 border-r border-gray-200 bg-gray-50 text-sm font-black text-gray-500">+91</span>
                    <input type="tel" required maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-4 border-none outline-none text-sm font-bold bg-transparent" placeholder="Enter 10-digit number" />
                  </div>
                </div>
                <button disabled={loading} className="w-full py-4 mt-2 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Request Secure OTP"} <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-8 text-center border-t border-gray-100 pt-6">
                <p className="text-xs font-semibold text-gray-500">
                  New to the alliance?{" "}
                  <button onClick={() => { setStep("FORM"); setErrorMsg(""); setPhone(""); setFormStep(1); }} className="font-bold text-gray-900 hover:underline uppercase tracking-wide">
                    Create your Pass
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {/* ============================== */}
          {/* 4. LOGIN OTP VERIFY STEP       */}
          {/* ============================== */}
          {step === "LOGIN_OTP" && ( 
            <motion.div key="login_otp" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-8 text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#34C759]">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Access Gateway</h2>
              <p className="text-sm font-medium text-gray-500 mb-6">Enter OTP sent to +91 {phone}</p>
              
              {errorMsg && <p className="text-red-500 text-xs font-bold mb-4 bg-red-50 p-2 rounded-lg">{errorMsg}</p>}
              
              <form onSubmit={handleLoginVerifyOTP} className="space-y-4">
                <input type="text" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="w-full px-4 py-4 text-center tracking-[0.75em] font-mono text-2xl font-bold rounded-xl bg-white border border-gray-200 focus:border-[#34C759] outline-none shadow-inner" />
                <button disabled={loading} className="w-full py-4 bg-[#34C759] text-white font-bold rounded-xl hover:bg-green-600 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Access Dashboard"}
                </button>
                <button type="button" onClick={() => { setStep("LOGIN_PHONE"); setOtp(""); setErrorMsg(""); }} className="w-full text-[10px] font-bold text-gray-400 hover:text-gray-900 mt-2 uppercase tracking-widest transition-colors">
                  Wrong Number? Go Back
                </button>
              </form>
            </motion.div>
          )}

          {/* ============================== */}
          {/* 5. RAZORPAY FAIL & SUCCESS     */}
          {/* ============================== */}
          {step === "FAILED" && ( 
             <motion.div key="failed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-8 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Transaction Halted</h2>
              <p className="text-sm font-medium text-gray-500 mb-6">Your payment cycle was interrupted. No charges were made.</p>
              <button onClick={() => { setStep("OTP"); initiateRazorpay(); }} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-md">
                <RefreshCcw className="w-4 h-4" /> Retry Payment Entry
              </button>
            </motion.div>
          )}

          {step === "SUCCESS" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="mb-6 text-center">
                <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-gray-900">Pass Activated!</h2>
                <p className="text-xs text-gray-500 font-medium">Welcome to the alliance.</p>
              </div>

              <DigitalPass name={name} state={state} district={district} memberId={memberId} />
              
              <button onClick={() => router.push("/dashboard")} className="w-full py-4 mt-6 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-md flex items-center justify-center gap-2">
                Enter Headquarters <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}