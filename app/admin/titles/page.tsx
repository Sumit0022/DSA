// app/admin/titles/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical,
  Crown, Shield, Award, Loader2, CheckCircle2,
  ShieldAlert, GitMerge, X, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ─── Types (unchanged) ─────────────────────────────────────────────────────────
type TitleNode = { id: string; title: string };
type RankTier  = { rank: number; titles: TitleNode[] };
type HierarchyType = { National: RankTier[]; State: RankTier[]; District: RankTier[] };

const DEFAULT_HIERARCHY: HierarchyType = {
  National: [
    { rank: 1, titles: [{ id: "nat_1", title: "National President" }] },
    { rank: 2, titles: [{ id: "nat_2", title: "National Vice President" }] },
  ],
  State: [
    { rank: 1, titles: [{ id: "st_1", title: "State President" }] },
    { rank: 2, titles: [{ id: "st_2", title: "State Vice President" }] },
    { rank: 3, titles: [{ id: "st_3", title: "State General Secretary" }, { id: "st_4", title: "State Joint Secretary" }] },
  ],
  District: [
    { rank: 1, titles: [{ id: "dist_1", title: "District President" }] },
    { rank: 2, titles: [{ id: "dist_2", title: "District Vice President" }, { id: "dist_3", title: "District General Secretary" }] },
  ],
};

