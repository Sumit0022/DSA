// app/press/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Share, CheckCircle2, ArrowLeft, Loader2, X, ChevronLeft, ChevronRight, Download, FileText, Maximize2, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import * as htmlToImage from 'html-to-image';

// ─── HELPER: TIME FORMATTER ───
const formatTimeAgo = (timestamp: any) => {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 86400;
  if (interval > 1) {
    if (interval > 7) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return Math.floor(interval) + "d";
  }
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m";
  return "Just now";
};

// ─── COMPONENT: EXACT STRICT A4 PAGE ───
const LetterheadPage = ({ release, pageContent, pageIndex, totalPages, idStr }: any) => {
  
  const [liveSig, setLiveSig] = useState<string | null>(release.signatorySignature || null);

  useEffect(() => {
    if (liveSig || !release.signatoryName) return;
    const fetchSignature = async () => {
      try {
        const q = query(collection(db, "members"), where("name", "==", release.signatoryName));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docWithSig = snap.docs.find(d => d.data().signatureData) || snap.docs[0];
          const data = docWithSig.data();
          setLiveSig(data.signatureData || data.signatureUrl || data.signature || data.profilePic || null);
        }
      } catch (err) {
        console.error("Signature fetch failed:", err);
      }
    };
    fetchSignature();
  }, [release.signatoryName, liveSig]);

  return (
    <div id={idStr} className="relative flex flex-col overflow-hidden mx-auto shadow-sm" style={{ width: '550px', height: '777px', backgroundColor: '#ffffff' }}>
      
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
        <img src="/dsa-logo.png" alt="watermark" crossOrigin="anonymous" style={{ width: '80%', height: 'auto', filter: 'grayscale(100%)' }} />
      </div>

      {/* Premium Header (Only on Page 1) */}
      {pageIndex === 0 && (
        <div className="relative p-8 overflow-hidden shrink-0 z-10" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
          <div className="absolute right-0 top-0 bottom-0 z-0" style={{ width: '66%', backgroundColor: '#1e3a8a', clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}></div>
          <div className="absolute left-0 top-0 bottom-0 z-20" style={{ width: '8px', backgroundColor: '#2563eb' }}></div>
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="rounded-full shrink-0 flex items-center justify-center shadow-lg" style={{ width: '56px', height: '56px', backgroundColor: '#ffffff', padding: '6px' }}>
              <img src="/dsa-logo.png" crossOrigin="anonymous" alt="DSA" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => e.currentTarget.style.display='none'}/>
            </div>
            <div>
              <h2 className="uppercase tracking-widest" style={{ fontSize: '16px', fontWeight: '900', marginBottom: '2px' }}>Democratic Social Alliance</h2>
              <p className="tracking-wide" style={{ fontSize: '10px', fontWeight: '500', color: '#bfdbfe' }}>
                Official Press Wire • {release.locationDisplay || release.jurisdictionLevel} Command
              </p>
            </div>
          </div>
          
          <div className="relative z-10 w-full mt-5 mb-4 opacity-90" style={{ height: '2px', backgroundColor: '#eab308' }}></div>

          <div className="relative z-10 flex justify-between items-end">
             <h1 className="tracking-tight leading-none" style={{ fontSize: '24px', fontWeight: '900' }}>OFFICIAL PRESS RELEASE</h1>
             <span className="uppercase px-2.5 py-1 rounded shadow-sm tracking-widest" style={{ fontSize: '9px', fontWeight: '900', backgroundColor: '#10b981', color: '#ffffff' }}>PUBLIC MANDATE</span>
          </div>
        </div>
      )}

      {/* Document Body */}
      <div className="flex flex-col relative z-10 h-full overflow-hidden" style={{ padding: '32px 48px 64px 48px' }}>
        
        {pageIndex === 0 && (
          <div className="flex justify-between items-center mb-6 pb-4 shrink-0 font-mono" style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>
            <span>Ref: {release.refNumber}</span>
            <span>Date: {release.createdAt ? new Date(release.createdAt.toDate()).toLocaleDateString('en-IN') : 'N/A'}</span>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative flex flex-col">
          <div style={{ fontSize: '10.5px', color: '#111827', lineHeight: '2.2', fontFamily: 'serif', whiteSpace: 'pre-wrap', textAlign: 'justify' }}>
            {pageContent}
          </div>

          {/* Signature Block (Only on Last Page) */}
          {pageIndex === totalPages - 1 && (
            <div className="mt-10 flex justify-end shrink-0">
              <div className="text-center flex flex-col items-center" style={{ minWidth: '150px' }}>
                
                {liveSig ? (
                  <div className="mb-1.5 flex items-end justify-center" style={{ height: '48px' }}>
                     <img src={liveSig} crossOrigin="anonymous" alt="Signature" style={{ height: '100%', objectFit: 'contain', opacity: 0.9, mixBlendMode: 'multiply' }} />
                  </div>
                ) : (
                  <div className="mb-1.5 flex items-end justify-center" style={{ height: '48px' }}>
                     <span className="italic font-serif" style={{ color: '#9ca3af', fontSize: '10px' }}>Autographed</span>
                  </div>
                )}
                
                <div className="mb-1.5 opacity-70" style={{ width: '85%', borderBottom: '1px solid #1f2937' }}></div>
                
                <p className="uppercase tracking-tight leading-tight" style={{ fontSize: '11px', fontWeight: '900', color: '#111827' }}>{release.signatoryName}</p>
                <p className="leading-tight" style={{ fontSize: '9px', fontWeight: 'bold', color: '#6b7280' }}>{release.signatoryTitle}</p>
                
                <p className="mt-1.5 tracking-wide italic" style={{ fontSize: '9px', color: '#4b5563', fontFamily: "'Brush Script MT', cursive, serif" }}>
                  {release.createdAt ? new Date(release.createdAt.toDate()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Absolute Footer */}
        <div className="absolute bottom-6 left-0 right-0 text-center shrink-0">
           <p className="uppercase tracking-widest" style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af' }}>
             Page {pageIndex + 1} of {totalPages}
           </p>
        </div>
        
      </div>
    </div>
  );
};

// ─── HOOK: VIEWPORT-AWARE SCALE ───
// Returns a CSS scale factor so a 550×777 letterhead fits the screen perfectly
const useLetterheadScale = (containerRef: React.RefObject<HTMLDivElement | null>, padding = 32) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const availW = el.clientWidth  - padding;
      const availH = el.clientHeight - padding;
      const scaleW = availW / 550;
      const scaleH = availH / 777;
      setScale(Math.min(1, scaleW, scaleH));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, padding]);

  return scale;
};

// ─── COMPONENT: SINGLE PRESS RELEASE POST IN FEED ───
const PressReleasePost = ({ release, onOpenLightbox }: { release: any, onOpenLightbox: (r: any, idx: number, pages: string[]) => void }) => {
  
  const pages = useMemo(() => {
    if (!release.content) return [""];
    const LIMIT_PAGE_1 = 1400; 
    const LIMIT_NORMAL = 1800; 
    const SIGNATURE_COST = 350; 
    
    const tokens = release.content.split(/(\s+)/); 
    const result: string[] = [];
    let currentPage = "";
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      let limit = result.length === 0 ? LIMIT_PAGE_1 : LIMIT_NORMAL;
      
      if (currentPage.length + token.length > limit) {
        result.push(currentPage.trimEnd());
        currentPage = token.trimStart();
      } else {
        currentPage += token;
      }
    }
    
    if (currentPage.trim() || result.length === 0) {
      let limit = result.length === 0 ? LIMIT_PAGE_1 : LIMIT_NORMAL;
      if (currentPage.length > limit - SIGNATURE_COST && currentPage.trim() !== "") {
        result.push(currentPage.trimEnd());
        result.push("");
      } else {
        result.push(currentPage.trimEnd());
      }
    }
    
    return result.length > 0 ? result : [""];
  }, [release.content]);

  return (
    <div className="border-b border-gray-100 py-5 hover:bg-gray-50/30 transition-colors">
      
      <div className="flex gap-3 px-4">
        <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center p-1 shrink-0">
           <img src="/dsa-logo.png" alt="DSA Logo" className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-[15px]">
            <span className="font-bold text-gray-900 hover:underline truncate">DSA Official</span>
            <CheckCircle2 className="w-4 h-4 fill-[#007AFF] text-white shrink-0" />
            <span className="text-gray-500 truncate">@dsa_official</span>
            <span className="text-gray-500 shrink-0">· {formatTimeAgo(release.createdAt)}</span>
          </div>
          
          {release.caption && (
            <p className="text-[15px] text-gray-900 whitespace-pre-wrap mt-0.5 leading-snug">
              {release.caption}
            </p>
          )}
        </div>
      </div>

      {/* 
        Feed thumbnail: A4 aspect ratio box.
        We render the 550×777 letterhead inside a wrapper that scales it
        using a CSS transform with a JS-calculated scale based on the actual
        rendered width — this works on every screen size without container queries.
      */}
      <div className="mt-3 pl-4 pr-4 ml-[40px] md:ml-[44px]">
        <FeedThumbnail release={release} pages={pages} onOpenLightbox={onOpenLightbox} />
      </div>
    </div>
  );
};

