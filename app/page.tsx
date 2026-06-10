// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { 
  ArrowRight, HeartHandshake, BookOpen, ShieldCheck, 
  ChevronLeft, ChevronRight, Zap, TrendingUp, Scale, 
  Users, Flame, CheckCircle2, LayoutGrid
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function HomePage() {
  const { userData, loadingUser } = useUser();
  const [slides, setSlides] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [boostedPetitions, setBoostedPetitions] = useState<any[]>([]);

  // ─── FETCH HERO SLIDES ───
  useEffect(() => {
    const q = query(collection(db, "hero_slides"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setSlides(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // ─── FETCH BOOSTED PETITIONS (COMPOSITE INDEX BYPASS FIX) ───
  useEffect(() => {
    const q = query(
      collection(db, "petitions"), 
      where("isBoosted", "==", true)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // In-memory sort by createdAt to bypass the need for a composite index
      docs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });

      // Slice top 3 most recent boosted petitions
      setBoostedPetitions(docs.slice(0, 3));
    }, (err) => {
      console.error("Error fetching boosted petitions:", err);
    });
    
    return () => unsub();
  }, []);

  // ─── AUTO-PLAY CAROUSEL ───
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 6000); 
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans selection:bg-[#007AFF]/20 overflow-x-hidden">
      
      {/* ─── 1. CINEMATIC HERO CAROUSEL ─── */}
      <section className="relative w-full aspect-[4/3] sm:aspect-video md:h-[85vh] md:aspect-auto bg-slate-950 mt-[72px] md:mt-20 overflow-hidden flex items-center justify-center group">
        
        {slides.length > 0 ? (
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full"
            >
              {slides[currentSlide].link ? (
                <Link href={slides[currentSlide].link} className="w-full h-full block cursor-pointer">
                  <img src={slides[currentSlide].imageUrl} alt="DSA Hero" className="w-full h-full object-cover sm:object-contain md:object-cover" />
                </Link>
              ) : (
                <img src={slides[currentSlide].imageUrl} alt="DSA Hero" className="w-full h-full object-cover sm:object-contain md:object-cover" />
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-indigo-950 flex flex-col items-center justify-center text-center p-6">
            <div className="absolute inset-0 bg-[url('/dsa-logo.png')] bg-center bg-no-repeat opacity-[0.03] scale-150"></div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative z-10">
              <span className="px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-black tracking-widest uppercase border border-blue-500/30 backdrop-blur-md">Welcome to DSA</span>
              <h1 className="text-4xl md:text-7xl font-black text-white tracking-tight leading-[1.1] mt-6 mb-4">
                A New Vision for a <br className="hidden md:block"/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Stronger India.</span>
              </h1>
            </motion.div>
          </div>
        )}

        <div className="absolute inset-0 bg-radial-gradient from-transparent via-slate-900/20 to-slate-950/80 pointer-events-none mix-blend-multiply" />

        {slides.length > 1 && (
          <>
            <button 
              onClick={() => setCurrentSlide(prev => prev === 0 ? slides.length - 1 : prev - 1)}
              className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/30 backdrop-blur-xl flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 z-20 border border-white/20 shadow-2xl hidden md:flex"
            >
              <ChevronLeft className="w-6 h-6 -ml-1" />
            </button>
            <button 
              onClick={() => setCurrentSlide(prev => prev === slides.length - 1 ? 0 : prev + 1)}
              className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/30 backdrop-blur-xl flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 z-20 border border-white/20 shadow-2xl hidden md:flex"
            >
              <ChevronRight className="w-6 h-6 -mr-1" />
            </button>
            
            <div className="absolute bottom-4 md:bottom-8 left-0 right-0 flex justify-center gap-2 z-20">
              {slides.map((_, idx) => (
                <button key={idx} onClick={() => setCurrentSlide(idx)} className={`h-1.5 rounded-full transition-all duration-500 ${currentSlide === idx ? 'bg-white w-8 shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'bg-white/40 hover:bg-white/60 w-2'}`} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ─── 2. QUICK ACTION STRIP ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 relative z-30 -mt-6 md:-mt-12 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {[
            { title: "Our Vision", desc: "Read the comprehensive manifesto and ideological foundation.", icon: BookOpen, href: "/vision", color: "text-indigo-600", bg: "bg-indigo-50" },
            { title: "Live Press Wire", desc: "Official mandates, resolutions, and organizational updates.", icon: Zap, href: "/press", color: "text-emerald-600", bg: "bg-emerald-50" },
            { title: "Media Gallery", desc: "Explore high-quality photo and video highlights from our events.", icon: LayoutGrid, href: "/gallery", color: "text-pink-600", bg: "bg-pink-50" }
          ].map((item, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + (idx * 0.1) }}>
              <Link href={item.href} className="flex flex-col p-6 md:p-8 bg-white/80 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,122,255,0.1)] hover:-translate-y-1 transition-all duration-300 group">
                <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── 3. BOOSTED PETITIONS (PREMIUM BENTO DESIGN) ─── */}
      {boostedPetitions.length > 0 && (
        <section className="py-16 md:py-24 relative overflow-hidden bg-slate-50">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
          
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            
            {/* 🔥 MODIFIED: CENTERED HEADER 🔥 */}
            <motion.div initial={{ opacity: 0, y: -20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-col items-center justify-center text-center gap-4 mb-12">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl flex items-center justify-center border border-orange-100 shadow-sm">
                <Flame className="w-7 h-7 text-orange-500" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Priority Mandates</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Authorized by High Command
                </p>
              </div>
            </motion.div>

            {/* 🔥 MODIFIED: DYNAMIC GRID COLUMNS 🔥 */}
            <div className={`grid gap-6 ${
              boostedPetitions.length === 1 ? 'grid-cols-1' : 
              boostedPetitions.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 
              'grid-cols-1 md:grid-cols-3'
            }`}>
              {boostedPetitions.map((petition, idx) => {
                const progress = Math.min(100, Math.round(((petition.signatureCount || 0) / (petition.targetSignatures || 1)) * 100));
                
                return (
                  <motion.div key={petition.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="h-full">
                    <Link href={`/petition/${petition.id}`} className="block h-full bg-white border border-slate-200 rounded-[2rem] p-7 hover:border-orange-300 hover:shadow-[0_20px_40px_-15px_rgba(249,115,22,0.15)] transition-all duration-300 group relative overflow-hidden flex flex-col justify-between">
                      
                      {/* Premium Subtle Glow */}
                      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-orange-100 via-orange-50/50 to-transparent rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      
                      <div className="relative z-10">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-orange-100 mb-5">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                          Active Priority
                        </span>
                        <h3 className="text-xl font-black text-slate-900 mb-3 leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">
                          {petition.title}
                        </h3>
                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-6 font-medium">
                          {petition.description}
                        </p>
                      </div>

                      <div className="border-t border-slate-100 pt-5 mt-auto relative z-10">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Signatures</span>
                          <span className="text-sm font-black text-slate-900">{petition.signatureCount?.toLocaleString() || 0} <span className="text-slate-400 font-semibold">/ {petition.targetSignatures?.toLocaleString()}</span></span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-4">
                          <div className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-orange-400 to-red-500" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold text-orange-600">
                          <span>Review & Sign</span>
                          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── 4. THE VISION BENTO GRID ─── */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            The India We Seek to Build.
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
            Our commitment is to ensure that development reaches every citizen, institutions remain accountable, and opportunities are accessible to all.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 auto-rows-[280px]">
          
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="md:col-span-2 md:row-span-2 bg-gradient-to-br from-[#007AFF] to-blue-700 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-blue-500/20 group">
            <div className="absolute -right-20 -bottom-20 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <ShieldCheck className="w-96 h-96" />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <span className="w-fit px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest border border-white/20">Governance</span>
              <div>
                <h3 className="text-3xl md:text-5xl font-black mb-4 leading-tight">Trust, Transparency & Accountability.</h3>
                <p className="text-blue-100 text-lg font-medium max-w-md">Democracy flourishes when governments are accountable, institutions are independent, and citizens actively participate.</p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="md:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-[#007AFF]/30 transition-colors shadow-sm">
            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full transition-colors group-hover:bg-emerald-500/20" />
            <Scale className="w-10 h-10 text-emerald-500 mb-6" />
            <h3 className="text-2xl font-black text-slate-900 mb-3">Social Justice & Equity</h3>
            <p className="text-slate-500 font-medium leading-relaxed">True justice requires creating conditions in which every individual has a genuine opportunity to succeed, regardless of background.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
             <TrendingUp className="w-8 h-8 text-orange-400 mb-6 relative z-10" />
             <h3 className="text-xl font-black mb-3 relative z-10">Economy for All</h3>
             <p className="text-sm text-slate-400 font-medium relative z-10">Building an economy that empowers workers, farmers, and entrepreneurs.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 relative overflow-hidden group shadow-sm">
             <Users className="w-8 h-8 text-purple-500 mb-6" />
             <h3 className="text-xl font-black text-slate-900 mb-3">Youth Power</h3>
             <p className="text-sm text-slate-500 font-medium">Investing in skills, education, and health to harness the demographic dividend.</p>
          </motion.div>

        </div>
      </section>

      {/* ─── 5. JOIN CTA SECTION ─── */}
      {!loadingUser && !userData && (
        <section className="py-24 px-6 border-t border-slate-100 bg-white">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-5xl mx-auto bg-slate-950 rounded-[3rem] p-10 md:p-20 text-center text-white shadow-2xl relative overflow-hidden">
            
            <div className="absolute -left-40 -top-40 w-96 h-96 bg-blue-500/30 rounded-full blur-[100px] mix-blend-screen" />
            <div className="absolute -right-40 -bottom-40 w-96 h-96 bg-purple-500/30 rounded-full blur-[100px] mix-blend-screen" />
            
            <div className="relative z-10">
              <span className="w-fit mx-auto px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest border border-white/10 block mb-8">Take Action Today</span>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight">Be Part of the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Movement.</span></h2>
              <p className="text-lg md:text-xl text-slate-400 font-medium max-w-2xl mx-auto mb-12">
                Join thousands of citizens working together to build a nation where progress is not reserved for a privileged few, but shared across society.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/join" className="w-full sm:w-auto px-10 py-4 bg-white text-slate-950 font-black rounded-full shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform flex items-center justify-center gap-2 text-lg">
                  <HeartHandshake className="w-6 h-6" /> Join The Alliance
                </Link>
                <Link href="/login" className="w-full sm:w-auto px-10 py-4 bg-transparent border border-white/20 text-white font-black rounded-full hover:bg-white/10 transition-colors text-lg">
                  Member Login
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      )}
    </div>
  );
}