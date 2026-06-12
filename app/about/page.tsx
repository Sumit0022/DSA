// app/about/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

// ─── COLOUR TOKENS (matching press page palette) ───
const C = {
  navy:    "#0f172a",
  navyMid: "#1e3a8a",
  blue:    "#2563eb",
  blueSoft:"#3b82f6",
  gold:    "#eab308",
  emerald: "#10b981",
  slate:   "#334155",
  muted:   "#94a3b8",
  light:   "#e2e8f0",
  white:   "#ffffff",
  bg:      "#f8fafc",
};

// ─── HOOK: intersection observer for scroll-reveal ───
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── ANIMATED COUNTER ───
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const { ref, visible } = useReveal(0.5);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(to / 60);
    const t = setInterval(() => {
      start += step;
      if (start >= to) { setVal(to); clearInterval(t); }
      else setVal(start);
    }, 16);
    return () => clearInterval(t);
  }, [visible, to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ─── PILLAR CARD ───
function PillarCard({ icon, title, body, delay }: { icon: string; title: string; body: string; delay: number }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      style={{
        background: C.white,
        border: `1px solid ${C.light}`,
        borderRadius: "16px",
        padding: "28px 24px",
        transition: `opacity 0.6s ${delay}ms, transform 0.6s ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        borderTop: `3px solid ${C.blue}`,
      }}
    >
      <div style={{ fontSize: "32px", marginBottom: "14px" }}>{icon}</div>
      <h3 style={{ fontSize: "17px", fontWeight: 700, color: C.navy, marginBottom: "10px", margin: "0 0 10px" }}>
        {title}
      </h3>
      <p style={{ fontSize: "14px", color: C.slate, lineHeight: "1.75", margin: 0 }}>{body}</p>
    </div>
  );
}

// ─── VISION ITEM ───
function VisionItem({ text, index }: { text: string; index: number }) {
  const { ref, visible } = useReveal(0.2);
  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
        padding: "14px 0",
        borderBottom: `1px solid ${C.light}`,
        transition: `opacity 0.5s ${index * 80}ms, transform 0.5s ${index * 80}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-20px)",
      }}
    >
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.blue}, ${C.emerald})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: C.white,
          fontSize: "13px",
          fontWeight: 700,
        }}
      >
        ✓
      </div>
      <p style={{ margin: 0, fontSize: "15px", color: C.slate, lineHeight: "1.6", paddingTop: "2px" }}>{text}</p>
    </div>
  );
}

