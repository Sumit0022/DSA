// app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { collection, query, orderBy, onSnapshot, where, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import {
  ArrowRight, HeartHandshake, BookOpen, ShieldCheck,
  Zap, TrendingUp, Scale, Users, Flame, LayoutGrid, 
  Shield, GraduationCap, Vote, MapPin, Calendar, 
  Megaphone, ChevronRight, CheckCircle2, Building2,
  Globe, Globe2, Network
} from "lucide-react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";

/* ═══ 3D TILT CARD COMPONENT ═══ */
function TiltCard({ children, className = "", style = {} }: { children: React.ReactNode, className?: string, style?: any }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for 3D effect
  const mouseXSpring = useSpring(x, { stiffness: 400, damping: 40 });
  const mouseYSpring = useSpring(y, { stiffness: 400, damping: 40 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div style={{ perspective: "1500px" }} className={className}>
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateY,
          rotateX,
          transformStyle: "preserve-3d",
          ...style
        }}
        className="w-full h-full relative"
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ═══ Animated Counter ═══ */
function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref as any, { once: true, margin: "-50px" });
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current || value === 0) return;
    started.current = true;
    const dur = 2000;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      setDisplay(Math.floor((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);

  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
}

/* ═══ Framer Variants ═══ */
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const fadeUp = { 
  hidden: { opacity: 0, y: 30 }, 
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } }
};
const fade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 1, ease: "easeOut" as const } }
};