// Separate component so we can use a ref + ResizeObserver cleanly
const FeedThumbnail = ({ release, pages, onOpenLightbox }: any) => {
  const wrapperRef = useState<HTMLDivElement | null>(null);
  const [containerW, setContainerW] = useState(0);
  const containerRef = { current: wrapperRef[0] };

  // Capture ref callback style
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!node) return;
    const observer = new ResizeObserver(() => setContainerW(node.clientWidth));
    observer.observe(node);
    setContainerW(node.clientWidth);
    return () => observer.disconnect();
  }, [node]);

  const scale = containerW > 0 ? containerW / 550 : 1;
  // Height of the outer box = intrinsic A4 height × scale
  const outerH = 777 * scale;

  return (
    <div
      ref={setNode}
      onClick={() => onOpenLightbox(release, 0, pages)}
      className="w-full relative overflow-hidden rounded-xl border border-gray-200 shadow-sm cursor-pointer group"
      style={{ height: `${outerH}px` }}
    >
      {pages.length > 1 && (
        <div className="absolute top-3 right-3 z-30 bg-gray-900/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
          <FileText className="w-3.5 h-3.5" /> 1 of {pages.length} Pages
        </div>
      )}

      <div className="absolute inset-0 z-20 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
        <div className="bg-gray-900/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 shadow-xl flex items-center gap-2">
          <Maximize2 className="w-4 h-4" /> Expand Document
        </div>
      </div>

      {/* The letterhead sits at natural 550×777, scaled from top-left */}
      {containerW > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '550px',
            height: '777px',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <LetterheadPage
            release={release}
            pageContent={pages[0]}
            pageIndex={0}
            totalPages={pages.length}
            idStr={`feed-${release.id}-0`}
          />
        </div>
      )}
    </div>
  );
};