// ─── STAT CARD ───
function StatCard({ value, suffix, label, delay }: { value: number; suffix: string; label: string; delay: number }) {
  const { ref, visible } = useReveal(0.4);
  return (
    <div
      ref={ref}
      style={{
        textAlign: "center",
        padding: "24px 12px",
        transition: `opacity 0.6s ${delay}ms, transform 0.6s ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.85)",
      }}
    >
      <div
        style={{
          fontSize: "clamp(28px, 8vw, 42px)",
          fontWeight: 900,
          color: C.white,
          lineHeight: 1,
          marginBottom: "8px",
        }}
      >
        <Counter to={value} suffix={suffix} />
      </div>
      <div style={{ fontSize: "13px", color: "#93c5fd", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
        {label}
      </div>
    </div>
  );
}

// ─── MAIN ABOUT PAGE ───
export default function AboutPage() {

  // Hero parallax
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Section reveals
  const missionReveal  = useReveal();
  const philosophyReveal = useReveal();
  const affReveal      = useReveal();

  const pillars = [
    { icon: "⚖️", title: "Democratic Participation", body: "Democracy lives in every citizen's daily engagement—not just at the ballot box. We champion inclusive, accessible civic participation at every level." },
    { icon: "🌱", title: "Social Equity", body: "Equal treatment alone cannot undo historical disadvantage. We believe in equity: targeted support so everyone has a genuine chance to succeed." },
    { icon: "💡", title: "Economic Opportunity", body: "Prosperity is meaningful only when widely shared. We advocate for policies that drive growth while ensuring no section of society is left behind." },
    { icon: "🏛️", title: "Accountable Governance", body: "Transparent, evidence-driven governance that serves the common good—not narrow interests. Institutions must be responsive and answerable to all." },
  ];

  const visionPoints = [
    "Every individual has access to meaningful opportunities.",
    "Democratic institutions remain transparent, accountable, and responsive.",
    "Public policy is guided by evidence, fairness, and social responsibility.",
    "Economic growth benefits society as a whole.",
    "Historical disadvantages are addressed through equitable measures.",
    "Citizens actively participate in democratic decision-making.",
  ];

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: C.bg, minHeight: "100vh", overflowX: "hidden" }}>

      {/* ── HERO ── */}
      <section
        ref={heroRef}
        style={{
          minHeight: "100svh",
          background: `linear-gradient(160deg, ${C.navy} 0%, ${C.navyMid} 60%, #1d4ed8 100%)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 24px 80px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative grid overlay */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)`,
          backgroundSize: "40px 40px",
          transform: `translateY(${scrollY * 0.2}px)`,
        }} />

        {/* Gold accent bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: "4px",
          background: `linear-gradient(90deg, ${C.gold}, ${C.emerald}, ${C.gold})`,
          backgroundSize: "200% 100%",
          animation: "shimmer 3s ease infinite",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "700px", margin: "0 auto" }}>

          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(37,99,235,0.25)",
            border: "1px solid rgba(96,165,250,0.3)",
            borderRadius: "100px",
            padding: "7px 18px",
            marginBottom: "28px",
            animation: "fadeUp 0.8s ease forwards",
            opacity: 0,
            animationDelay: "0.1s",
          }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: C.emerald, display: "inline-block", animation: "pulse 2s infinite" }} />
            <span style={{ color: "#93c5fd", fontSize: "13px", fontWeight: 600, letterSpacing: "0.5px" }}>
              Democratic Social Alliance
            </span>
          </div>

          <h1 style={{
            fontSize: "clamp(32px, 10vw, 62px)",
            fontWeight: 900,
            color: C.white,
            lineHeight: 1.1,
            marginBottom: "24px",
            letterSpacing: "-1px",
            animation: "fadeUp 0.8s ease forwards",
            animationDelay: "0.25s",
            opacity: 0,
          }}>
            Building a{" "}
            <span style={{
              background: `linear-gradient(135deg, ${C.gold}, #f59e0b)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              Fairer
            </span>{" "}
            Society
          </h1>

          <p style={{
            fontSize: "clamp(15px, 4vw, 18px)",
            color: "#bfdbfe",
            lineHeight: 1.75,
            marginBottom: "44px",
            animation: "fadeUp 0.8s ease forwards",
            animationDelay: "0.4s",
            opacity: 0,
          }}>
            Through equity, opportunity, and democratic participation — we work to ensure that
            every individual has a genuine chance to succeed, participate, and thrive.
          </p>

          <div style={{
            display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap",
            animation: "fadeUp 0.8s ease forwards",
            animationDelay: "0.55s",
            opacity: 0,
          }}>
            <Link
              href="/press"
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                background: C.blue,
                color: C.white,
                padding: "13px 26px",
                borderRadius: "100px",
                fontWeight: 700,
                fontSize: "15px",
                textDecoration: "none",
                boxShadow: "0 4px 24px rgba(37,99,235,0.4)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(37,99,235,0.5)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(37,99,235,0.4)"; }}
            >
              Press Wire <ArrowRight size={16} />
            </Link>
            <a
              href="#mission"
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: C.white,
                padding: "13px 26px",
                borderRadius: "100px",
                fontWeight: 600,
                fontSize: "15px",
                textDecoration: "none",
                transition: "background 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            >
              Our Mission
            </a>
          </div>
        </div>

        {/* Scroll nudge */}
        <div style={{
          position: "absolute", bottom: "28px",
          left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
          animation: "bounce 2s ease-in-out infinite",
          color: "rgba(255,255,255,0.35)",
        }}>
          <span style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase" }}>Scroll</span>
          <ChevronDown size={18} />
        </div>
      </section>

      {/* ── STATS BAND ── */}
      <section style={{
        background: `linear-gradient(135deg, ${C.navy}, #1e40af)`,
        padding: "20px 24px",
      }}>
        <div style={{
          maxWidth: "800px", margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
        }}>
          <StatCard value={15} suffix="+" label="States Active" delay={0} />
          <StatCard value={50000} suffix="+" label="Members" delay={120} />
          <StatCard value={8} suffix="+" label="Years Serving" delay={240} />
        </div>
      </section>

      {/* ── MISSION ── */}
      <section id="mission" style={{ padding: "80px 24px", maxWidth: "800px", margin: "0 auto" }}>
        <div
          ref={missionReveal.ref}
          style={{
            transition: "opacity 0.7s, transform 0.7s",
            opacity: missionReveal.visible ? 1 : 0,
            transform: missionReveal.visible ? "translateY(0)" : "translateY(40px)",
          }}
        >
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(37,99,235,0.08)",
            border: "1px solid rgba(37,99,235,0.18)",
            borderRadius: "100px",
            padding: "6px 16px",
            marginBottom: "20px",
          }}>
            <span style={{ color: C.blue, fontSize: "13px", fontWeight: 700, letterSpacing: "0.5px" }}>Our Mission</span>
          </div>

          <h2 style={{ fontSize: "clamp(24px, 7vw, 38px)", fontWeight: 900, color: C.navy, marginBottom: "22px", lineHeight: 1.2, letterSpacing: "-0.5px" }}>
            Equality isn't enough.{" "}
            <span style={{ color: C.blue }}>Equity is.</span>
          </h2>

          <div style={{
            borderLeft: `4px solid ${C.gold}`,
            paddingLeft: "20px",
            marginBottom: "28px",
            background: "rgba(234,179,8,0.04)",
            borderRadius: "0 8px 8px 0",
            padding: "16px 20px",
          }}>
            <p style={{ fontSize: "17px", color: C.slate, lineHeight: 1.8, margin: 0, fontStyle: "italic" }}>
              "We recognize that people do not begin life from the same starting point. Historical disadvantages, social barriers,
              and systemic exclusion have created conditions where equal treatment alone is often insufficient to produce fair outcomes."
            </p>
          </div>

          <p style={{ fontSize: "16px", color: C.slate, lineHeight: 1.8, marginBottom: "20px" }}>
            The Democratic Social Alliance is a movement dedicated to creating a society where every individual has a genuine
            opportunity to succeed, participate, and thrive. We believe that democracy reaches its full potential only when social
            and economic systems are structured to enable all people — not just the privileged few — to access opportunities,
            resources, and representation.
          </p>
          <p style={{ fontSize: "16px", color: C.slate, lineHeight: 1.8, margin: 0 }}>
            Our mission is to promote democratic values, social equity, responsible governance, and inclusive development — through
            research, advocacy, community engagement, and public participation.
          </p>
        </div>
      </section>

      {/* ── PILLARS ── */}
      <section style={{ background: C.bg, padding: "0 24px 80px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "44px" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px" }}>
            What We Stand For
          </p>
          <h2 style={{ fontSize: "clamp(22px, 6vw, 34px)", fontWeight: 900, color: C.navy, margin: "0 0 12px", lineHeight: 1.2 }}>
            Our Four Core Pillars
          </h2>
          <p style={{ fontSize: "15px", color: C.muted, maxWidth: "500px", margin: "0 auto", lineHeight: 1.7 }}>
            Every policy we advocate and every initiative we support is guided by these founding principles.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
          {pillars.map((p, i) => (
            <PillarCard key={p.title} {...p} delay={i * 100} />
          ))}
        </div>
      </section>

      {/* ── PHILOSOPHY (two-column on wide, stack on mobile) ── */}
      <section style={{ background: C.white, padding: "80px 24px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div
            ref={philosophyReveal.ref}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "48px",
              transition: "opacity 0.7s, transform 0.7s",
              opacity: philosophyReveal.visible ? 1 : 0,
              transform: philosophyReveal.visible ? "translateY(0)" : "translateY(40px)",
            }}
          >
            {/* Democracy Beyond Elections */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "42px", height: "42px", borderRadius: "10px",
                  background: `linear-gradient(135deg, ${C.blue}, ${C.navyMid})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "20px", flexShrink: 0,
                }}>🗳️</div>
                <h3 style={{ fontSize: "22px", fontWeight: 800, color: C.navy, margin: 0 }}>
                  Democracy Beyond Elections
                </h3>
              </div>
              <p style={{ fontSize: "15px", color: C.slate, lineHeight: 1.8, margin: 0, paddingLeft: "54px" }}>
                For DSA, democracy is more than voting. It is the continuous participation of citizens in shaping the
                policies, institutions, and decisions that affect their lives. We encourage civic engagement, public
                dialogue, policy awareness, and grassroots participation as essential elements of democratic governance.
                Citizens should not merely be observers — they should be active stakeholders.
              </p>
            </div>

            <div style={{ height: "1px", background: C.light }} />

            {/* Economic Opportunity */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "42px", height: "42px", borderRadius: "10px",
                  background: `linear-gradient(135deg, ${C.emerald}, #059669)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "20px", flexShrink: 0,
                }}>📈</div>
                <h3 style={{ fontSize: "22px", fontWeight: 800, color: C.navy, margin: 0 }}>
                  Economic Opportunity
                </h3>
              </div>
              <p style={{ fontSize: "15px", color: C.slate, lineHeight: 1.8, margin: 0, paddingLeft: "54px" }}>
                Economic development and social justice must advance together. Prosperity is most meaningful when its
                benefits are widely shared and every individual has access to quality education, healthcare, employment,
                and social security. We advocate for innovation and growth while ensuring vulnerable sections of society
                are never left behind.
              </p>
            </div>

            <div style={{ height: "1px", background: C.light }} />

            {/* Affirmative Action */}
            <div
              ref={affReveal.ref}
              style={{
                display: "flex", flexDirection: "column", gap: "16px",
                transition: "opacity 0.7s 0.15s, transform 0.7s 0.15s",
                opacity: affReveal.visible ? 1 : 0,
                transform: affReveal.visible ? "translateY(0)" : "translateY(30px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "42px", height: "42px", borderRadius: "10px",
                  background: `linear-gradient(135deg, #7c3aed, #5b21b6)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "20px", flexShrink: 0,
                }}>🤝</div>
                <h3 style={{ fontSize: "22px", fontWeight: 800, color: C.navy, margin: 0 }}>
                  Support for Affirmative Action
                </h3>
              </div>
              <p style={{ fontSize: "15px", color: C.slate, lineHeight: 1.8, margin: 0, paddingLeft: "54px" }}>
                DSA supports well-designed affirmative action policies that help address structural disadvantages faced
                by historically underrepresented and marginalised communities. We view affirmative action not as a
                permanent privilege, but as a corrective measure to create a more level playing field — expanding access
                to education, employment, leadership, and public representation.
              </p>
              <div style={{
                marginLeft: "54px",
                padding: "14px 18px",
                background: "rgba(124,58,237,0.06)",
                borderRadius: "10px",
                borderLeft: "3px solid #7c3aed",
              }}>
                <p style={{ margin: 0, fontSize: "14px", color: "#6d28d9", fontWeight: 600, lineHeight: 1.6 }}>
                  Our goal is not to divide society, but to build a more inclusive one where barriers are reduced
                  and opportunities are broadened for all.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VISION ── */}
      <section style={{ padding: "80px 24px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ marginBottom: "44px" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px" }}>
            Where We're Going
          </p>
          <h2 style={{ fontSize: "clamp(22px, 6vw, 34px)", fontWeight: 900, color: C.navy, margin: 0, lineHeight: 1.2 }}>
            Our Vision for Tomorrow
          </h2>
        </div>
        <div>
          {visionPoints.map((v, i) => (
            <VisionItem key={i} text={v} index={i} />
          ))}
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a8a 60%, #1d4ed8 100%)`,
        padding: "80px 24px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: "600px", margin: "0 auto" }}>
          <div style={{
            width: "60px", height: "4px",
            background: C.gold,
            borderRadius: "2px",
            margin: "0 auto 28px",
          }} />
          <h2 style={{ fontSize: "clamp(24px, 7vw, 38px)", fontWeight: 900, color: C.white, marginBottom: "16px", lineHeight: 1.2 }}>
            Be an Active Stakeholder in Democracy
          </h2>
          <p style={{ fontSize: "16px", color: "#bfdbfe", lineHeight: 1.8, marginBottom: "38px" }}>
            Democracy is most powerful when citizens participate. Explore our official press releases,
            mandates, and policy positions — and help shape a fairer future.
          </p>
          <Link
            href="/press"
            style={{
              display: "inline-flex", alignItems: "center", gap: "10px",
              background: C.white,
              color: C.navy,
              padding: "15px 32px",
              borderRadius: "100px",
              fontWeight: 800,
              fontSize: "16px",
              textDecoration: "none",
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            Read Press Releases <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        background: C.navy,
        borderTop: `1px solid rgba(255,255,255,0.07)`,
        padding: "28px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: C.white, padding: "3px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/dsa-logo.png" alt="DSA" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <span style={{ color: "#93c5fd", fontSize: "13px", fontWeight: 700 }}>Democratic Social Alliance</span>
        </div>
        <p style={{ color: "#475569", fontSize: "12px", margin: 0, textAlign: "center" }}>
          Building a fairer society through equity, opportunity, and democratic participation.
        </p>
      </footer>

      {/* ── GLOBAL KEYFRAMES ── */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(6px); }
        }
        @keyframes shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        * { box-sizing: border-box; }
        h1, h2, h3, p { margin: 0; }
      `}</style>
    </div>
  );
}
