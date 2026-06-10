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
  CheckCircle2, AlertTriangle, ShieldCheck, Smartphone, User, ChevronLeft, ChevronRight, PenTool
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

async function ensureFontsLoaded(): Promise<void> {
  const LINK_ID = "google-fonts-petition-canvas";
  if (!document.getElementById(LINK_ID)) {
    const link = document.createElement("link");
    link.id = LINK_ID;
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_HREF;
    document.head.appendChild(link);
  }
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
  
  // 🔥 WIZARD LOGIC 🔥
  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState("");

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

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(img); 
      img.src = src;
    });

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

  const handleSignPetition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || phone.length !== 10 || !state || !district) {
      setErrorMsg("Please fill all details correctly before signing.");
      return;
    }
    setIsSubmitting(true);

    try {
      await ensureFontsLoaded();

      const { natSign, stateSign } = await getPresidentsSignatures(state);
      const qrDataUrl = await QRCode.toDataURL(window.location.href, {
        width: 400, margin: 1, color: { dark: "#000000", light: "#ffffff" }
      });
      const currentDate = new Date().toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
      });

      const canvas = document.createElement("canvas");
      canvas.width  = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d")!;
      if (!ctx) throw new Error("Canvas 2D context unavailable");

      if (petition.baseImage) {
        const baseImg = await loadImage(petition.baseImage);
        ctx.drawImage(baseImg, 0, 0, CANVAS_W, CANVAS_H);
      }

      const [natImgObj, stateImgObj, qrImgObj] = await Promise.all([
        loadImage(natSign),
        loadImage(stateSign),
        loadImage(qrDataUrl),
      ]);

      const elements: Record<string, any> = petition.elements || {};

      for (const key of Object.keys(elements)) {
        const el = elements[key];

        const xPx = (el.x / 100) * CANVAS_W;
        const yPx = (el.y / 100) * CANVAS_H;
        const wPx = (el.w / 100) * CANVAS_W;
        const hPx = (el.h / 100) * CANVAS_H;

        if (el.type === "text") {
          let text = (el.label || "")
            .replace(/\[CITIZEN_NAME\]/gi, name)
            .replace(/\[DATE\]/gi, currentDate);

          const fw = el.fontWeight || "900";
          const fs = el.fontSize   || 48;
          const ff = el.fontFamily || "system-ui, sans-serif";
          ctx.font = `${fw} ${fs}px ${ff}`;
          ctx.fillStyle = el.color || "#ffffff";
          
          const align = (el.align as CanvasTextAlign) || "center";
          ctx.textAlign   = align;
          ctx.textBaseline = "middle"; 

          applyTextShadow(ctx, el.textShadow || "", el.textShadowEnabled !== false);

          const PAD = ELEMENT_TEXT_PAD; 
          let drawX: number;
          if (align === "left")       drawX = xPx + PAD;
          else if (align === "right") drawX = xPx + wPx - PAD;
          else                        drawX = xPx + wPx / 2; 

          const lineHeight = fs * 1.1;
          const lines = wrapCanvasText(ctx, text, Math.max(0, wPx - PAD * 2));
          const centerY = yPx + hPx / 2;
          const firstLineY = centerY - ((lines.length - 1) * lineHeight) / 2;

          lines.forEach((line, index) => {
            ctx.fillText(line, drawX, firstLineY + index * lineHeight);
          });
          resetShadow(ctx);

        } else if (el.type === "image") {
          let imgToDraw: HTMLImageElement | null = null;
          if (el.id === "qrCode" || el.label === "[QR_CODE]")         imgToDraw = qrImgObj;
          if (el.id === "natSign" || el.label === "[NAT_PRES_SIGN]")   imgToDraw = natImgObj;
          if (el.id === "stateSign" || el.label === "[STATE_PRES_SIGN]") imgToDraw = stateImgObj;

          if (!imgToDraw) continue;

          if (el.id === "qrCode") {
            const radius  = Math.min(wPx, hPx) * 0.14;
            const padding = Math.min(wPx, hPx) * 0.08;

            ctx.save();
            ctx.fillStyle = "#ffffff";
            drawRoundRect(ctx, xPx, yPx, wPx, hPx, radius);
            ctx.fill();
            ctx.shadowColor   = "rgba(0,0,0,0.35)";
            ctx.shadowBlur    = 20;
            ctx.shadowOffsetY = 4;
            ctx.shadowOffsetX = 0;
            drawRoundRect(ctx, xPx, yPx, wPx, hPx, radius);
            ctx.fill();
            resetShadow(ctx);
            ctx.drawImage(
              imgToDraw,
              xPx + padding, yPx + padding,
              wPx - padding * 2, hPx - padding * 2
            );
            ctx.restore();
          } else {
            ctx.drawImage(imgToDraw, xPx, yPx, wPx, hPx);
          }
        }
      }

      const finalDataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setGeneratedPoster(finalDataUrl);

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
      setErrorMsg("Signal disrupted while securing signature. Please retry.");
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

  // 🔥 WIZARD NAVIGATION 🔥
  const nextStep = () => {
    setErrorMsg("");
    if (step === 1) {
      if (!name || phone.length !== 10) return setErrorMsg("Please provide a valid name and 10-digit number.");
      setStep(2);
    }
  };
  const prevStep = () => {
    setErrorMsg("");
    setStep(1);
  };


  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] pt-20">
        <Loader2 className="w-10 h-10 animate-spin text-[#007AFF] mb-4" />
        <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">Connecting to Secure Server...</p>
      </div>
    );
  }

  if (!petition) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] text-gray-500 pt-20">
        <AlertTriangle className="w-14 h-14 mb-4 opacity-30" />
        <h2 className="text-2xl font-black text-gray-900 mb-2">Campaign Terminated</h2>
        <p className="text-sm font-medium">This petition link is invalid or has been taken down by High Command.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] py-24 md:py-32 px-4 relative overflow-hidden font-sans">
      <div className="max-w-3xl mx-auto relative z-10">
        <AnimatePresence mode="wait">

          {generatedPoster ? (
            /* ── SUCCESS VIEW (POSTER) ── */
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 text-center flex flex-col items-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none" />
              
              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-green-100">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Signature Authenticated!</h2>
              <p className="text-slate-500 mb-10 max-w-lg font-medium leading-relaxed">
                Thank you for standing with the alliance. Your official campaign poster is ready. Share it to mobilize others.
              </p>

              <div className="max-w-[280px] w-full bg-slate-100 rounded-2xl overflow-hidden shadow-2xl border-4 border-white mb-10 ring-1 ring-slate-200">
                <img src={generatedPoster} alt="Campaign Poster" className="w-full h-auto object-cover" />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md relative z-10">
                <button onClick={downloadPoster} className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-bold hover:-translate-y-0.5 transition-transform flex items-center justify-center gap-2 shadow-lg">
                  <Download className="w-5 h-5" /> Download HD
                </button>
                <button onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: petition.title, text: "I just signed this petition. Join me!", url: window.location.href });
                    } else { alert("Copy this link to share: " + window.location.href); }
                  }}
                  className="flex-1 py-4 bg-[#007AFF] text-white rounded-xl font-bold shadow-[0_4px_14px_rgba(0,122,255,0.35)] hover:shadow-[0_6px_20px_rgba(0,122,255,0.45)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5" /> Share
                </button>
              </div>
            </motion.div>
          ) : (
            /* ── WIZARD FORM VIEW ── */
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 overflow-hidden">
              
              {/* Wizard Header */}
              <div className="bg-slate-50 border-b border-slate-100 px-6 sm:px-10 py-8 text-center relative overflow-hidden">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm relative z-10">
                  <PenTool className="w-6 h-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-snug tracking-tight relative z-10">{petition.title}</h1>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-3 relative z-10">Join {petition.signatureCount?.toLocaleString() || 0} Citizens</p>
                <div className="absolute inset-0 bg-gradient-to-b from-white to-transparent opacity-50"></div>
              </div>

              <div className="p-6 sm:p-10">
                {errorMsg && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 mb-6 text-center font-bold flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSignPetition}>
                  <AnimatePresence mode="wait">
                    
                    {/* STEP 1: IDENTITY */}
                    {step === 1 && (
                      <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
                        <div className="text-center mb-6">
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Step 1 of 2</p>
                          <h3 className="text-xl font-black text-slate-900 mt-1">Identity & Contact</h3>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Full Name *</label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rahul Sharma"
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-blue-50 transition-all text-slate-900" />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Mobile Number *</label>
                          <div className="relative">
                            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <span className="absolute left-11 top-1/2 -translate-y-1/2 text-sm font-black text-slate-900 border-r border-slate-200 pr-2">+91</span>
                            <input type="tel" required maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="10-digit number"
                              className="w-full pl-24 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-blue-50 transition-all text-slate-900" />
                          </div>
                        </div>

                        <div className="pt-4 flex justify-between items-center">
                          <div className="flex gap-2">
                            <div className="w-6 h-1.5 rounded-full bg-[#007AFF]"></div>
                            <div className="w-2 h-1.5 rounded-full bg-slate-200"></div>
                          </div>
                          <button type="button" onClick={nextStep} className="px-8 py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-black transition-colors flex items-center gap-2">
                            Next <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 2: JURISDICTION */}
                    {step === 2 && (
                      <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
                        <div className="text-center mb-6">
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Step 2 of 2</p>
                          <h3 className="text-xl font-black text-slate-900 mt-1">Jurisdiction details</h3>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">State *</label>
                          <select required value={state} onChange={e => { setState(e.target.value); setDistrict(""); }}
                            className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-blue-50 transition-all text-slate-900 cursor-pointer">
                            <option value="" disabled>Select State</option>
                            {Object.keys(indiaData).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">District *</label>
                          <select required disabled={!state} value={district} onChange={e => setDistrict(e.target.value)}
                            className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-blue-50 transition-all disabled:opacity-50 text-slate-900 cursor-pointer">
                            <option value="" disabled>Select District</option>
                            {state && indiaData[state]?.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 text-xs font-medium text-slate-600 mt-2">
                           <ShieldCheck className="w-4 h-4 text-[#007AFF] shrink-0 mt-0.5" />
                           <p>By signing, you pledge your support to this directive. Your signature will generate a secure tracker QR code.</p>
                        </div>

                        <div className="pt-4 flex gap-4">
                          <button type="button" onClick={prevStep} className="p-3.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors shrink-0">
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 bg-[#007AFF] text-white font-black rounded-xl shadow-[0_4px_14px_rgba(0,122,255,0.35)] hover:shadow-[0_6px_20px_rgba(0,122,255,0.45)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0">
                            {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Authenticating...</> : "Sign & Generate Poster"}
                          </button>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </form>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}