// ─── MAIN PAGE ───
export default function PublicPressWire() {
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [lightboxData, setLightboxData] = useState<{release: any, activeIdx: number, pages: string[]} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | null }>({ message: "", type: null });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: null }), 3000);
  };

  useEffect(() => {
    if (lightboxData) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [lightboxData]);

  useEffect(() => {
    const q = query(collection(db, "press_releases"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const docs: any[] = [];
      snap.forEach(doc => {
        const data = doc.data();
        if (data.status === "published") docs.push({ id: doc.id, ...data });
      });
      setReleases(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleShare = async (release: any) => {
    const shareData = {
      title: 'DSA Official Press Wire',
      text: release.caption || 'Official Mandate from Democratic Social Alliance',
      url: window.location.href, 
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareData.text}\n\nRead more at: ${shareData.url}`);
        showToast("Link copied to clipboard!", "success");
      }
    } catch (err) { console.error("Error sharing:", err); }
  };

  const handleSaveImage = async () => {
    if (!lightboxData) return;
    try {
      setIsSaving(true);
      const element = document.getElementById(`lightbox-letterhead-${lightboxData.activeIdx}`);
      if (!element) return;
      
      const dataUrl = await htmlToImage.toJpeg(element, { 
        quality: 1.0, 
        pixelRatio: 2, 
        backgroundColor: '#ffffff'
      });
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `DSA_Mandate_Page_${lightboxData.activeIdx + 1}.jpg`;
      link.click();
      showToast("Document saved successfully!", "success");
    } catch(e) {
      console.error(e);
      showToast("Failed to save image. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      
      <AnimatePresence>
        {toast.type && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-8 right-8 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm border backdrop-blur-xl ${toast.type === "success" ? "bg-gray-900 text-white border-gray-800" : "bg-red-50 text-red-600 border-red-200"}`}>
            {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <ShieldAlert className="w-5 h-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[600px] bg-white min-h-screen border-x border-gray-200 flex flex-col relative pb-20 shadow-sm">
        
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-900" />
            </Link>
            <div>
              <h1 className="font-black text-gray-900 text-lg leading-tight flex items-center gap-1">
                DSA Press Wire <CheckCircle2 className="w-4 h-4 fill-[#007AFF] text-white" />
              </h1>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Official Mandates Hub</p>
            </div>
          </div>
          <img src="/dsa-logo.png" alt="DSA" className="w-9 h-9 object-contain drop-shadow-sm" />
        </div>

        {/* FEED */}
        <div className="flex-1 bg-white">
          {loading ? (
             <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" /></div>
          ) : releases.length === 0 ? (
            <div className="text-center py-20 text-gray-500 font-medium">No official releases published yet.</div>
          ) : (
            releases.map(release => (
              <PressReleasePost 
                key={release.id} 
                release={release} 
                onOpenLightbox={(r, idx, p) => setLightboxData({ release: r, activeIdx: idx, pages: p })} 
              />
            ))
          )}
        </div>
      </div>

      {/* ─── LIGHTBOX MODAL ─── */}
      <AnimatePresence>
        {lightboxData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // 🔑 Fixed inset-0, flex column — toolbar + document area fill screen properly
            className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-lg flex flex-col"
            style={{ touchAction: 'none' }}
          >
            
            {/* ── Toolbar (fixed height, always visible) ── */}
            <div className="flex-none flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10">
              <button
                onClick={() => setLightboxData(null)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors border border-white/20"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Page counter (multi-page) */}
              {lightboxData.pages.length > 1 && (
                <span className="text-white/70 text-sm font-bold">
                  {lightboxData.activeIdx + 1} / {lightboxData.pages.length}
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleShare(lightboxData.release)}
                  className="px-4 py-2 bg-white/10 text-white text-sm font-bold rounded-full hover:bg-white/20 transition-colors flex items-center gap-2 backdrop-blur-md border border-white/20"
                >
                  <Share className="w-4 h-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>
                <button
                  onClick={handleSaveImage}
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#007AFF] text-white text-sm font-bold rounded-full hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {isSaving ? "Saving..." : "Save JPG"}
                </button>
              </div>
            </div>

            {/* ── Document Area (fills remaining height, centered) ── */}
            <LightboxDocArea
              lightboxData={lightboxData}
              setLightboxData={setLightboxData}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

// ─── LIGHTBOX DOCUMENT AREA ───
// Separate component so ResizeObserver can observe the flex-1 area directly
function LightboxDocArea({ lightboxData, setLightboxData }: { lightboxData: any, setLightboxData: any }) {
  const [areaNode, setAreaNode] = useState<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!areaNode) return;

    const calcScale = () => {
      // 48px horizontal padding (24 each side) + 16px vertical padding
      const availW = areaNode.clientWidth  - 48;
      const availH = areaNode.clientHeight - 16;
      const sw = availW / 550;
      const sh = availH / 777;
      setScale(Math.min(1, sw, sh));
    };

    const ro = new ResizeObserver(calcScale);
    ro.observe(areaNode);
    calcScale();
    return () => ro.disconnect();
  }, [areaNode]);

  const goLeft  = () => setLightboxData((p: any) => p ? { ...p, activeIdx: Math.max(0, p.activeIdx - 1) } : null);
  const goRight = () => setLightboxData((p: any) => p ? { ...p, activeIdx: Math.min(p.pages.length - 1, p.activeIdx + 1) } : null);

  return (
    <div
      ref={setAreaNode}
      className="flex-1 flex items-center justify-center relative overflow-hidden"
    >
      {/* Left arrow — only overlaps outside the document area on larger screens */}
      {lightboxData.pages.length > 1 && (
        <>
          <button
            onClick={goLeft}
            disabled={lightboxData.activeIdx === 0}
            className="absolute left-2 z-10 w-10 h-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all disabled:opacity-0 shadow-2xl"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goRight}
            disabled={lightboxData.activeIdx === lightboxData.pages.length - 1}
            className="absolute right-2 z-10 w-10 h-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all disabled:opacity-0 shadow-2xl"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={lightboxData.activeIdx}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          // The outer box is exactly the scaled A4 size so it centres perfectly
          style={{
            width:  `${550 * scale}px`,
            height: `${777 * scale}px`,
            position: 'relative',
          }}
        >
          {/* Letterhead at its native size, scaled from top-left corner */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '550px',
              height: '777px',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <LetterheadPage
              release={lightboxData.release}
              pageContent={lightboxData.pages[lightboxData.activeIdx]}
              pageIndex={lightboxData.activeIdx}
              totalPages={lightboxData.pages.length}
              idStr={`lightbox-letterhead-${lightboxData.activeIdx}`}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}