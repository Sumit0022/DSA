"use client";

import { useState, useEffect, useRef } from "react";
import { collection, doc, getDoc, setDoc, updateDoc, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  CreditCard, Key, Sliders, Save, CheckCircle2, Eye, EyeOff,
  Loader2, Server, Lock, AlertTriangle, X, Mail, GitMerge,
  ShieldAlert, Zap, ChevronRight, Shield, UploadCloud, 
  Image as ImageIcon, Link as LinkIcon, Trash2, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function SystemSettings() {
  const [loading, setLoading] = useState(true);

  // Core Config
  const [membershipFee, setMembershipFee] = useState("");
  const [isSavingFinances, setIsSavingFinances] = useState(false);

  // APIs
  const [razorpayId, setRazorpayId] = useState("");
  const [razorpaySecret, setRazorpaySecret] = useState("");
  const [resendKey, setResendKey] = useState("");
  const [cloudName, setCloudName] = useState("");
  const [uploadPreset, setUploadPreset] = useState("");
  const [isSavingApis, setIsSavingApis] = useState(false);

  const [showRzpSecret, setShowRzpSecret] = useState(false);
  const [showResendKey, setShowResendKey] = useState(false);

  // 🔥 HERO BANNER STATE 🔥
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [bannerLink, setBannerLink] = useState("");
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

        const cloudSnap = await getDoc(doc(db, "settings", "cloudinary"));
        if (cloudSnap.exists()) {
          setCloudName(cloudSnap.data().cloudName || "");
          setUploadPreset(cloudSnap.data().uploadPreset || "");
        }
      } catch (error) {
        console.error("Error fetching system configurations:", error);
        showToast("Failed to sync live configurations.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchSystemData();
  }, []);

  // Live Listener for Hero Slides
  useEffect(() => {
    const q = query(collection(db, "hero_slides"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setHeroSlides(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleSaveFinancials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFinances(true);
    try {
      await updateDoc(doc(db, "settings", "core_config"), { membershipFee });
      showToast("Financial rules updated successfully.", "success");
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
      await setDoc(doc(db, "settings", "cloudinary"), { cloudName, uploadPreset }, { merge: true });
      showToast("API Vault successfully updated.", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to update API Vault.", "error");
    } finally {
      setIsSavingApis(false);
    }
  };

  // 🔥 BANNER UPLOAD LOGIC 🔥
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    if (!cloudName || !uploadPreset) {
      showToast("Please save Cloudinary details in the API Vault first!", "error");
      return;
    }

    const file = e.target.files[0];
    setIsUploadingBanner(true);

    try {
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", uploadPreset);

      const response = await fetch(url, { method: "POST", body: fd });
      const data = await response.json();
      
      if (data.secure_url) {
        await addDoc(collection(db, "hero_slides"), {
          imageUrl: data.secure_url,
          link: bannerLink || null,
          createdAt: serverTimestamp()
        });
        setBannerLink(""); // clear input
        showToast("Banner added to Home Page!", "success");
      } else {
        showToast("Upload failed from Cloudinary.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error uploading banner.", "error");
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (confirm("Remove this banner from the Home Page?")) {
      await deleteDoc(doc(db, "hero_slides", id));
      showToast("Banner removed.", "success");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[#007AFF]" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">Loading Configuration</p>
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
            className={`fixed bottom-6 right-6 z-[500] flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-lg text-sm max-w-xs border ${
              toast.type === "success" ? "bg-gray-950 text-white border-gray-800" : "bg-white text-red-600 border-red-100 shadow-red-100"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
            <p className="font-medium leading-snug flex-1">{toast.message}</p>
            <button onClick={() => setToast({ message: "", type: null })} className="opacity-40 hover:opacity-80 transition-opacity ml-1">
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
          <p className="text-sm text-gray-500 ml-9">Configure portal rules, API keys, and home page assets.</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full ml-9 sm:ml-0 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-widest">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        
        {/* ══ LEFT COLUMN ══ */}
        <div className="space-y-5">
          {/* FINANCIAL CONTROL */}
          <form onSubmit={handleSaveFinancials} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4 text-[#007AFF]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Financial Control</h2>
                <p className="text-xs text-gray-400 mt-0.5">Registration fee management</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">Changes reflect immediately. Transactions processed in <strong>INR (₹)</strong>.</p>
              </div>
              <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current Active Fee</p>
                  <p className="text-2xl font-black text-gray-900 mt-0.5">₹{membershipFee || "—"}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <Zap className="w-4 h-4 text-[#007AFF]" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Citizen Pass Fee</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white focus-within:border-[#007AFF] shadow-sm">
                  <span className="flex items-center justify-center px-4 h-11 bg-gray-50 border-r border-gray-200 text-gray-600 font-bold text-sm">₹</span>
                  <input type="number" value={membershipFee} onChange={(e) => setMembershipFee(e.target.value)} className="flex-1 px-4 h-11 outline-none text-sm font-semibold bg-transparent" />
                  <span className="flex items-center justify-center px-4 h-11 bg-gray-50 border-l border-gray-100 text-gray-400 font-semibold text-xs">INR</span>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button type="submit" disabled={isSavingFinances} className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl disabled:opacity-50">
                  {isSavingFinances ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {isSavingFinances ? "Saving..." : "Apply Rule"}
                </button>
              </div>
            </div>
          </form>

          {/* HIERARCHY MANAGER */}
          <div className="bg-white border border-indigo-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 pt-5 pb-4 border-b border-indigo-50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                <GitMerge className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Hierarchy & Titles</h2>
                <p className="text-xs text-gray-400 mt-0.5">Organizational chain of command</p>
              </div>
            </div>
            <div className="p-5">
              <Link href="/admin/titles" className="flex items-center justify-between w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors group">
                <span>Manage Structural Hierarchy</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* ══ RIGHT COLUMN ══ */}
        <div>
          {/* API VAULT */}
          <form onSubmit={handleSaveApis} className="bg-[#0D0D12] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl">
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
            </div>

            <div className="p-5 space-y-5">
              {/* Razorpay */}
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 rounded-full bg-purple-500" />
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Razorpay Gateway</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase block ml-0.5">Key ID</label>
                <div className="relative flex items-center">
                  <Server className="absolute left-3.5 w-4 h-4 text-gray-600" />
                  <input type="text" value={razorpayId} onChange={(e) => setRazorpayId(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl outline-none text-sm text-gray-200 focus:border-purple-500/50 font-mono" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase block ml-0.5">Secret Key</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-gray-600" />
                  <input type={showRzpSecret ? "text" : "password"} value={razorpaySecret} onChange={(e) => setRazorpaySecret(e.target.value)} className="w-full pl-10 pr-11 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl outline-none text-sm text-gray-200 focus:border-purple-500/50 font-mono" />
                  <button type="button" onClick={() => setShowRzpSecret(!showRzpSecret)} className="absolute right-3.5 text-gray-600">
                    {showRzpSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="border-t border-white/[0.06]" />

              {/* Resend */}
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 rounded-full bg-sky-400" />
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Email Service</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase block ml-0.5">Resend API Key</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-gray-600" />
                  <input type={showResendKey ? "text" : "password"} value={resendKey} onChange={(e) => setResendKey(e.target.value)} className="w-full pl-10 pr-11 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl outline-none text-sm text-gray-200 focus:border-sky-500/50 font-mono" />
                </div>
              </div>

              <div className="border-t border-white/[0.06]" />

              {/* Cloudinary */}
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 rounded-full bg-emerald-400" />
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Media Server (Cloudinary)</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase block ml-0.5">Cloud Name</label>
                <div className="relative flex items-center">
                  <UploadCloud className="absolute left-3.5 w-4 h-4 text-gray-600" />
                  <input type="text" value={cloudName} onChange={(e) => setCloudName(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl outline-none text-sm text-gray-200 focus:border-emerald-500/50 font-mono" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase block ml-0.5">Upload Preset (Unsigned)</label>
                <div className="relative flex items-center">
                  <Key className="absolute left-3.5 w-4 h-4 text-gray-600" />
                  <input type="text" value={uploadPreset} onChange={(e) => setUploadPreset(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl outline-none text-sm text-gray-200 focus:border-emerald-500/50 font-mono" />
                </div>
              </div>

              <div className="pt-1">
                <button type="submit" disabled={isSavingApis} className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-purple-600 text-white text-xs font-bold rounded-xl disabled:opacity-50">
                  {isSavingApis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Cryptographic Vault
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ══ FULL WIDTH: HOME PAGE BANNER MANAGER ══ */}
        <div className="lg:col-span-2 mt-2">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Home Page Banners (Hero Carousel)</h2>
                <p className="text-xs text-gray-400 mt-0.5">Manage the main sliding images on the home page</p>
              </div>
            </div>

            <div className="p-5 space-y-6">
              
              {/* Dimensions Warning */}
              <div className="flex gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <p className="font-bold mb-1">Image Dimension Guidelines:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Use a <strong>16:9 aspect ratio</strong> (e.g., 1920x1080 pixels) for best quality.</li>
                    <li>Always keep the <strong>main subject or text perfectly in the CENTER</strong> of the image.</li>
                    <li>The system will automatically crop the sides on mobile screens to fit the vertical view, so keeping important content centered ensures it looks perfect on both Desktop and Mobile.</li>
                  </ul>
                </div>
              </div>

              {/* Upload Form */}
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="flex-1 w-full relative">
                  <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Optional Link (e.g., /vision or https://google.com)" 
                    value={bannerLink} 
                    onChange={e => setBannerLink(e.target.value)} 
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[#007AFF] focus:bg-white"
                  />
                </div>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isUploadingBanner}
                  className="w-full sm:w-auto px-6 py-3 bg-[#007AFF] text-white font-bold text-sm rounded-xl hover:bg-blue-600 disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 shrink-0"
                >
                  {isUploadingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  {isUploadingBanner ? "Uploading..." : "Select & Add Banner"}
                </button>
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleBannerUpload} />
              </div>

              {/* Banner Grid */}
              <div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Live Banners</h3>
                {heroSlides.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 border border-gray-100 rounded-xl border-dashed">
                    <p className="text-sm font-semibold text-gray-400">No banners currently active on the Home Page.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {heroSlides.map(slide => (
                      <div key={slide.id} className="relative rounded-xl overflow-hidden border border-gray-200 group bg-gray-100 aspect-video shadow-sm">
                        <img src={slide.imageUrl} alt="Banner" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                          {slide.link && (
                            <span className="bg-white/90 text-gray-900 px-2 py-1 text-[10px] font-bold rounded overflow-hidden text-ellipsis w-full text-center whitespace-nowrap">
                              🔗 {slide.link}
                            </span>
                          )}
                          <button 
                            type="button"
                            onClick={() => handleDeleteBanner(slide.id)} 
                            className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition-transform shadow-lg"
                          >
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}