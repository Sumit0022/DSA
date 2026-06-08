// app/petition/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  doc, getDoc, collection, addDoc, updateDoc,
  increment, serverTimestamp, query, where, getDocs
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import QRCode from "qrcode";
import {
  FileSignature, Loader2, Share2, Download,
  CheckCircle2, AlertTriangle, ShieldCheck, Smartphone, User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── CANVAS DIMENSIONS — must match studio exactly ───────────────────────────
const CANVAS_W = 1080;
const CANVAS_H = 1440;
const ELEMENT_TEXT_PAD = 8;

// ─── GOOGLE FONTS — same link href the studio injects ────────────────────────
const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900" +
  "&family=Montserrat:wght@400;600;700;900" +
  "&family=Oswald:wght@400;600;700" +
  "&family=Raleway:wght@400;600;700;900" +
  "&family=Bebas+Neue" +
  "&family=Cinzel:wght@400;700;900" +
  "&family=Lora:wght@400;700" +
  "&family=Libre+Baskerville:wght@400;700" +
  "&family=Exo+2:wght@400;600;700;900" +
  "&family=Poppins:wght@400;600;700;900" +
  "&family=Noto+Serif+Devanagari:wght@400;700;900" +
  "&family=Tiro+Devanagari+Hindi" +
  "&family=Mukta:wght@400;600;700;800" +
  "&display=swap";

// ─── Ensure Google Fonts are loaded into the document so canvas can use them ─
// Uses the same approach as the studio (link tag injection) then waits for
// document.fonts.ready — the only reliable way to guarantee canvas font access.
async function ensureFontsLoaded(): Promise<void> {
  const LINK_ID = "google-fonts-petition-canvas";
  if (!document.getElementById(LINK_ID)) {
    const link = document.createElement("link");
    link.id = LINK_ID;
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_HREF;
    document.head.appendChild(link);
  }
  // Wait until ALL fonts in the document are loaded (includes the ones we just injected)
  await document.fonts.ready;
}

export default function PublicPetitionPage() {
  const params = useParams();
  const petitionId = params.id as string;

  const [petition, setPetition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [indiaData, setIndiaData] = useState<Record<string, string[]>>({});

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedPoster, setGeneratedPoster] = useState<string | null>(null);

  // ─── FETCH STATES & DISTRICTS ─────────────────────────────────────────────
  useEffect(() => {
    fetch("https://raw.githubusercontent.com/sab99r/Indian-States-And-Districts/master/states-and-districts.json")
      .then(r => r.json())
      .then(data => {
        const fmt: Record<string, string[]> = {};
        data.states.forEach((item: any) => { fmt[item.state] = item.districts; });
        setIndiaData(fmt);
      })
      .catch(err => console.error("Failed to load locations", err));
  }, []);

  // ─── FETCH PETITION ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!petitionId) return;
    getDoc(doc(db, "petitions", petitionId))
      .then(snap => {
        if (snap.exists()) setPetition({ id: snap.id, ...snap.data() });
      })
      .catch(err => console.error("Error fetching petition", err))
      .finally(() => setLoading(false));
  }, [petitionId]);

  // ─── FETCH PRESIDENT SIGNATURES ───────────────────────────────────────────
  const getPresidentsSignatures = async (userState: string) => {
    const BLANK = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    let natSign = BLANK;
    let stateSign = BLANK;
    try {
      const membersRef = collection(db, "members");

      const natSnap = await getDocs(query(membersRef, where("roleLevel", "==", "National")));
      natSnap.forEach(d => {
        const data = d.data();
        if (data.roleTitle?.toLowerCase().includes("president") && data.signatureData)
          natSign = data.signatureData;
      });

      const stateSnap = await getDocs(
        query(membersRef, where("roleLevel", "==", "State"), where("state", "==", userState))
      );
      stateSnap.forEach(d => {
        const data = d.data();
        if (data.roleTitle?.toLowerCase().includes("president") && data.signatureData)
          stateSign = data.signatureData;
      });
    } catch (err) {
      console.error("Error fetching signatures", err);
    }
    return { natSign, stateSign };
  };

  // ─── LOAD IMAGE HELPER ────────────────────────────────────────────────────
  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(img); // resolve even on error (transparent 1×1 fallback)
      img.src = src;
    });

  // ─── PARSE textShadow CSS → canvas shadow properties ─────────────────────
  // Input format (from studio): "0px 4px 15px rgba(0,0,0,0.6)"
  // Regex captures first 3 numeric values, rest is color string (handles rgba/hex/named)
  const applyTextShadow = (ctx: CanvasRenderingContext2D, shadowStr: string, enabled: boolean) => {
    if (!enabled || !shadowStr || shadowStr === "none") {
      ctx.shadowColor   = "transparent";
      ctx.shadowBlur    = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      return;
    }
    const m = shadowStr.trim().match(/^(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+([\d.]+)(?:px)?\s+(.*)/);
    if (m) {
      ctx.shadowOffsetX = parseFloat(m[1]) || 0;
      ctx.shadowOffsetY = parseFloat(m[2]) || 0;
      ctx.shadowBlur    = parseFloat(m[3]) || 0;
      ctx.shadowColor   = m[4] || "rgba(0,0,0,0.5)";
    } else {
      ctx.shadowColor   = "rgba(0,0,0,0.5)";
      ctx.shadowBlur    = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 3;
    }
  };

  const resetShadow = (ctx: CanvasRenderingContext2D) => {
    ctx.shadowColor   = "transparent";
    ctx.shadowBlur    = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };

  // ─── CANVAS ROUNDED RECT ─────────────────────────────────────────────────
  const drawRoundRect = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x,     y,     x + r, y);
    ctx.closePath();
  };

  const normalizeCanvasText = (text: string) => text.replace(/\s+/g, " ").trim();

  const splitLongWord = (ctx: CanvasRenderingContext2D, word: string, maxWidth: number) => {
    if (!word || ctx.measureText(word).width <= maxWidth || maxWidth <= 0) return [word];
    const chunks: string[] = [];
    let chunk = "";

    for (const char of word) {
      const test = chunk + char;
      if (chunk && ctx.measureText(test).width > maxWidth) {
        chunks.push(chunk);
        chunk = char;
      } else {
        chunk = test;
      }
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  };

  const wrapCanvasText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = normalizeCanvasText(text).split(" ").filter(Boolean);
    if (!words.length) return [""];

    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (!line || ctx.measureText(test).width <= maxWidth) {
        line = test;
        continue;
      }

      lines.push(line);
      const chunks = splitLongWord(ctx, word, maxWidth);
      lines.push(...chunks.slice(0, -1));
      line = chunks[chunks.length - 1] || "";
    }

    if (line) lines.push(line);
    return lines;
  };

  // ─── MAIN CANVAS ENGINE ───────────────────────────────────────────────────
  // This function is the single source of truth for rendering.
  // It mirrors the studio's renderElement() logic 1:1 for every property.
  //
  // Studio layout model (what we must replicate on canvas):
  //   Container div: position:absolute; left:x%; top:y%; width:w%; height:h%
  //                  display:flex; alignItems:center; justifyContent:center
  //                  boxSizing:border-box
  //   Text span:     width:100%; padding:0 8px; boxSizing:border-box
  //                  textAlign:el.align; fontFamily; fontWeight; fontSize
  //                  textShadow (if enabled)
  //
  // Canvas translation:
  //   xPx = (el.x/100)*1080,  yPx = (el.y/100)*1440
  //   wPx = (el.w/100)*1080,  hPx = (el.h/100)*1440
  //   textBaseline = "middle", drawY = yPx + hPx/2   → replicates alignItems:center
  //   PAD = 8px (same as padding:0 8px on the span)
  //   drawX for left  = xPx + PAD
  //   drawX for right = xPx + wPx - PAD
  //   drawX for center= xPx + wPx/2  (padding is symmetric so center doesn't shift)

  const handleSignPetition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || phone.length !== 10 || !state || !district) {
      alert("Please fill all details correctly.");
      return;
    }
    setIsSubmitting(true);

    try {
      // 1. Ensure all Google Fonts used by the studio are loaded in this document
      await ensureFontsLoaded();

      // 2. Gather dynamic data
      const { natSign, stateSign } = await getPresidentsSignatures(state);
      const qrDataUrl = await QRCode.toDataURL(window.location.href, {
        width: 400, margin: 1, color: { dark: "#000000", light: "#ffffff" }
      });
      const currentDate = new Date().toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
      });

      // 3. Setup HD canvas
      const canvas = document.createElement("canvas");
      canvas.width  = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d")!;
      if (!ctx) throw new Error("Canvas 2D context unavailable");

      // 4. Draw base poster image (stretched to fill exactly like studio's backgroundSize:'100% 100%')
      if (petition.baseImage) {
        const baseImg = await loadImage(petition.baseImage);
        ctx.drawImage(baseImg, 0, 0, CANVAS_W, CANVAS_H);
      }

      // 5. Pre-load all images
      const [natImgObj, stateImgObj, qrImgObj] = await Promise.all([
        loadImage(natSign),
        loadImage(stateSign),
        loadImage(qrDataUrl),
      ]);

      // 6. Draw each element
      const elements: Record<string, any> = petition.elements || {};

      for (const key of Object.keys(elements)) {
        const el = elements[key];

        // % → px  (same coordinate space the studio uses)
        const xPx = (el.x / 100) * CANVAS_W;
        const yPx = (el.y / 100) * CANVAS_H;
        const wPx = (el.w / 100) * CANVAS_W;
        const hPx = (el.h / 100) * CANVAS_H;

        if (el.type === "text") {
          // ── Replace placeholders ────────────────────────────────────────────
          let text = (el.label || "")
            .replace(/\[CITIZEN_NAME\]/gi, name)
            .replace(/\[DATE\]/gi, currentDate);

          // ── Font — exactly mirrors studio's ctx.font construction ───────────
          // fontWeight is stored as string "400"/"700"/"900" in studio
          // fontFamily is stored as "'Playfair Display', serif" — valid in canvas
          const fw = el.fontWeight || "900";
          const fs = el.fontSize   || 48;
          const ff = el.fontFamily || "system-ui, sans-serif";
          ctx.font = `${fw} ${fs}px ${ff}`;

          // ── Color ───────────────────────────────────────────────────────────
          ctx.fillStyle = el.color || "#ffffff";

          // ── Alignment ───────────────────────────────────────────────────────
          const align = (el.align as CanvasTextAlign) || "center";
          ctx.textAlign   = align;
          ctx.textBaseline = "middle"; // matches container alignItems:center

          // ── Text shadow ─────────────────────────────────────────────────────
          // textShadowEnabled defaults to true for backwards compat
          applyTextShadow(ctx, el.textShadow || "", el.textShadowEnabled !== false);

          // ── X position — accounts for span's padding:0 8px ─────────────────
          const PAD = ELEMENT_TEXT_PAD; // matches studio's padding:'0 8px'
          let drawX: number;
          if (align === "left")       drawX = xPx + PAD;
          else if (align === "right") drawX = xPx + wPx - PAD;
          else                        drawX = xPx + wPx / 2; // center: padding is symmetric

          // ── Y position — vertical center of element box ─────────────────────
          // matches container display:flex; alignItems:center
          const lineHeight = fs * 1.1;
          const lines = wrapCanvasText(ctx, text, Math.max(0, wPx - PAD * 2));
          const centerY = yPx + hPx / 2;
          const firstLineY = centerY - ((lines.length - 1) * lineHeight) / 2;

          lines.forEach((line, index) => {
            ctx.fillText(line, drawX, firstLineY + index * lineHeight);
          });
          resetShadow(ctx);

        } else if (el.type === "image") {
          // ── Match image by label (exactly as stored in studio) ───────────────
          let imgToDraw: HTMLImageElement | null = null;
          if (el.id === "qrCode" || el.label === "[QR_CODE]")         imgToDraw = qrImgObj;
          if (el.id === "natSign" || el.label === "[NAT_PRES_SIGN]")   imgToDraw = natImgObj;
          if (el.id === "stateSign" || el.label === "[STATE_PRES_SIGN]") imgToDraw = stateImgObj;

          if (!imgToDraw) continue;

          if (el.id === "qrCode") {
            // ── QR: white rounded-rect container matching studio CSS ───────────
            // Studio: borderRadius:'14%', padding:'8%', boxShadow:'0 4px 20px rgba(0,0,0,0.35)'
            const radius  = Math.min(wPx, hPx) * 0.14;
            const padding = Math.min(wPx, hPx) * 0.08;

            ctx.save();
            // Draw white bg
            ctx.fillStyle = "#ffffff";
            drawRoundRect(ctx, xPx, yPx, wPx, hPx, radius);
            ctx.fill();
            // Box shadow
            ctx.shadowColor   = "rgba(0,0,0,0.35)";
            ctx.shadowBlur    = 20;
            ctx.shadowOffsetY = 4;
            ctx.shadowOffsetX = 0;
            drawRoundRect(ctx, xPx, yPx, wPx, hPx, radius);
            ctx.fill();
            resetShadow(ctx);
            // QR image inside padded area
            ctx.drawImage(
              imgToDraw,
              xPx + padding, yPx + padding,
              wPx - padding * 2, hPx - padding * 2
            );
            ctx.restore();
          } else {
            // ── Signatures: drawn directly into the element box ────────────────
            ctx.drawImage(imgToDraw, xPx, yPx, wPx, hPx);
          }
        }
      }

      // 7. Export final HD JPEG
      const finalDataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setGeneratedPoster(finalDataUrl);

      // 8. Persist signature
      await addDoc(collection(db, "signatures"), {
        petitionId: petition.id,
        name, phone, state, district,
        signedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "petitions", petition.id), {
        signatureCount: increment(1),
      });

    } catch (err) {
      console.error(err);
      alert("Signal disrupted while securing signature. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadPoster = () => {
    if (!generatedPoster) return;
    const a = document.createElement("a");
    a.download = `DSA_Campaign_${name.replace(/\s+/g, "_")}.jpg`;
    a.href = generatedPoster;
    a.click();
  };

  // ─── LOADING / NOT FOUND STATES ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-[#007AFF] mb-4" />
        <p className="text-sm font-bold text-gray-400 tracking-widest uppercase">
          Connecting to Secure Server...
        </p>
      </div>
    );
  }

  if (!petition) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <AlertTriangle className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-2xl font-black text-gray-900 mb-2">Campaign Terminated</h2>
        <p className="text-sm font-medium">
          This petition link is invalid or has been taken down by the High Command.
        </p>
      </div>
    );
  }

  const progress = Math.min(
    100,
    Math.round(((petition.signatureCount || 0) / (petition.targetSignatures || 1)) * 100)
  );

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f9fa] py-12 px-4 relative overflow-hidden font-sans">

      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-400/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <AnimatePresence mode="wait">

          {generatedPoster ? (
            /* ── SUCCESS VIEW ─────────────────────────────────────────────── */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-gray-100 text-center flex flex-col items-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />

              <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-green-100">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">
                Signature Authenticated!
              </h2>
              <p className="text-gray-500 mb-10 max-w-lg font-medium">
                Thank you for standing with the alliance. Your official campaign poster is ready.
                Share it to mobilize others.
              </p>

              <div className="max-w-sm w-full bg-gray-100 rounded-2xl overflow-hidden shadow-2xl border-4 border-white mb-10 ring-1 ring-gray-200">
                <img src={generatedPoster} alt="Campaign Poster" className="w-full h-auto object-cover" />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg relative z-10">
                <button
                  onClick={downloadPoster}
                  className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" /> Download HD Poster
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: petition.title,
                        text: "I just signed this petition. Join me and raise your voice!",
                        url: window.location.href,
                      });
                    } else {
                      alert("Copy this link to share: " + window.location.href);
                    }
                  }}
                  className="flex-1 py-4 bg-gradient-to-r from-[#007AFF] to-blue-500 text-white rounded-2xl font-bold shadow-[0_10px_25px_rgba(0,122,255,0.4)] hover:shadow-[0_10px_25px_rgba(0,122,255,0.6)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5" /> Share Campaign
                </button>
              </div>
            </motion.div>

          ) : (
            /* ── SIGNING FORM ─────────────────────────────────────────────── */
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12"
            >
              {/* Left: Petition details */}
              <div className="lg:col-span-7 space-y-8 pt-4">
                <div>
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-black uppercase tracking-widest border border-red-100 shadow-sm mb-6">
                    <FileSignature className="w-4 h-4" /> Official Mass Campaign
                  </span>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-[1.1] tracking-tight">
                    {petition.title}
                  </h1>
                </div>

                <p className="text-lg text-gray-600 leading-relaxed font-medium">
                  {petition.description}
                </p>

                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <div className="flex justify-between items-end mb-3 relative z-10">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Signatures Collected
                      </p>
                      <p className="text-3xl font-black text-[#007AFF] tracking-tight mt-1">
                        {petition.signatureCount?.toLocaleString() || 0}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-400 pb-1">
                      Target: {petition.targetSignatures?.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden shadow-inner relative z-10">
                    <div
                      className="bg-gradient-to-r from-[#007AFF] to-blue-400 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-4 text-sm font-medium text-gray-600 bg-blue-50/50 border border-blue-100 p-5 rounded-3xl">
                  <ShieldCheck className="w-6 h-6 text-[#007AFF] shrink-0 mt-0.5" />
                  <p>
                    Your signature will securely generate a verified digital poster embedded with
                    authentic command signatures and a tracker QR code.
                  </p>
                </div>
              </div>

              {/* Right: Signing form */}
              <div className="lg:col-span-5">
                <div className="bg-white rounded-[2rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100">
                  <h3 className="text-2xl font-black text-gray-900 mb-6">Pledge Support</h3>

                  <form onSubmit={handleSignPetition} className="space-y-5">

                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">
                        Citizen Identity
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text" required
                          value={name} onChange={e => setName(e.target.value)}
                          placeholder="Enter Full Name"
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-blue-50 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">
                        Contact Info
                      </label>
                      <div className="relative">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <span className="absolute left-11 top-1/2 -translate-y-1/2 text-sm font-black text-gray-900 border-r border-gray-300 pr-2">
                          +91
                        </span>
                        <input
                          type="tel" required maxLength={10}
                          value={phone}
                          onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                          placeholder="Mobile Number"
                          className="w-full pl-24 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-blue-50 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">
                          State
                        </label>
                        <select
                          required value={state}
                          onChange={e => { setState(e.target.value); setDistrict(""); }}
                          className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-blue-50 transition-all text-gray-700"
                        >
                          <option value="" disabled>Select...</option>
                          {Object.keys(indiaData).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">
                          District
                        </label>
                        <select
                          required disabled={!state} value={district}
                          onChange={e => setDistrict(e.target.value)}
                          className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-blue-50 transition-all disabled:opacity-50 text-gray-700"
                        >
                          <option value="" disabled>Select...</option>
                          {state && indiaData[state]?.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit" disabled={isSubmitting}
                      className="w-full py-4 mt-2 bg-[#007AFF] text-white font-black rounded-2xl shadow-[0_8px_25px_rgba(0,122,255,0.3)] hover:shadow-[0_8px_25px_rgba(0,122,255,0.5)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {isSubmitting
                        ? <><Loader2 className="w-5 h-5 animate-spin" /> Authenticating Signature...</>
                        : <><FileSignature className="w-5 h-5" /> Sign &amp; Generate Poster</>
                      }
                    </button>

                    <p className="text-[10px] text-center text-gray-400 font-bold tracking-wide mt-4 uppercase">
                      By signing, you pledge your support to this directive.
                    </p>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