export default function HomePage() {
  const { userData, loadingUser } = useUser();
  const [petitions, setPetitions] = useState<any[]>([]);
  const [stats, setStats] = useState({ members: 0, districts: 0, events: 0, petitions: 0 });

  useEffect(() => {
    const q = query(collection(db, "petitions"), where("isBoosted", "==", true));
    return onSnapshot(q, s => {
      const d = s.docs.map(x => ({ id: x.id, ...x.data() }));
      d.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setPetitions(d.slice(0, 3));
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [m, e, p] = await Promise.all([
          getCountFromServer(collection(db, "members")),
          getCountFromServer(collection(db, "events")),
          getCountFromServer(collection(db, "petitions")),
        ]);
        setStats({ members: m.data().count, events: e.data().count, petitions: p.data().count, districts: 12 });
      } catch { setStats({ members: 1500, districts: 12, events: 120, petitions: 45 }); }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans selection:bg-[#007AFF]/20 text-[#111827] overflow-x-hidden">

      {/* ═══════════════════════════════════════════
          SECTION 1: THE HEADQUARTERS HERO (3D)
      ═══════════════════════════════════════════ */}
      <section className="relative pt-[120px] md:pt-[160px] pb-20 md:pb-32 px-6 perspective-[1000px]">
        {/* Background elements in their own overflow hidden container so it doesn't break 3D space */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[60%] bg-blue-500/10 rounded-full blur-[120px] animate-soft-breathe" />
          <div className="absolute top-[20%] right-[-5%] w-[40%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] animate-soft-breathe" style={{ animationDelay: '2s' }} />
        </div>

        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="flex flex-col items-center">
            
            <motion.div variants={fadeUp} className="mb-6 flex items-center gap-2 px-4 py-1.5 bg-white/60 backdrop-blur-md border border-slate-200/60 rounded-full shadow-sm hover:scale-105 transition-transform cursor-default">
              <div className="w-2 h-2 rounded-full bg-[#007AFF] animate-pulse" />
              <span className="text-[11px] md:text-xs font-bold text-slate-600 uppercase tracking-widest">
                Official Digital Headquarters
              </span>
            </motion.div>

            {/* 3D Headline */}
            <TiltCard className="w-full">
              <div style={{ transform: "translateZ(40px)" }}>
                <motion.h1 variants={fadeUp} className="text-5xl md:text-[5.5rem] font-black tracking-tight leading-[1.05] text-slate-900 mb-6 max-w-4xl mx-auto drop-shadow-xl">
                  A New Vision for a <br className="hidden md:block" />
                  <span className="bg-gradient-to-r from-[#007AFF] to-[#34C759] text-transparent bg-clip-text">Stronger India.</span>
                </motion.h1>
              </div>
            </TiltCard>

            <motion.p variants={fadeUp} className="text-lg md:text-xl text-slate-500 font-semibold max-w-2xl mx-auto mb-10 leading-relaxed">
              We are a movement of the people, committed to transparent governance, economic justice, and defending the constitutional rights of every citizen.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href="/join" className="group relative px-8 py-4 bg-[#007AFF] text-white font-bold rounded-full text-base flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 duration-300">
                <span>Join the Alliance</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/vision" className="px-8 py-4 bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-700 font-bold rounded-full text-base flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-all shadow-md hover:shadow-lg hover:-translate-y-1 duration-300">
                Read Our Vision
              </Link>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 2: LIVE IMPACT (3D Hover Stats)
      ═══════════════════════════════════════════ */}
      <section className="py-12 bg-white/80 backdrop-blur-md border-y border-slate-100 relative z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            variants={stagger} 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 divide-x-0 md:divide-x divide-slate-100"
          >
            {[
              { label: "Active Members", val: stats.members, suffix: "+" },
              { label: "Districts Reached", val: stats.districts, suffix: "" },
              { label: "Events Organized", val: stats.events, suffix: "+" },
              { label: "Active Petitions", val: stats.petitions, suffix: "" }
            ].map((s, i) => (
              <motion.div key={i} variants={fade} className="text-center md:px-4 group cursor-default">
                <p className="text-3xl md:text-5xl font-black text-slate-900 mb-1 tracking-tight group-hover:scale-110 group-hover:text-[#007AFF] transition-all duration-300 origin-center">
                  <Counter value={s.val} suffix={s.suffix} />
                </p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 3: QUICK ACTIONS (3D Tilt Cards)
      ═══════════════════════════════════════════ */}
      <section className="py-20 md:py-28 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Our Vision", desc: "Explore the comprehensive manifesto and ideological foundation of the Alliance.", icon: BookOpen, href: "/vision", color: "text-[#007AFF]", bg: "bg-blue-50", shadow: "shadow-blue-500/10" },
              { title: "Press Wire", desc: "Read official mandates, resolutions, and organizational updates in real-time.", icon: Zap, href: "/press", color: "text-[#34C759]", bg: "bg-emerald-50", shadow: "shadow-emerald-500/10" },
              { title: "Media Gallery", desc: "Browse high-quality photo and video highlights from our grassroots events.", icon: LayoutGrid, href: "/gallery", color: "text-purple-600", bg: "bg-purple-50", shadow: "shadow-purple-500/10" }
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} className="h-full">
                <TiltCard className="h-full">
                  <Link href={item.href} className={`group block h-full bg-white rounded-3xl p-8 border border-slate-100/80 shadow-xl ${item.shadow} hover:shadow-2xl transition-shadow duration-300 relative`}>
                    
                    {/* Background Icon Wrapper (no 3D pop so it doesn't clip) */}
                    <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                      <div className="absolute -right-8 -top-8 opacity-5 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none">
                        <item.icon className={`w-48 h-48 ${item.color}`} />
                      </div>
                    </div>

                    <div className="relative z-10" style={{ transform: "translateZ(30px)" }}>
                      <div className={`w-14 h-14 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center mb-6 shadow-inner`}>
                        <item.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-3">{item.title}</h3>
                      <p className="text-slate-500 font-semibold leading-relaxed mb-8">{item.desc}</p>
                      <div className="flex items-center text-sm font-bold text-slate-900 group-hover:text-[#007AFF] transition-colors">
                        Explore Platform <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 4: WHO WE ARE (3D Layers Redesign)
      ═══════════════════════════════════════════ */}
      <section className="py-20 md:py-32 bg-white px-6 relative border-y border-slate-100">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            
            {/* Left Content */}
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: "easeOut" }}>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.15] mb-6">
                We don't just promise change. <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-[#007AFF] to-[#34C759] text-transparent bg-clip-text drop-shadow-sm">We organize it.</span>
              </h2>
              <p className="text-lg text-slate-500 font-semibold leading-relaxed mb-8">
                The Democratic Social Alliance is a movement rooted in the belief that development isn't a privilege—it's a constitutional right. We are building a structured, disciplined, and people-first organization.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "Grassroots leadership and community engagement.",
                  "Data-driven policy making for social equity.",
                  "Uncompromising stance on constitutional values."
                ].map((text, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + (i * 0.1) }} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#34C759] shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-bold">{text}</span>
                  </motion.li>
                ))}
              </ul>
              <Link href="/about" className="inline-flex items-center gap-2 text-[#007AFF] font-bold hover:text-blue-700 hover:gap-3 transition-all">
                Read our full story <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Right Side: Redesigned 3D "Foundation" Card */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: "easeOut" }} className="w-full">
              <TiltCard>
                <div className="relative min-h-[420px] md:aspect-[4/3] rounded-[2rem] bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 shadow-2xl p-8 sm:p-10 md:p-12 group flex flex-col justify-center">
                  
                  {/* Background elements wrapped in overflow-hidden so main 3D card doesn't clip */}
                  <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 flex items-center justify-center opacity-10">
                      <Network className="w-[150%] h-[150%] md:w-full md:h-full p-4 md:p-10 text-blue-500 animate-[spin-slow_60s_linear_infinite]" />
                    </div>
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
                  </div>
                  
                  {/* Glowing Top Bar */}
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#007AFF] to-[#34C759] shadow-[0_0_15px_rgba(0,122,255,0.5)]" style={{ transform: "translateZ(20px)" }} />

                  {/* 3D Floating Icon Box */}
                  <div className="w-20 h-20 rounded-2xl bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center mb-8 border border-slate-100 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500" style={{ transform: "translateZ(50px)" }}>
                    <Globe2 className="w-10 h-10 text-[#007AFF]" />
                  </div>

                  <div style={{ transform: "translateZ(40px)" }}>
                    <h3 className="text-3xl font-black text-slate-900 mb-4 drop-shadow-sm">A Foundation Built on Trust.</h3>
                    <p className="text-slate-600 font-semibold text-lg leading-relaxed">
                      We are establishing decentralized command centers across the nation to ensure every citizen has direct, transparent access to our leadership.
                    </p>
                  </div>

                  {/* Floating decorative nodes */}
                  <div className="absolute right-10 bottom-10 flex gap-2" style={{ transform: "translateZ(60px)" }}>
                    <div className="w-3 h-3 rounded-full bg-[#007AFF] animate-ping" />
                    <div className="w-3 h-3 rounded-full bg-[#34C759]" />
                  </div>

                </div>
              </TiltCard>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 5: PRIORITY MANDATES (3D Lift)
      ═══════════════════════════════════════════ */}
      {petitions.length > 0 && (
        <section className="py-20 md:py-32 bg-[#F8FAFC] px-6 relative">
          <div className="max-w-7xl mx-auto">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100/50 border border-orange-200 text-orange-600 rounded-full text-xs font-bold uppercase tracking-widest mb-4 shadow-sm">
                  <Flame className="w-4 h-4" /> Active Campaigns
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight drop-shadow-sm">Priority Mandates</h2>
              </motion.div>
              <Link href="/petition" className="text-slate-500 font-bold hover:text-[#007AFF] transition-colors flex items-center gap-1 group">
                View all mandates <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className={`grid grid-cols-1 ${petitions.length === 1 ? 'md:grid-cols-1' : petitions.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-8`}>
              {petitions.map((p: any) => {
                const pct = Math.min(100, Math.round(((p.signatureCount || 0) / (p.targetSignatures || 1)) * 100));
                return (
                  <motion.div key={p.id} variants={fadeUp} className="h-full">
                    <TiltCard className="h-full">
                      <Link href={`/petition/${p.id}`} className="group block bg-white rounded-3xl p-8 border border-slate-200/60 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:border-orange-200 transition-all duration-300 h-full flex flex-col relative">
                        
                        {/* Subtle 3D background gradient with its own overflow hidden to not clip 3D content */}
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl overflow-hidden pointer-events-none" />

                        <div className="flex-1 relative z-10" style={{ transform: "translateZ(30px)" }}>
                          <div className="flex items-center gap-2 mb-5">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                            </span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active</span>
                          </div>
                          <h3 className="text-2xl font-black text-slate-900 mb-3 line-clamp-2 group-hover:text-orange-600 transition-colors drop-shadow-sm">{p.title || "Priority Mandate"}</h3>
                          <p className="text-sm text-slate-600 font-semibold mb-8 line-clamp-2">{p.description || "Loading mandate details..."}</p>
                        </div>
                        
                        <div className="pt-6 border-t border-slate-100 mt-auto relative z-10" style={{ transform: "translateZ(20px)" }}>
                          <div className="flex justify-between items-end mb-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progress</span>
                            <span className="text-sm font-black text-slate-900">{p.signatureCount?.toLocaleString() || 0} <span className="text-slate-400 font-semibold">/ {p.targetSignatures?.toLocaleString()}</span></span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-4 shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }} 
                              whileInView={{ width: `${pct}%` }} 
                              viewport={{ once: true }} 
                              transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                              className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500 shadow-sm" 
                            />
                          </div>
                          <div className="text-sm font-bold text-orange-600 flex items-center">
                            Sign Mandate <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </Link>
                    </TiltCard>
                  </motion.div>
                );
              })}
            </motion.div>

          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          SECTION 6: CORE PRINCIPLES (3D Grid)
      ═══════════════════════════════════════════ */}
      <section className="py-20 md:py-32 px-6 bg-white relative">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 drop-shadow-sm">Our Core Principles</h2>
            <p className="text-lg text-slate-500 font-semibold max-w-2xl mx-auto">The foundational beliefs that guide every policy, decision, and action we take.</p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Vote, title: "Democratic Accountability", desc: "Every elected representative must answer to the people. We fight for uncompromising transparency.", color: "text-[#007AFF]", bg: "bg-blue-50" },
              { icon: Scale, title: "Constitutional Supremacy", desc: "Liberty, equality, and fraternity are non-negotiable. We defend the constitution at all costs.", color: "text-[#34C759]", bg: "bg-emerald-50" },
              { icon: GraduationCap, title: "Education for All", desc: "Quality education is a fundamental right. We advocate for empowered teachers and better infrastructure.", color: "text-purple-600", bg: "bg-purple-50" },
              { icon: HeartHandshake, title: "Social Harmony", desc: "India's strength is its diversity. We stand for unity and mutual respect across all communities.", color: "text-rose-500", bg: "bg-rose-50" },
              { icon: TrendingUp, title: "Economic Justice", desc: "Growth must be inclusive. We demand fair wages, farmer rights, and protection for small businesses.", color: "text-orange-500", bg: "bg-orange-50" },
              { icon: Shield, title: "People Before Statistics", desc: "Real progress is measured by the well-being of the poorest citizen, not just GDP numbers.", color: "text-cyan-600", bg: "bg-cyan-50" }
            ].map((p, i) => (
              <motion.div key={i} variants={fadeUp}>
                <TiltCard>
                  <div className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 h-full">
                    <div className={`w-14 h-14 ${p.bg} ${p.color} rounded-2xl flex items-center justify-center mb-6 shadow-inner`} style={{ transform: "translateZ(30px)" }}>
                      <p.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-3" style={{ transform: "translateZ(20px)" }}>{p.title}</h3>
                    <p className="text-sm text-slate-600 font-semibold leading-relaxed" style={{ transform: "translateZ(10px)" }}>{p.desc}</p>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 7: JOIN CTA (Floating 3D)
      ═══════════════════════════════════════════ */}
      {!loadingUser && !userData && (
        <section className="py-24 md:py-32 px-6">
          <div className="max-w-5xl mx-auto perspective-[1000px]">
            <TiltCard>
              <div className="relative rounded-[3rem] bg-white shadow-2xl border border-slate-100 group">
                
                {/* Background animations wrapped in overflow-hidden */}
                <div className="absolute inset-0 rounded-[3rem] overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 via-white to-emerald-100/30 group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                  <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
                </div>
                
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="relative z-10 px-8 py-16 md:p-24 text-center">
                  <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-6 drop-shadow-md" style={{ transform: "translateZ(40px)" }}>
                    Ready to make a difference?
                  </h2>
                  <p className="text-xl text-slate-600 font-bold max-w-2xl mx-auto mb-12 drop-shadow-sm" style={{ transform: "translateZ(30px)" }}>
                    Join thousands of citizens working together to build an India where progress is not reserved for a privileged few.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6" style={{ transform: "translateZ(50px)" }}>
                    <Link href="/join" className="w-full sm:w-auto px-12 py-5 bg-[#007AFF] text-white font-black rounded-full text-lg hover:bg-blue-600 hover:-translate-y-1 transition-all duration-300 shadow-xl shadow-blue-500/30">
                      Join the Movement
                    </Link>
                    <Link href="/login" className="w-full sm:w-auto px-12 py-5 bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-700 font-black rounded-full text-lg hover:bg-slate-50 hover:-translate-y-1 transition-all duration-300 shadow-md">
                      Member Login
                    </Link>
                  </div>
                </motion.div>
              </div>
            </TiltCard>
          </div>
        </section>
      )}

    </div>
  );
}