// ─── Tab config ────────────────────────────────────────────────────────────────
const TABS: { key: keyof HierarchyType; label: string; icon: React.ElementType; accent: string; badge: string }[] = [
  { key: "National", label: "National", icon: Crown,  accent: "#B8860B", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "State",    label: "State",    icon: Shield, accent: "#007AFF", badge: "bg-blue-50 text-blue-700 border-blue-200"   },
  { key: "District", label: "District", icon: Award,  accent: "#6366F1", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
];

// ─── Tier pill colours (first tier gets special treatment) ────────────────────
const tierPillStyle = (isTop: boolean) =>
  isTop
    ? "bg-gray-900 text-white border-transparent"
    : "bg-white text-gray-800 border-gray-200 hover:border-gray-400 hover:bg-gray-50";

// ─── Component ────────────────────────────────────────────────────────────────
export default function TitleManagement() {
  const [hierarchy, setHierarchy]     = useState<HierarchyType>(DEFAULT_HIERARCHY);
  const [activeTab, setActiveTab]     = useState<keyof HierarchyType>("State");
  const [loading, setLoading]         = useState(true);
  const [isSaving, setIsSaving]       = useState(false);
  const [inputValues, setInputValues] = useState<Record<number, string>>({});
  const [toast, setToast]             = useState<{ message: string; type: "success" | "error" | null }>({ message: "", type: null });

  // Drag refs (unchanged)
  const dragItem     = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: null }), 3500);
  };

  // ── Fetch (unchanged logic) ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchHierarchy = async () => {
      try {
        const docRef  = doc(db, "settings", "roles_hierarchy");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const isNewSchema = data.National?.[0] && Array.isArray(data.National[0].titles);
          if (isNewSchema) {
            setHierarchy(data as HierarchyType);
          } else {
            await setDoc(docRef, DEFAULT_HIERARCHY);
            setHierarchy(DEFAULT_HIERARCHY);
          }
        } else {
          await setDoc(docRef, DEFAULT_HIERARCHY);
          setHierarchy(DEFAULT_HIERARCHY);
        }
      } catch (error) {
        console.error("Failed to load hierarchy", error);
        showToast("Failed to load command hierarchy.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchHierarchy();
  }, []);

  // ── Save (unchanged logic) ──────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, "settings", "roles_hierarchy");
      await setDoc(docRef, {
        National:  hierarchy.National,
        State:     hierarchy.State,
        District:  hierarchy.District,
        updatedAt: serverTimestamp(),
      });
      showToast("Hierarchy matrix synchronized successfully.", "success");
    } catch (error) {
      console.error(error);
      showToast("Error saving hierarchy structure.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Mutations (unchanged logic) ─────────────────────────────────────────────
  const handleAddTitleToTier = (rankIndex: number) => {
    const text = inputValues[rankIndex]?.trim();
    if (!text) return;
    const updated = { ...hierarchy };
    updated[activeTab][rankIndex].titles.push({
      id: `${activeTab.toLowerCase()}_node_${Date.now()}`,
      title: text,
    });
    setHierarchy(updated);
    setInputValues({ ...inputValues, [rankIndex]: "" });
  };

  const handleAddNewTierLevel = () => {
    const updated = { ...hierarchy };
    updated[activeTab] = [
      ...updated[activeTab],
      { rank: updated[activeTab].length + 1, titles: [] },
    ];
    setHierarchy(updated);
  };

  const handleDeleteTitle = (rankIndex: number, titleId: string) => {
    const updated = { ...hierarchy };
    updated[activeTab][rankIndex].titles = updated[activeTab][rankIndex].titles.filter(t => t.id !== titleId);
    setHierarchy(updated);
  };

  const handleDeleteTierLevel = (rankIndex: number) => {
    const updated = { ...hierarchy };
    updated[activeTab] = updated[activeTab]
      .filter((_, i) => i !== rankIndex)
      .map((tier, i) => ({ ...tier, rank: i + 1 }));
    setHierarchy(updated);
  };

  const handleRowSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    let tiers = [...hierarchy[activeTab]];
    const dragged = tiers.splice(dragItem.current, 1)[0];
    tiers.splice(dragOverItem.current, 0, dragged);
    tiers = tiers.map((t, i) => ({ ...t, rank: i + 1 }));
    dragItem.current = null;
    dragOverItem.current = null;
    setHierarchy({ ...hierarchy, [activeTab]: tiers });
  };

  const activeTabConfig = TABS.find(t => t.key === activeTab)!;

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center">
            <GitMerge className="w-6 h-6 text-[#007AFF]" />
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-[#007AFF] absolute -top-1 -right-1" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900">Loading Hierarchy</p>
          <p className="text-xs text-gray-400 mt-0.5 tracking-wide">Fetching command matrix…</p>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/*
        ┌─────────────────────────────────────────────┐
        │  Global style injection (no external deps)  │
        └─────────────────────────────────────────────┘
        Using a <style> tag so we can define custom CSS
        without touching tailwind.config.
      */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=DM+Mono:wght@400;500&display=swap');

        .cm-root { font-family: 'DM Sans', sans-serif; }
        .cm-mono  { font-family: 'DM Mono', monospace; }

        /* Subtle grid background */
        .cm-grid-bg {
          background-color: #F8F9FB;
          background-image:
            linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px);
          background-size: 32px 32px;
        }

        /* Rank connector line */
        .cm-tier-list { position: relative; }
        .cm-tier-list::before {
          content: '';
          position: absolute;
          left: 19px;
          top: 28px;
          bottom: 28px;
          width: 1px;
          background: linear-gradient(to bottom, #E5E7EB 0%, #D1D5DB 50%, #E5E7EB 100%);
          z-index: 0;
        }

        @media (max-width: 640px) {
          .cm-tier-list::before { display: none; }
        }

        /* Pill badge */
        .cm-pill {
          transition: all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .cm-pill:hover { transform: translateY(-1px); }

        /* Tier card entry */
        @keyframes tierSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cm-tier-card { animation: tierSlideIn 0.3s ease both; }

        /* Tab ink underline */
        .cm-tab-active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 10%;
          right: 10%;
          height: 2px;
          border-radius: 2px;
          background: currentColor;
        }

        /* Input focus glow */
        .cm-input:focus {
          border-color: #007AFF;
          box-shadow: 0 0 0 3px rgba(0,122,255,0.12);
        }

        /* Drag ghost */
        .cm-dragging { opacity: 0.4; }

        /* Save pulse */
        @keyframes savePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,122,255,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(0,122,255,0);  }
        }
        .cm-save-pulse { animation: savePulse 1.6s ease infinite; }
      `}</style>

      <div className="cm-root cm-grid-bg min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6 pb-16">

          {/* ── Toast ───────────────────────────────────────────────────── */}
          <AnimatePresence>
            {toast.type && (
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0,  scale: 1    }}
                exit={{   opacity: 0, y: 16, scale: 0.96  }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`fixed bottom-6 right-6 z-[500] flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-xl text-sm max-w-xs border backdrop-blur-sm ${
                  toast.type === "success"
                    ? "bg-gray-950/95 text-white border-gray-800"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                  toast.type === "success" ? "bg-emerald-500/20" : "bg-red-100"
                }`}>
                  {toast.type === "success"
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : <ShieldAlert  className="w-4 h-4 text-red-500"     />
                  }
                </div>
                <p className="font-medium leading-snug">{toast.message}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0   }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="bg-white border border-gray-200/80 rounded-3xl px-5 py-4 sm:px-7 sm:py-5 shadow-sm"
          >
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 cm-mono mb-4">
              <Link href="/admin/settings" className="hover:text-gray-600 transition-colors">Settings</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-600">Command Tiers</span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link
                  href="/admin/settings"
                  className="w-9 h-9 flex items-center justify-center bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all hover:scale-95 shrink-0"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-600" />
                </Link>

                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                      <GitMerge className="w-4 h-4 text-[#007AFF]" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-950 tracking-tight">
                      Command Tiers
                    </h1>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 ml-[2.625rem]">
                    Manage rank levels &amp; post titles across all jurisdictions
                  </p>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#007AFF] text-white rounded-xl text-sm font-semibold shadow-md hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${isSaving ? "cm-save-pulse" : ""}`}
              >
                {isSaving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Save    className="w-4 h-4" />             Save Matrix</>
                }
              </button>
            </div>
          </motion.div>

          {/* ── Tabs ────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.35 }}
            className="flex items-stretch bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden"
          >
            {TABS.map((tab, i) => {
              const Icon    = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-3.5 sm:py-4 px-2 text-sm font-semibold transition-all ${
                    i < TABS.length - 1 ? "border-r border-gray-100" : ""
                  } ${
                    isActive
                      ? "text-gray-950 bg-gray-50"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-50/50"
                  }`}
                >
                  <Icon
                    className="w-4 h-4 shrink-0"
                    style={{ color: isActive ? tab.accent : undefined }}
                  />
                  <span className="text-xs sm:text-sm">{tab.label}</span>

                  {/* Active indicator bar */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="activeTabBar"
                        className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                        style={{ backgroundColor: tab.accent }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        exit={{   scaleX: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </motion.div>

          {/* ── Pyramid Panel ───────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ delay: 0.15, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="bg-white border border-gray-200/80 rounded-3xl shadow-sm overflow-hidden"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${activeTabConfig.accent}18` }}
                >
                  <activeTabConfig.icon className="w-4 h-4" style={{ color: activeTabConfig.accent }} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-950">{activeTab} Hierarchy</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Drag rows to reorder · Add multiple posts per tier
                  </p>
                </div>
              </div>

              {/* Tier count badge */}
              <div className="cm-mono text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                {hierarchy[activeTab].length} tier{hierarchy[activeTab].length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Tier list */}
            <div className="px-5 py-6 sm:px-7 cm-tier-list space-y-4">
              <AnimatePresence initial={false}>
                {hierarchy[activeTab].map((tier, tierIdx) => {
                  const titles  = tier.titles || [];
                  const isTop   = tierIdx === 0;

                  return (
                    <motion.div
                      key={`${activeTab}-${tier.rank}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0  }}
                      exit={{   opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      draggable
                      onDragStart={() => (dragItem.current = tierIdx)}
                      onDragEnter={() => (dragOverItem.current = tierIdx)}
                      onDragEnd={handleRowSort}
                      onDragOver={e => e.preventDefault()}
                      className="flex items-start gap-3 sm:gap-4 group relative z-10"
                    >
                      {/* Left: drag handle + rank bubble */}
                      <div className="flex flex-col items-center gap-2 pt-3.5 shrink-0">
                        <button
                          title="Drag to reorder"
                          className="cursor-grab active:cursor-grabbing p-1 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>

                        {/* Rank bubble */}
                        <div
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center cm-mono text-[10px] font-bold transition-all ${
                            isTop
                              ? "border-amber-300 bg-amber-50 text-amber-600"
                              : "border-gray-200 bg-white text-gray-400"
                          }`}
                        >
                          {tier.rank}
                        </div>
                      </div>

                      {/* Tier card */}
                      <div
                        className={`flex-1 min-w-0 rounded-2xl border transition-all ${
                          isTop
                            ? "border-gray-900 bg-gray-950 text-white shadow-md"
                            : "border-gray-200 bg-gray-50/50 hover:border-gray-300"
                        }`}
                      >
                        {/* Card header */}
                        <div className={`flex items-center justify-between px-4 py-3 border-b ${
                          isTop ? "border-gray-800" : "border-gray-100"
                        }`}>
                          <div className="flex items-center gap-2">
                            {isTop && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            <span className={`cm-mono text-[10px] font-medium tracking-widest uppercase ${
                              isTop ? "text-gray-400" : "text-gray-400"
                            }`}>
                              Rank {tier.rank} · {titles.length} post{titles.length !== 1 ? "s" : ""}
                            </span>
                          </div>

                          {hierarchy[activeTab].length > 1 && (
                            <button
                              onClick={() => handleDeleteTierLevel(tierIdx)}
                              className={`p-1.5 rounded-lg transition-all ${
                                isTop
                                  ? "text-gray-500 hover:text-red-400 hover:bg-gray-800"
                                  : "text-gray-300 hover:text-red-500 hover:bg-red-50"
                              }`}
                              title="Delete this tier"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Pills */}
                        <div className="px-4 pt-4 pb-3 flex flex-wrap gap-2 min-h-[52px]">
                          <AnimatePresence>
                            {titles.length === 0 ? (
                              <motion.p
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className={`text-xs italic font-medium py-1 ${isTop ? "text-gray-500" : "text-gray-400"}`}
                              >
                                No posts yet — add one below
                              </motion.p>
                            ) : (
                              titles.map(node => (
                                <motion.div
                                  key={node.id}
                                  layout
                                  initial={{ opacity: 0, scale: 0.88 }}
                                  animate={{ opacity: 1, scale: 1    }}
                                  exit={{   opacity: 0, scale: 0.88, transition: { duration: 0.15 } }}
                                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                                  className={`cm-pill inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-xl border text-xs font-semibold ${tierPillStyle(isTop)}`}
                                >
                                  <span>{node.title}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTitle(tierIdx, node.id)}
                                    className={`p-0.5 rounded-md transition-all ${
                                      isTop
                                        ? "text-gray-500 hover:text-white hover:bg-red-500"
                                        : "text-gray-300 hover:text-red-600 hover:bg-red-50"
                                    }`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </motion.div>
                              ))
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Add input */}
                        <div className={`px-4 pb-4 flex gap-2 max-w-sm`}>
                          <input
                            type="text"
                            value={inputValues[tierIdx] || ""}
                            onChange={e => setInputValues({ ...inputValues, [tierIdx]: e.target.value })}
                            onKeyDown={e => e.key === "Enter" && handleAddTitleToTier(tierIdx)}
                            placeholder="e.g. Joint Secretary…"
                            className={`cm-input flex-1 min-w-0 px-3 py-2 rounded-xl text-xs font-medium border outline-none transition-all ${
                              isTop
                                ? "bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 focus:border-gray-500"
                                : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-400"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddTitleToTier(tierIdx)}
                            disabled={!inputValues[tierIdx]?.trim()}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all shrink-0 disabled:opacity-40 ${
                              isTop
                                ? "bg-white text-gray-900 hover:bg-gray-100 disabled:bg-gray-800 disabled:text-gray-600"
                                : "bg-gray-900 text-white hover:bg-gray-800"
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Panel footer: Add new tier */}
            <div className="px-5 pb-6 sm:px-7">
              <button
                type="button"
                onClick={handleAddNewTierLevel}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 hover:border-[#007AFF]/40 hover:bg-[#007AFF]/4 text-gray-400 hover:text-[#007AFF] rounded-2xl text-xs font-semibold uppercase tracking-wider transition-all group"
              >
                <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                Insert New Rank Level
              </button>
            </div>
          </motion.div>

          {/* ── Bottom hint ─────────────────────────────────────────────── */}
          <p className="text-center text-xs text-gray-400 cm-mono">
            Changes are local until you hit <strong className="text-gray-600">Save Matrix</strong>
          </p>

        </div>
      </div>
    </>
  );
}