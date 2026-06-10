// app/admin/petitions/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { FileText, Plus, Rocket, Download, Target, FileSignature, CheckCircle2, ShieldAlert, X, TrendingUp, Loader2, Trash2, ExternalLink, Image as ImageIcon, Move, MousePointer2, ZoomIn, ZoomOut, Maximize, Settings2, ArrowLeft, ImagePlus, Users, Type, Palette, AlignLeft, AlignCenter, AlignRight, FileDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── AVAILABLE GOOGLE FONTS ─────────────────────────────────────────────────
const AVAILABLE_FONTS = [
  { name: "Default (System)", value: "system-ui, sans-serif", preview: "Aa" },
  { name: "Playfair Display", value: "'Playfair Display', serif", preview: "Aa" },
  { name: "Montserrat", value: "'Montserrat', sans-serif", preview: "Aa" },
  { name: "Oswald", value: "'Oswald', sans-serif", preview: "Aa" },
  { name: "Raleway", value: "'Raleway', sans-serif", preview: "Aa" },
  { name: "Bebas Neue", value: "'Bebas Neue', cursive", preview: "Aa" },
  { name: "Cinzel", value: "'Cinzel', serif", preview: "Aa" },
  { name: "Lora", value: "'Lora', serif", preview: "Aa" },
  { name: "Libre Baskerville", value: "'Libre Baskerville', serif", preview: "Aa" },
  { name: "Exo 2", value: "'Exo 2', sans-serif", preview: "Aa" },
  { name: "Poppins", value: "'Poppins', sans-serif", preview: "Aa" },
  { name: "Noto Serif Devanagari", value: "'Noto Serif Devanagari', serif", preview: "अ" },
  { name: "Tiro Devanagari Hindi", value: "'Tiro Devanagari Hindi', serif", preview: "अ" },
  { name: "Mukta", value: "'Mukta', sans-serif", preview: "अ" },
];

// ─── DEMO VALUES FOR LIVE PREVIEW ────────────────────────────────────────────
const DEMO_PREVIEW: Record<string, string> = {
  citizenName: "Rahul Sharma",
  date: "08 Jun 2026",
  qrCode: "QR_CODE",
  stateSign: "STATE_SIGN",
  natSign: "NAT_SIGN",
};

// ─── DEFAULT ELEMENTS ────────────────────────────────────────────────────────
const DEFAULT_ELEMENTS = {
  citizenName: {
    id: "citizenName", type: "text",
    x: 10, y: 35, w: 80, h: 8,
    fontSize: 48, color: "#ffffff",
    align: "center", label: "[CITIZEN_NAME]",
    fontFamily: "'Playfair Display', serif",
    fontWeight: "900",
    textShadow: "0px 4px 15px rgba(0,0,0,0.6)",
    textShadowEnabled: true,
  },
  date: {
    id: "date", type: "text",
    x: 75, y: 5, w: 20, h: 5,
    fontSize: 32, color: "#ffffff",
    align: "right", label: "[DATE]",
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: "700",
    textShadow: "0px 2px 8px rgba(0,0,0,0.5)",
    textShadowEnabled: true,
  },
  qrCode: {
    id: "qrCode", type: "image",
    x: 75, y: 80, w: 15, h: 11.25,
    label: "[QR_CODE]",
    hasWhiteBorder: true,
  },
  stateSign: {
    id: "stateSign", type: "image",
    x: 10, y: 80, w: 20, h: 10,
    label: "[STATE_PRES_SIGN]",
    hasWhiteBorder: false,
  },
  natSign: {
    id: "natSign", type: "image",
    x: 40, y: 80, w: 20, h: 10,
    label: "[NAT_PRES_SIGN]",
    hasWhiteBorder: false,
  }
};

// ─── GUIDE LINE COLORS ───────────────────────────────────────────────────────
const GUIDE_COLOR = "#22d3ee";
const ELEMENT_TEXT_PAD = 8;

const scaleTextShadow = (shadow: string | undefined, scale: number) => {
  if (!shadow || shadow === "none" || scale === 1) return shadow || "none";
  return shadow.replace(
    /^(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+([\d.]+)(?:px)?/,
    (_, x, y, blur) => `${parseFloat(x) * scale}px ${parseFloat(y) * scale}px ${parseFloat(blur) * scale}px`
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function AdminPetitionsPage() {
  const { userData } = useUser();
  const [petitions, setPetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Multi-step creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetSigs, setTargetSigs] = useState("100000");

  // Image state
  const [baseImagePreview, setBaseImagePreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Canvas editor
  const [elements, setElements] = useState<Record<string, any>>(DEFAULT_ELEMENTS);
  const [activeElement, setActiveElement] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.4);
  const containerRef = useRef<HTMLDivElement>(null);

  // Advanced guides
  type GuideInfo = {
    vertical: number[],
    horizontal: number[],
    equalH: {x1: number, x2: number, y: number}[],
    equalV: {y1: number, y2: number, x: number}[],
  };
  const [guides, setGuides] = useState<GuideInfo>({ vertical: [], horizontal: [], equalH: [], equalV: [] });

  const [dragInfo, setDragInfo] = useState<{
    id: string | null,
    action: 'drag' | 'resize' | null,
    startX: number, startY: number,
    startElemX: number, startElemY: number,
    startElemW: number, startElemH: number,
  }>({ id: null, action: null, startX: 0, startY: 0, startElemX: 0, startElemY: 0, startElemW: 0, startElemH: 0 });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPetition, setSelectedPetition] = useState<any>(null);
  const [signatures, setSignatures] = useState<any[]>([]);
  const [loadingSigs, setLoadingSigs] = useState(false);
  const [petitionToDelete, setPetitionToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit petition
  const [editingPetition, setEditingPetition] = useState<any>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Full preview modal
  const [showFullPreview, setShowFullPreview] = useState(false);

  // Preview panel ref
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const [previewPanelW, setPreviewPanelW] = useState(208);

  // Canvas base dimensions
  const CANVAS_W = 1080;
  const CANVAS_H = 1440;

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | null }>({ message: "", type: null });
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: null }), 5000);
  };

  // ─── UPDATED: EXPORT TO CSV FUNCTION (FIXED) ───────────────────────────────
  const exportToCSV = () => {
    if (signatures.length === 0) return showToast("No signatures to export.", "error");

    const headers = ["Citizen Name", "Phone", "Email", "State", "District", "Signed At"];
    const rows = signatures.map(sig => [
      `"${(sig.name || '').replace(/"/g, '""')}"`,
      `"${sig.phone || ''}"`,
      `"${sig.email || 'N/A'}"`,
      `"${(sig.state || '').replace(/"/g, '""')}"`,
      `"${(sig.district || '').replace(/"/g, '""')}"`,
      `"${sig.signedAt ? new Date(sig.signedAt.toDate()).toLocaleString() : ''}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    // Added BOM (\uFEFF) so Excel opens UTF-8 properly without issues
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `DSA_Campaign_${selectedPetition?.title.substring(0, 20).replace(/\s+/g, '_')}_Ledger.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── UPDATED: EXPORT TO PROFESSIONAL PDF (WITH LOGO) ───────────────────────
  const exportToPDF = async () => {
    if (signatures.length === 0) return showToast("No signatures to export.", "error");

    showToast("Generating PDF Report...", "success"); // Feedback to user while image loads

    const doc = new jsPDF();
    const titleText = selectedPetition?.title || "Petition Signatures";
    
    // --- 1. PREMIUM HEADER BACKGROUND (Dark Navy) ---
    doc.setFillColor(10, 25, 47); // #0A192F
    doc.rect(0, 0, 210, 45, 'F'); // A4 Width is 210mm
    
    // --- 2. LEFT ACCENT STRIP (DSA Blue) ---
    doc.setFillColor(0, 122, 255); // #007AFF
    doc.rect(0, 0, 3, 45, 'F');

    // --- 3. LOAD & DRAW LOGO WITH WHITE CIRCLE ---
    try {
      const logoImg = new Image();
      logoImg.src = "/dsa-logo.png";
      await new Promise((resolve) => {
        logoImg.onload = resolve;
        logoImg.onerror = resolve; // Continue even if logo fails
      });

      // Draw white circle behind logo (X, Y, Radius)
      doc.setFillColor(255, 255, 255);
      doc.circle(20, 15, 10, 'F'); 

      // Add logo image inside the circle
      doc.addImage(logoImg, 'PNG', 12, 7, 16, 16);
    } catch (e) {
      console.error("Failed to load logo for PDF", e);
    }
    
    // --- 4. ORGANIZATION TITLE (Shifted Right) ---
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("DEMOCRATIC SOCIAL ALLIANCE", 35, 13);
    
    // --- 5. SUBTITLE (Shifted Right) ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175); // Gray-400
    doc.text("Official Campaign Ledger · High Command", 35, 19);
    
    // --- 6. YELLOW/GOLD DIVIDER LINE ---
    doc.setDrawColor(251, 191, 36); // Amber-400
    doc.setLineWidth(0.6);
    doc.line(15, 27, 195, 27);
    
    // --- 7. REPORT DOCUMENT TITLE ---
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("OFFICIAL SIGNATURE REPORT", 15, 36);

    // --- 9. META DETAILS (Below Header) ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.text(`Campaign: ${titleText}`, 15, 55);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(`Total Authenticated Signatures: ${selectedPetition?.signatureCount || 0}`, 15, 62);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, 15, 68);

    // --- 10. DATA TABLE (autoTable) ---
    const tableColumn = ["#", "Citizen Identity", "Contact", "Jurisdiction", "Timestamp"];
    const tableRows: any[] = [];

    signatures.forEach((sig, index) => {
      const rowData = [
        index + 1,
        sig.name || "N/A",
        sig.phone || "N/A",
        `${sig.district || "N/A"}, ${sig.state || "N/A"}`,
        sig.signedAt ? new Date(sig.signedAt.toDate()).toLocaleString() : "N/A"
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 75,
      styles: { fontSize: 9, cellPadding: 4, font: "helvetica" },
      headStyles: { fillColor: [10, 25, 47], textColor: 255, fontStyle: 'bold' }, // Matches Navy Header
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { top: 75 }
    });

    doc.save(`DSA_Report_${titleText.substring(0, 20).replace(/\s+/g, '_')}.pdf`);
  };

  // ─── TRACK PREVIEW PANEL WIDTH ────────────────────────────────────────────
  useEffect(() => {
    if (!previewFrameRef.current) return;
    const node = previewFrameRef.current;
    const updateWidth = () => setPreviewPanelW(node.getBoundingClientRect().width || 208);
    updateWidth();
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setPreviewPanelW(entry.contentRect.width || 208);
      }
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [showCreateModal, createStep, baseImagePreview]);

  // ─── ARROW KEY NAVIGATION ─────────────────────────────────────────────────
  useEffect(() => {
    if (!activeElement || createStep !== 3) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!arrowKeys.includes(e.key)) return;

      // Don't hijack if user is typing in an input
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement as HTMLElement).tagName)) return;

      e.preventDefault();

      // 1px/10px nudges in the native 1080x1440 canvas coordinate space.
      const stepX = (e.shiftKey ? 10 : 1) / CANVAS_W * 100;
      const stepY = (e.shiftKey ? 10 : 1) / CANVAS_H * 100;

      setElements(prev => {
        const el = { ...prev[activeElement] };
        if (e.key === 'ArrowLeft')  el.x = Math.max(0, el.x - stepX);
        if (e.key === 'ArrowRight') el.x = Math.min(100 - el.w, el.x + stepX);
        if (e.key === 'ArrowUp')    el.y = Math.max(0, el.y - stepY);
        if (e.key === 'ArrowDown')  el.y = Math.min(100 - el.h, el.y + stepY);
        return { ...prev, [activeElement]: el };
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeElement, createStep]);

  // ─── OPEN EDIT PETITION ────────────────────────────────────────────────────
  const openEditPetition = (pet: any) => {
    setEditingPetition(pet);
    setTitle(pet.title || "");
    setDescription(pet.description || "");
    setTargetSigs(String(pet.targetSignatures || 100000));
    setBaseImagePreview(pet.baseImage || null);
    setElements(pet.elements || DEFAULT_ELEMENTS);
    setActiveElement(null);
    setZoom(0.4);
    setCreateStep(3);
    setShowCreateModal(true);
  };

  const closeEditMode = () => {
    setEditingPetition(null);
    closeCreateModal();
  };

  const handleSaveEdit = async () => {
    if (!editingPetition) return;
    setIsSavingEdit(true);
    try {
      await updateDoc(doc(db, "petitions", editingPetition.id), {
        title,
        description,
        targetSignatures: Number(targetSigs),
        baseImage: baseImagePreview,
        elements,
      });
      showToast("Petition updated successfully!", "success");
      closeEditMode();
    } catch (error: any) {
      showToast(`Update failed: ${error.message}`, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  useEffect(() => {
    const linkId = "google-fonts-petition-studio";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Montserrat:wght@400;600;700;900&family=Oswald:wght@400;600;700&family=Raleway:wght@400;600;700;900&family=Bebas+Neue&family=Cinzel:wght@400;700;900&family=Lora:wght@400;700&family=Libre+Baskerville:wght@400;700&family=Exo+2:wght@400;600;700;900&family=Poppins:wght@400;600;700;900&family=Noto+Serif+Devanagari:wght@400;700;900&family=Tiro+Devanagari+Hindi&family=Mukta:wght@400;600;700;800&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  // ─── FETCH PETITIONS ───────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "petitions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
      setPetitions(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ─── FETCH SIGNATURES ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPetition) return;
    setLoadingSigs(true);
    const q = query(collection(db, "signatures"), where("petitionId", "==", selectedPetition.id), orderBy("signedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
      setSignatures(docs);
      setLoadingSigs(false);
    });
    return () => unsubscribe();
  }, [selectedPetition]);

  // ─── IMAGE UPLOAD & COMPRESS ──────────────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return showToast("Image size exceeds 10MB limit.", "error");

    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 1080;
          canvas.height = 1440;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, 1080, 1440);
            const compressed = canvas.toDataURL("image/jpeg", 0.85);
            setBaseImagePreview(compressed);
            setCreateStep(2);
          }
        } catch (err) {
          showToast("Failed to process image.", "error");
        } finally {
          setIsCompressing(false);
        }
      };
      img.onerror = () => { setIsCompressing(false); showToast("Invalid image file.", "error"); };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => { setIsCompressing(false); showToast("Failed to read file.", "error"); };
    reader.readAsDataURL(file);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setTimeout(() => {
      setCreateStep(1); setTitle(""); setDescription("");
      setBaseImagePreview(null); setElements(DEFAULT_ELEMENTS);
      setActiveElement(null); setZoom(0.4);
      setEditingPetition(null);
    }, 300);
  };

  const updateActiveElement = (key: string, value: any) => {
    if (!activeElement) return;
    setElements(prev => ({ ...prev, [activeElement]: { ...prev[activeElement], [key]: value } }));
  };

  // ─── POINTER DOWN ─────────────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent, id: string, action: 'drag' | 'resize') => {
    e.stopPropagation(); e.preventDefault();
    setActiveElement(id);
    const el = elements[id];
    setDragInfo({
      id, action,
      startX: e.clientX, startY: e.clientY,
      startElemX: el.x, startElemY: el.y,
      startElemW: el.w, startElemH: el.h,
    });
  };

  // ─── POINTER MOVE + GUIDES ────────────────────────────────────────────────
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragInfo.id || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dxPct = ((e.clientX - dragInfo.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - dragInfo.startY) / rect.height) * 100;

      setElements(prev => {
        const elem = { ...prev[dragInfo.id as string] };

        if (dragInfo.action === 'resize') {
          elem.w = Math.max(5, dragInfo.startElemW + dxPct);
          elem.h = Math.max(2, dragInfo.startElemH + dyPct);
          return { ...prev, [dragInfo.id as string]: elem };
        }

        let newX = Math.max(0, Math.min(100 - elem.w, dragInfo.startElemX + dxPct));
        let newY = Math.max(0, Math.min(100 - elem.h, dragInfo.startElemY + dyPct));

        const THRESHOLD = 1.2;
        const verticalGuides: number[] = [];
        const horizontalGuides: number[] = [];
        const equalH: {x1: number, x2: number, y: number}[] = [];
        const equalV: {y1: number, y2: number, x: number}[] = [];

        const others = Object.keys(prev).filter(k => k !== dragInfo.id).map(k => prev[k]);

        const canvasCenterX = 50;
        const elemCenterX = newX + elem.w / 2;
        if (Math.abs(elemCenterX - canvasCenterX) < THRESHOLD) {
          newX = canvasCenterX - elem.w / 2;
          verticalGuides.push(canvasCenterX);
        }

        others.forEach(other => {
          if (Math.abs(newX - other.x) < THRESHOLD) { newX = other.x; verticalGuides.push(newX); }
          if (Math.abs((newX + elem.w) - (other.x + other.w)) < THRESHOLD) { newX = other.x + other.w - elem.w; verticalGuides.push(newX + elem.w); }
          const myCX = newX + elem.w / 2;
          const otCX = other.x + other.w / 2;
          if (Math.abs(myCX - otCX) < THRESHOLD) { newX = otCX - elem.w / 2; verticalGuides.push(otCX); }
          if (Math.abs(newX - (other.x + other.w)) < THRESHOLD) { newX = other.x + other.w; verticalGuides.push(newX); }

          if (Math.abs(newY - other.y) < THRESHOLD) { newY = other.y; horizontalGuides.push(newY); }
          if (Math.abs((newY + elem.h) - (other.y + other.h)) < THRESHOLD) { newY = other.y + other.h - elem.h; horizontalGuides.push(newY + elem.h); }
          const myCY = newY + elem.h / 2;
          const otCY = other.y + other.h / 2;
          if (Math.abs(myCY - otCY) < THRESHOLD) { newY = otCY - elem.h / 2; horizontalGuides.push(otCY); }
          if (Math.abs(newY - (other.y + other.h)) < THRESHOLD) { newY = other.y + other.h; horizontalGuides.push(newY); }
        });

        for (let i = 0; i < others.length; i++) {
          for (let j = i + 1; j < others.length; j++) {
            const a = others[i], b = others[j];
            const gapAB = b.x - (a.x + a.w);
            const gapBeforeElem = newX - (b.x + b.w);
            if (gapAB > 0 && Math.abs(gapBeforeElem - gapAB) < THRESHOLD * 2) {
              newX = b.x + b.w + gapAB;
              equalH.push({ x1: a.x + a.w, x2: b.x, y: a.y + a.h / 2 });
              equalH.push({ x1: b.x + b.w, x2: newX, y: elem.y + elem.h / 2 });
            }
          }
        }

        elem.x = newX; elem.y = newY;
        setGuides({ vertical: [...new Set(verticalGuides)], horizontal: [...new Set(horizontalGuides)], equalH, equalV });
        return { ...prev, [dragInfo.id as string]: elem };
      });
    };

    const handlePointerUp = () => {
      setDragInfo(d => ({ ...d, id: null, action: null }));
      setGuides({ vertical: [], horizontal: [], equalH: [], equalV: [] });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragInfo]);

  // ─── DEPLOY ───────────────────────────────────────────────────────────────
  const handleCreatePetition = async () => {
    if (!title.trim() || !description.trim() || !baseImagePreview) return showToast("Missing Required Data", "error");
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "petitions"), {
        title, description,
        targetSignatures: Number(targetSigs),
        baseImage: baseImagePreview,
        elements,
        isBoosted: false,
        signatureCount: 0,
        createdBy: userData?.name || "Admin",
        createdAt: serverTimestamp(),
      });
      showToast("Campaign Deployed Successfully!", "success");
      closeCreateModal();
    } catch (error: any) {
      showToast(`Deployment Failed: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBoost = async (petitionId: string, currentBoostStatus: boolean) => {
    try {
      await updateDoc(doc(db, "petitions", petitionId), { isBoosted: !currentBoostStatus });
      showToast(!currentBoostStatus ? "Petition Boosted to Frontpage!" : "Boost Removed.", "success");
    } catch { showToast("Failed to alter boost status.", "error"); }
  };

  const handleDeletePetition = async () => {
    if (!petitionToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "petitions", petitionToDelete.id));
      showToast("Petition deleted permanently.", "success");
      setPetitionToDelete(null);
    } catch { showToast("Failed to delete petition.", "error"); }
    finally { setIsDeleting(false); }
  };

  // ─── RENDER CANVAS ELEMENT ────────────────────────────────────────────────
  const renderElement = (key: string, el: any, isPreview = false, previewScale = 1) => {
    const isActive = activeElement === key && !isPreview;
    const demoText = DEMO_PREVIEW[key] || el.label;
    const elementScale = isPreview ? previewScale : 1;
    const scaledFontSize = (el.fontSize || 24) * elementScale;
    const scaledTextPad = ELEMENT_TEXT_PAD * elementScale;
    // Resolve text shadow: only apply if enabled (default true for backwards compat)
    const resolvedShadow = (el.textShadowEnabled !== false && el.textShadow)
      ? scaleTextShadow(el.textShadow, elementScale)
      : 'none';

    const containerStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${el.x}%`, top: `${el.y}%`,
      width: `${el.w}%`, height: `${el.h}%`,
      boxSizing: 'border-box',
      cursor: isPreview ? 'default' : 'move',
      border: 'none',
      outline: isPreview
        ? 'none'
        : isActive
          ? `3px solid ${GUIDE_COLOR}`
          : '2px dashed rgba(255,255,255,0.4)',
      background: isPreview ? 'transparent' : isActive ? 'rgba(34,211,238,0.06)' : 'rgba(255,255,255,0.03)',
      borderRadius: 4,
      zIndex: isActive ? 30 : 20,
      transition: 'outline-color 0.15s, background 0.15s',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    };

    return (
      <div
        key={key}
        onPointerDown={isPreview ? undefined : e => handlePointerDown(e, key, 'drag')}
        style={containerStyle}
      >
        {el.type === 'text' ? (
          <span style={{
            color: el.color,
            fontSize: `${scaledFontSize}px`,
            fontFamily: el.fontFamily || 'system-ui',
            fontWeight: el.fontWeight || 900,
            textAlign: el.align as any,
            lineHeight: 1.1,
            // FIX: text shadow toggleable
            textShadow: resolvedShadow,
            width: '100%',
            // FIX: proper padding — left/right consistent so text starts from edge & flows
            padding: `0 ${scaledTextPad}px`,
            boxSizing: 'border-box',
            userSelect: 'none',
            display: 'block',
            wordBreak: 'break-word',
            whiteSpace: 'normal',
          }}>
            {isPreview ? demoText : el.label}
          </span>
        ) : (
          // IMAGE ELEMENT
          el.id === 'qrCode' ? (
            <div style={{
              width: '100%', height: '100%',
              background: '#ffffff',
              borderRadius: '14%',
              boxShadow: `0 ${4 * elementScale}px ${20 * elementScale}px rgba(0,0,0,0.35)`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '8%',
              boxSizing: 'border-box',
            }}>
              <svg viewBox="0 0 40 40" width="100%" height="100%" style={{ borderRadius: 4 * elementScale }}>
                <rect width="40" height="40" fill="#fff" />
                <rect x="1" y="1" width="12" height="12" rx="1.5" fill="none" stroke="#111" strokeWidth="2.2" />
                <rect x="4" y="4" width="6" height="6" rx="0.5" fill="#111" />
                <rect x="27" y="1" width="12" height="12" rx="1.5" fill="none" stroke="#111" strokeWidth="2.2" />
                <rect x="30" y="4" width="6" height="6" rx="0.5" fill="#111" />
                <rect x="1" y="27" width="12" height="12" rx="1.5" fill="none" stroke="#111" strokeWidth="2.2" />
                <rect x="4" y="30" width="6" height="6" rx="0.5" fill="#111" />
                {[14,17,20,23,26,14,17,20,23,26,14,17,20,23,26,14,17,20,23,26,27,30,33,36].map((cx, i) => (
                  <rect key={i} x={cx} y={14 + (i % 6) * 4} width="2.2" height="2.2" rx="0.4" fill="#111" />
                ))}
              </svg>
              {!isPreview && (
                <span style={{ fontSize: 10, color: '#555', fontWeight: 700, marginTop: 4, letterSpacing: 1 }}>QR CODE</span>
              )}
            </div>
          ) : (
            // FIX: removed drop shadow from image placeholder boxes
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: isPreview ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.35)',
              borderRadius: 8,
              border: isPreview ? 'none' : '1px solid rgba(255,255,255,0.12)',
            }}>
              <ImageIcon size={isPreview ? 20 : 36} style={{ color: isActive ? '#fff' : '#bbb', marginBottom: 4 }} />
              {!isPreview && (
                <span style={{ fontSize: 10, color: isActive ? '#fff' : '#999', fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>{el.label}</span>
              )}
            </div>
          )
        )}

        {/* RESIZE HANDLE */}
        {!isPreview && isActive && (
          <div
            onPointerDown={e => handlePointerDown(e, key, 'resize')}
            style={{
              position: 'absolute', bottom: -10, right: -10,
              width: 22, height: 22,
              background: '#fff',
              border: `3px solid ${GUIDE_COLOR}`,
              borderRadius: '50%',
              cursor: 'nwse-resize',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              zIndex: 50,
            }}
          />
        )}
      </div>
    );
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">

      {/* TOAST */}
      <AnimatePresence>
        {toast.type && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-8 right-8 z-[999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-sm font-bold backdrop-blur-xl border ${toast.type === "success" ? "bg-gray-950/95 text-white border-white/10" : "bg-red-50/95 text-red-600 border-red-200"}`}
          >
            {toast.type === "success" ? <CheckCircle2 className="text-emerald-400 w-5 h-5 shrink-0" /> : <ShieldAlert className="text-red-500 w-5 h-5 shrink-0" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <FileSignature className="text-[#007AFF] w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Mass Petitions</h1>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Deploy campaigns with custom canvas templates & digital signatures.</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#007AFF] text-white rounded-xl font-bold text-sm shadow-[0_4px_14px_rgba(0,122,255,0.35)] hover:shadow-[0_6px_20px_rgba(0,122,255,0.45)] hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Launch Campaign
        </button>
      </div>

      {/* PETITIONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-gray-400">
            <Loader2 className="animate-spin text-[#007AFF] w-8 h-8 mb-3" />
            <p className="font-bold tracking-widest uppercase text-xs">Loading campaigns...</p>
          </div>
        ) : petitions.length === 0 ? (
          <div className="col-span-full bg-white border border-dashed border-gray-200 rounded-2xl p-16 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-gray-300" />
            </div>
            <p className="font-black text-lg text-gray-900 mb-1">No active campaigns</p>
            <p className="text-sm text-gray-400 font-medium">Create your first mass petition to mobilize citizens.</p>
          </div>
        ) : (
          petitions.map(pet => {
            const progress = Math.min(100, Math.round(((pet.signatureCount || 0) / (pet.targetSignatures || 1)) * 100));
            return (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                key={pet.id}
                className={`bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col group relative ${pet.isBoosted ? 'border-orange-200' : 'border-gray-100'}`}
              >
                {pet.isBoosted && <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-orange-400 to-red-500 z-20" />}

                <div className={`p-5 border-b flex justify-between items-start relative overflow-hidden ${pet.isBoosted ? 'bg-orange-50/30' : 'bg-gray-50/40'}`}>
                  <div className="space-y-2 z-10 w-full pr-10">
                    <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${pet.isBoosted ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
                      {pet.isBoosted && <Rocket className="w-2.5 h-2.5" />}
                      {pet.isBoosted ? 'Boosted' : 'Standard'}
                    </span>
                    <h3 className="font-black text-gray-900 text-base leading-snug line-clamp-2">{pet.title}</h3>
                  </div>
                  <div className="flex flex-col gap-1.5 z-10 absolute right-3 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => window.open(`/petition/${pet.id}`, '_blank')} className="p-1.5 bg-white text-gray-500 hover:text-[#007AFF] shadow-sm border border-gray-100 rounded-lg transition-colors" title="Open Live Page"><ExternalLink size={14} /></button>
                    <button onClick={() => openEditPetition(pet)} className="p-1.5 bg-white text-gray-500 hover:text-emerald-600 shadow-sm border border-gray-100 rounded-lg transition-colors" title="Edit Petition"><Settings2 size={14} /></button>
                    <button onClick={() => setPetitionToDelete(pet)} className="p-1.5 bg-white text-gray-500 hover:text-red-500 shadow-sm border border-gray-100 rounded-lg transition-colors" title="Delete"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-end mb-1.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Signatures</p>
                      <p className="text-xs font-black text-[#007AFF]">{pet.signatureCount?.toLocaleString() || 0}<span className="text-gray-300 font-semibold"> / {pet.targetSignatures?.toLocaleString()}</span></p>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${pet.isBoosted ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-[#007AFF]'}`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleToggleBoost(pet.id, pet.isBoosted)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${pet.isBoosted ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                    >
                      <Rocket className="w-3.5 h-3.5" /> {pet.isBoosted ? 'Remove Boost' : 'Boost'}
                    </button>
                    <button
                      onClick={() => setSelectedPetition(pet)}
                      className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors flex items-center justify-center gap-1.5"
                    >
                      <TrendingUp className="w-3.5 h-3.5" /> Inspect Data
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ─── MULTI-STEP MODAL ─── */}
      <AnimatePresence mode="wait">
        {showCreateModal && createStep !== 3 && (
          <motion.div key="modal-overlay" className="fixed inset-0 z-[200] bg-gray-950/75 backdrop-blur-xl flex items-center justify-center p-4">
            <AnimatePresence mode="wait">

              {/* STEP 1: FORM */}
              {createStep === 1 && (
                <motion.div key="step1" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }}
                  className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                    <div>
                      <h3 className="text-lg font-black text-gray-900">New Campaign</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Step 1 of 3 · Details & Image</p>
                    </div>
                    <button onClick={closeCreateModal} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                  </div>

                  <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Campaign Title</label>
                      <input type="text" placeholder="e.g., Save The Aravallis..." value={title} onChange={e => setTitle(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-blue-50 transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Appeal Description</label>
                      <textarea placeholder="Write a compelling reason for citizens to sign..." value={description} onChange={e => setDescription(e.target.value)}
                        className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-blue-50 transition-all resize-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Target Goal</label>
                      <input type="number" placeholder="100000" value={targetSigs} onChange={e => setTargetSigs(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-blue-50 transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Upload 3:4 Base Poster</label>
                      <label className="flex flex-col items-center justify-center p-7 border-2 border-dashed border-[#007AFF]/50 bg-blue-50/50 text-[#007AFF] rounded-xl cursor-pointer hover:bg-blue-50 transition-colors group">
                        {isCompressing ? <Loader2 className="w-8 h-8 mb-2 animate-spin" /> : <ImagePlus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />}
                        <span className="font-black text-sm">{isCompressing ? "Optimizing..." : "Browse Files"}</span>
                        <span className="text-xs font-medium text-[#007AFF]/60 mt-1">1080×1440 px · Max 10MB</span>
                        <input type="file" disabled={isCompressing} className="hidden" accept="image/png, image/jpeg" onChange={handleImageUpload} />
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: PREVIEW */}
              {createStep === 2 && baseImagePreview && (
                <motion.div key="step2" initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}
                  className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                    <button onClick={() => setCreateStep(1)} className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-200">
                      <ArrowLeft size={14} /> Back
                    </button>
                    <div className="text-center">
                      <h3 className="font-black text-gray-900 text-sm">Image Preview</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Step 2 of 3 · Verify Quality</p>
                    </div>
                    <button className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg transition-colors" onClick={closeCreateModal}><X className="w-5 h-5" /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-gray-100/50 p-6 flex flex-col items-center">
                    <div className="w-full max-w-xs shadow-2xl rounded-xl overflow-hidden ring-4 ring-white border border-gray-200">
                      <img src={baseImagePreview} alt="Base Preview" className="w-full h-auto object-cover" style={{ aspectRatio: '3/4' }} />
                    </div>
                  </div>

                  <div className="p-5 bg-white border-t border-gray-100 flex justify-center shrink-0">
                    <button onClick={() => setCreateStep(3)}
                      className="w-full px-8 py-3 bg-[#007AFF] text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(0,122,255,0.35)] hover:shadow-[0_6px_20px_rgba(0,122,255,0.45)] hover:-translate-y-0.5 transition-all text-sm">
                      <Settings2 size={16} /> Open Visual Mapper Studio
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── STEP 3: FULLSCREEN STUDIO ─── */}
      <AnimatePresence>
        {showCreateModal && createStep === 3 && baseImagePreview && (
          <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0c0e12] flex flex-col z-[300]">

            {/* STUDIO HEADER */}
            <div className="h-14 bg-[#161920] border-b border-white/8 px-5 flex justify-between items-center z-50 shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => editingPetition ? setCreateStep(3) : setCreateStep(2)} className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/8"><ArrowLeft size={18} /></button>
                <div className="w-px h-5 bg-white/10" />
                <div>
                  <h3 className="font-black text-white text-sm flex items-center gap-2"><Target className="w-4 h-4 text-[#007AFF]" /> Visual Mapper Studio</h3>
                  <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                    {editingPetition ? `Editing: ${editingPetition.title}` : 'Step 3 of 3 · Position & Style'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest hidden sm:block">↑↓←→ keys move 1px · Shift+arrow = 10px</span>
                {editingPetition ? (
                  <button onClick={handleSaveEdit} disabled={isSavingEdit}
                    className="px-6 py-2 bg-emerald-500 text-white font-black rounded-lg flex items-center gap-2 shadow-[0_0_16px_rgba(52,211,153,0.3)] hover:bg-emerald-400 transition-all disabled:opacity-50 text-xs">
                    {isSavingEdit ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
                    {isSavingEdit ? "Saving..." : "Save Changes"}
                  </button>
                ) : (
                  <button onClick={handleCreatePetition} disabled={isSubmitting}
                    className="px-6 py-2 bg-[#007AFF] text-white font-black rounded-lg flex items-center gap-2 shadow-[0_0_16px_rgba(0,122,255,0.35)] hover:bg-blue-500 transition-all disabled:opacity-50 text-xs">
                    {isSubmitting ? <Loader2 className="animate-spin" size={15} /> : <Rocket size={15} />}
                    {isSubmitting ? "Deploying..." : "Finalize & Deploy"}
                  </button>
                )}
                <button className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/8" onClick={editingPetition ? closeEditMode : closeCreateModal}><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">

              {/* LEFT PANEL */}
              <div className="w-72 bg-[#161920] border-r border-white/8 flex flex-col overflow-hidden shrink-0">

                {/* Element list */}
                <div className="p-4 border-b border-white/8">
                  <p className="text-[9px] font-black uppercase text-gray-600 tracking-widest mb-3">Elements</p>
                  <div className="space-y-1">
                    {Object.keys(elements).map(key => {
                      const el = elements[key];
                      const isActive = activeElement === key;
                      return (
                        <button key={key} onClick={() => setActiveElement(key)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-xs font-bold ${isActive ? 'bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/30' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'}`}>
                          {el.type === 'text' ? <Type size={13} className={isActive ? 'text-[#007AFF]' : 'text-gray-600'} /> : <ImageIcon size={13} className={isActive ? 'text-[#007AFF]' : 'text-gray-600'} />}
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${isActive ? 'bg-[#007AFF]/20 text-[#007AFF]' : 'bg-white/5 text-gray-600'}`}>{el.type}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Properties */}
                <div className="flex-1 p-4 overflow-y-auto">
                  {!activeElement ? (
                    <div className="flex flex-col items-center justify-center h-full text-center border-2 border-dashed border-white/8 rounded-xl p-6">
                      <MousePointer2 className="w-8 h-8 text-gray-700 mb-3" />
                      <p className="text-xs text-gray-500 font-medium leading-relaxed">Click an element on the canvas or use arrow keys to nudge.</p>
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <p className="text-[9px] font-black uppercase text-gray-600 tracking-widest">Properties</p>

                      {/* COORDINATES */}
                      <div className="grid grid-cols-2 gap-2">
                        {(['x', 'y', 'w', 'h'] as const).map(prop => (
                          <div key={prop} className="bg-[#0c0e12] p-2.5 rounded-lg border border-white/6">
                            <p className="text-[9px] font-bold text-gray-600 uppercase mb-1">{prop === 'x' ? 'X-Axis' : prop === 'y' ? 'Y-Axis' : prop === 'w' ? 'Width' : 'Height'}</p>
                            <p className="text-sm font-mono font-black text-white">{elements[activeElement]?.[prop]?.toFixed(1)}%</p>
                          </div>
                        ))}
                      </div>

                      {/* TEXT-SPECIFIC PROPERTIES */}
                      {elements[activeElement]?.type === 'text' && (
                        <>
                          {/* FONT FAMILY */}
                          <div>
                            <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block mb-1.5">Font</label>
                            <select
                              value={elements[activeElement]?.fontFamily || 'system-ui'}
                              onChange={e => updateActiveElement('fontFamily', e.target.value)}
                              className="w-full p-2.5 bg-[#0c0e12] border border-white/8 rounded-lg text-xs font-bold text-white outline-none focus:border-[#007AFF] transition-colors appearance-none cursor-pointer"
                              style={{ fontFamily: elements[activeElement]?.fontFamily }}
                            >
                              {AVAILABLE_FONTS.map(f => (
                                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.name}</option>
                              ))}
                            </select>
                            {/* Font preview strip */}
                            <div className="mt-2 px-3 py-2 bg-[#0c0e12] rounded-lg border border-white/6 overflow-hidden">
                              <span style={{
                                fontFamily: elements[activeElement]?.fontFamily,
                                color: elements[activeElement]?.color || '#fff',
                                fontSize: 16, fontWeight: 900,
                              }}>
                                {DEMO_PREVIEW[activeElement] || "Preview Text"}
                              </span>
                            </div>
                          </div>

                          {/* FONT WEIGHT */}
                          <div>
                            <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block mb-1.5">Weight</label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {(['400', '700', '900'] as const).map(w => (
                                <button key={w}
                                  onClick={() => updateActiveElement('fontWeight', w)}
                                  className={`py-2 rounded-lg text-xs transition-all border ${elements[activeElement]?.fontWeight === w ? 'bg-[#007AFF]/15 text-[#007AFF] border-[#007AFF]/30' : 'bg-[#0c0e12] text-gray-400 border-white/6 hover:border-white/15'}`}
                                  style={{ fontWeight: Number(w) }}>
                                  {w === '400' ? 'Regular' : w === '700' ? 'Bold' : 'Black'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* FONT SIZE */}
                          <div>
                            <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block mb-1.5">Size (px)</label>
                            <div className="flex gap-2">
                              <input type="range" min={12} max={200} value={elements[activeElement]?.fontSize}
                                onChange={e => updateActiveElement('fontSize', Number(e.target.value))}
                                className="flex-1 accent-[#007AFF]" />
                              <input type="number" value={elements[activeElement]?.fontSize}
                                onChange={e => updateActiveElement('fontSize', Number(e.target.value))}
                                className="w-16 p-2 bg-[#0c0e12] border border-white/8 rounded-lg text-xs font-mono font-bold text-white outline-none focus:border-[#007AFF] text-center" />
                            </div>
                          </div>

                          {/* COLOR */}
                          <div>
                            <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block mb-1.5">Color</label>
                            <div className="flex gap-2 items-center">
                              <input type="color" value={elements[activeElement]?.color}
                                onChange={e => updateActiveElement('color', e.target.value)}
                                className="w-10 h-10 border border-white/8 rounded-lg p-1 bg-[#0c0e12] cursor-pointer" />
                              <input type="text" value={elements[activeElement]?.color}
                                onChange={e => updateActiveElement('color', e.target.value)}
                                className="flex-1 border border-white/8 rounded-lg px-3 py-2 text-xs font-mono uppercase bg-[#0c0e12] text-white font-bold outline-none focus:border-[#007AFF]" />
                            </div>
                            {/* Quick colors */}
                            <div className="flex gap-1.5 mt-2">
                              {['#ffffff', '#000000', '#FFD700', '#FF4444', '#007AFF', '#22d3ee'].map(c => (
                                <button key={c} onClick={() => updateActiveElement('color', c)}
                                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                                  style={{ background: c, borderColor: elements[activeElement]?.color === c ? GUIDE_COLOR : 'rgba(255,255,255,0.15)' }} />
                              ))}
                            </div>
                          </div>

                          {/* TEXT ALIGN */}
                          <div>
                            <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block mb-1.5">Alignment</label>
                            <div className="flex gap-1.5">
                              {(['left', 'center', 'right'] as const).map(align => {
                                const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
                                return (
                                  <button key={align} onClick={() => updateActiveElement('align', align)}
                                    className={`flex-1 py-2 rounded-lg flex items-center justify-center transition-all border ${elements[activeElement]?.align === align ? 'bg-[#007AFF]/15 text-[#007AFF] border-[#007AFF]/30' : 'bg-[#0c0e12] text-gray-500 border-white/6 hover:border-white/15'}`}>
                                    <Icon size={14} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* ─── TEXT SHADOW TOGGLE ─── */}
                          <div>
                            <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block mb-1.5">Text Shadow</label>
                            <button
                              onClick={() => {
                                const current = elements[activeElement]?.textShadowEnabled !== false;
                                updateActiveElement('textShadowEnabled', !current);
                              }}
                              className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                                elements[activeElement]?.textShadowEnabled !== false
                                  ? 'bg-[#007AFF]/15 text-[#007AFF] border-[#007AFF]/30'
                                  : 'bg-[#0c0e12] text-gray-500 border-white/6 hover:border-white/15'
                              }`}
                            >
                              {elements[activeElement]?.textShadowEnabled !== false ? (
                                <><CheckCircle2 size={13} /> Shadow On</>
                              ) : (
                                <><X size={13} /> Shadow Off</>
                              )}
                            </button>
                          </div>
                        </>
                      )}

                      {/* QR WHITE BORDER TOGGLE */}
                      {elements[activeElement]?.id === 'qrCode' && (
                        <div>
                          <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block mb-1.5">White Border</label>
                          <button onClick={() => updateActiveElement('hasWhiteBorder', !elements[activeElement]?.hasWhiteBorder)}
                            className={`w-full py-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-2 ${elements[activeElement]?.hasWhiteBorder ? 'bg-[#007AFF]/15 text-[#007AFF] border-[#007AFF]/30' : 'bg-[#0c0e12] text-gray-500 border-white/6'}`}>
                            {elements[activeElement]?.hasWhiteBorder ? '✓ White Border On' : 'White Border Off'}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* CANVAS */}
              <div className="flex-1 overflow-auto bg-[#0a0b0f] flex justify-center items-start relative select-none p-16"
                onClick={e => { if (e.target === e.currentTarget) setActiveElement(null); }}>

                {/* ZOOM BAR */}
                <div className="fixed top-20 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-[#1a1d24]/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full border border-white/8 shadow-2xl z-50 text-sm">
                  <button onClick={() => setZoom(z => Math.max(0.1, +(z - 0.1).toFixed(1)))} className="text-gray-400 hover:text-white transition-colors">
                    <ZoomOut size={16} />
                  </button>
                  <span className="font-mono font-black w-12 text-center text-xs">{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(1)))} className="text-gray-400 hover:text-white transition-colors">
                    <ZoomIn size={16} />
                  </button>
                  <div className="w-px h-4 bg-white/10" />
                  <button onClick={() => setZoom(0.4)} className="text-gray-400 hover:text-white transition-colors" title="Fit">
                    <Maximize size={15} />
                  </button>
                </div>

                {/* CANVAS FRAME */}
                <div style={{ width: 1080 * zoom, height: 1440 * zoom }} className="relative shrink-0 origin-top-left shadow-[0_0_80px_rgba(0,0,0,0.6)] ring-1 ring-white/8">
                  <div
                    ref={containerRef}
                    style={{
                      position: 'absolute', inset: 0,
                      width: '1080px', height: '1440px',
                      transform: `scale(${zoom})`,
                      transformOrigin: 'top left',
                      backgroundImage: `url(${baseImagePreview})`,
                      backgroundSize: '100% 100%',
                    }}
                  >
                    {/* VERTICAL GUIDE LINES */}
                    {guides.vertical.map((x, i) => (
                      <div key={`vg-${i}`} style={{
                        position: 'absolute', top: 0, bottom: 0, left: `${x}%`,
                        borderLeft: `2px solid ${GUIDE_COLOR}`,
                        boxShadow: `0 0 8px ${GUIDE_COLOR}`,
                        zIndex: 50, pointerEvents: 'none',
                      }} />
                    ))}

                    {/* HORIZONTAL GUIDE LINES */}
                    {guides.horizontal.map((y, i) => (
                      <div key={`hg-${i}`} style={{
                        position: 'absolute', left: 0, right: 0, top: `${y}%`,
                        borderTop: `2px solid ${GUIDE_COLOR}`,
                        boxShadow: `0 0 8px ${GUIDE_COLOR}`,
                        zIndex: 50, pointerEvents: 'none',
                      }} />
                    ))}

                    {/* EQUAL SPACING INDICATORS */}
                    {guides.equalH.map((seg, i) => (
                      <div key={`eq-h-${i}`} style={{
                        position: 'absolute',
                        top: `${seg.y}%`,
                        left: `${seg.x1}%`,
                        width: `${seg.x2 - seg.x1}%`,
                        height: 2,
                        background: `rgba(251,191,36,0.9)`,
                        zIndex: 51, pointerEvents: 'none',
                        boxShadow: '0 0 6px rgba(251,191,36,0.6)',
                      }}>
                        <div style={{ position: 'absolute', left: 0, top: -4, width: 2, height: 10, background: 'rgba(251,191,36,0.9)' }} />
                        <div style={{ position: 'absolute', right: 0, top: -4, width: 2, height: 10, background: 'rgba(251,191,36,0.9)' }} />
                      </div>
                    ))}

                    {/* RENDER ELEMENTS */}
                    {Object.keys(elements).map(key => renderElement(key, elements[key]))}
                  </div>
                </div>
              </div>

              {/* MINI PREVIEW PANEL (right side) */}
              <div className="w-52 bg-[#161920] border-l border-white/8 flex flex-col overflow-hidden shrink-0">
                <div className="p-4 border-b border-white/8 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase text-gray-600 tracking-widest">Live Preview</p>
                    <p className="text-[9px] text-gray-700 mt-0.5 font-medium">With demo citizen data</p>
                  </div>
                  <button
                    onClick={() => setShowFullPreview(true)}
                    title="Full screen preview"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                  >
                    <Maximize size={13} />
                  </button>
                </div>
                <div ref={previewPanelRef} className="flex-1 p-3 overflow-y-auto flex items-start justify-center">
                  <div ref={previewFrameRef} style={{ width: '100%', paddingTop: '133.33%', position: 'relative', borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                    <div style={{
                      position: 'absolute', inset: 0,
                      backgroundImage: `url(${baseImagePreview})`,
                      backgroundSize: '100% 100%',
                    }}>
                      {Object.keys(elements).map(key =>
                        renderElement(key, elements[key], true, previewPanelW / CANVAS_W)
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-white/8">
                  <div className="text-[9px] text-gray-600 font-bold space-y-1">
                    <div className="flex justify-between"><span>Name:</span><span className="text-gray-400">Rahul Sharma</span></div>
                    <div className="flex justify-between"><span>Date:</span><span className="text-gray-400">08 Jun 2026</span></div>
                    <div className="flex justify-between"><span>QR:</span><span className="text-gray-400">Auto-gen</span></div>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── FULL PREVIEW MODAL ─── */}
      <AnimatePresence>
        {showFullPreview && baseImagePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-gray-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6"
            onClick={() => setShowFullPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="relative flex flex-col items-center max-h-full"
            >
              <div className="flex items-center justify-between w-full mb-4">
                <div>
                  <p className="text-white font-black text-sm">Full Poster Preview</p>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Demo data · 1080×1440 canvas</p>
                </div>
                <button
                  onClick={() => setShowFullPreview(false)}
                  className="p-2 rounded-xl bg-white/8 hover:bg-white/15 text-gray-400 hover:text-white transition-colors ml-8"
                >
                  <X size={18} />
                </button>
              </div>
              <div
                style={{
                  position: 'relative',
                  height: 'calc(100vh - 140px)',
                  aspectRatio: '3/4',
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
                }}
              >
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url(${baseImagePreview})`,
                  backgroundSize: '100% 100%',
                }} />
                <FullPreviewCanvas elements={elements} baseImage={baseImagePreview} />
              </div>
              <p className="text-gray-700 text-[10px] font-bold mt-3 uppercase tracking-widest">Click outside to close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── DELETE MODAL ─── */}
      <AnimatePresence>
        {petitionToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-gray-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.97, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: 16 }}
              className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-7 text-center">
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-1.5">Terminate Campaign?</h2>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed font-medium">
                You are about to permanently delete <strong className="text-gray-900">{petitionToDelete.title}</strong>. All associated data will be erased forever.
              </p>
              <div className="flex gap-2.5">
                <button onClick={() => setPetitionToDelete(null)} disabled={isDeleting}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={handleDeletePetition} disabled={isDeleting}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm flex justify-center gap-2 items-center hover:bg-red-700 transition-colors">
                  {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />} Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── INSPECT PETITION MODAL ─── */}
      <AnimatePresence>
        {selectedPetition && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-gray-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.97, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: 16 }}
              className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col h-[85vh] overflow-hidden">

              <div className="bg-gray-950 p-5 flex justify-between items-center shrink-0 border-b border-white/8">
                <div className="text-white">
                  <span className="text-[9px] font-bold text-[#007AFF] uppercase tracking-widest flex items-center gap-1.5 mb-0.5"><TrendingUp className="w-3 h-3" /> Campaign Intelligence</span>
                  <h3 className="text-xl font-black">{selectedPetition.title}</h3>
                </div>
                <div className="flex items-center gap-3">
                  {/* 🔥 NEW: EXPORT PDF BUTTON 🔥 */}
                  <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#007AFF] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-lg">
                    <FileDown className="w-3.5 h-3.5" /> Report PDF
                  </button>
                  {/* 🔥 NEW: EXPORT CSV BUTTON 🔥 */}
                  <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-white/8 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition-colors border border-white/8">
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                  <button onClick={() => setSelectedPetition(null)} className="p-1.5 hover:bg-white/8 rounded-lg transition-colors text-gray-400 hover:text-white ml-2"><X className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="bg-gray-50 border-b border-gray-100 p-5 flex gap-8 shrink-0">
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Signatures</p>
                  <p className="text-3xl font-black text-[#007AFF]">{selectedPetition.signatureCount?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Target Goal</p>
                  <p className="text-3xl font-black text-gray-900">{selectedPetition.targetSignatures?.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[9px] uppercase tracking-widest text-gray-400 bg-gray-50/60 sticky top-0">
                      <th className="px-5 py-4 font-bold">Citizen Identity</th>
                      <th className="px-5 py-4 font-bold">Contact</th>
                      <th className="px-5 py-4 font-bold">Jurisdiction</th>
                      <th className="px-5 py-4 font-bold">Signed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingSigs ? (
                      <tr><td colSpan={4} className="px-5 py-16 text-center text-gray-400">
                        <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#007AFF] mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest">Loading signatures...</p>
                      </td></tr>
                    ) : signatures.length === 0 ? (
                      <tr><td colSpan={4} className="px-5 py-16 text-center text-gray-400 font-medium">
                        <Users className="w-10 h-10 mx-auto mb-2.5 opacity-20" />
                        No signatures collected yet.
                      </td></tr>
                    ) : (
                      signatures.map(sig => (
                        <tr key={sig.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-5 py-3.5 font-black text-gray-900 text-sm">{sig.name}</td>
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-bold text-gray-700">{sig.phone}</p>
                            {sig.email && <p className="text-xs text-gray-400 mt-0.5">{sig.email}</p>}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-bold text-gray-600">{sig.district}, {sig.state}</td>
                          <td className="px-5 py-3.5 text-xs font-semibold text-gray-400">{new Date(sig.signedAt?.toDate()).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ─── FULL PREVIEW CANVAS ──────────────────────────────────────────────────────
const CANVAS_W_CONST = 1080;

function FullPreviewCanvas({ elements, baseImage }: { elements: Record<string, any>, baseImage: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!ref.current) return;
    const node = ref.current;
    const updateScale = () => setScale(node.getBoundingClientRect().width / CANVAS_W_CONST);
    updateScale();
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setScale(e.contentRect.width / CANVAS_W_CONST);
      }
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const DEMO_PREVIEW_LOCAL: Record<string, string> = {
    citizenName: "Rahul Sharma",
    date: "08 Jun 2026",
  };

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
      {Object.keys(elements).map(key => {
        const el = elements[key];
        const demoText = DEMO_PREVIEW_LOCAL[key] || undefined;
        // FIX: guard against undefined fontSize for image elements
        const scaledFont = el.type === 'text' ? (el.fontSize || 24) * scale : 14 * scale;
        const scaledTextPad = ELEMENT_TEXT_PAD * scale;
        // FIX: text shadow respects toggle
        const resolvedShadow = el.type === 'text'
          ? (el.textShadowEnabled !== false && el.textShadow ? scaleTextShadow(el.textShadow, scale) : 'none')
          : 'none';

        const style: React.CSSProperties = {
          position: 'absolute',
          left: `${el.x}%`, top: `${el.y}%`,
          width: `${el.w}%`, height: `${el.h}%`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxSizing: 'border-box',
        };

        return (
          <div key={key} style={style}>
            {el.type === 'text' ? (
              <span style={{
                color: el.color,
                fontSize: `${scaledFont}px`,
                fontFamily: el.fontFamily || 'system-ui',
                fontWeight: el.fontWeight || 900,
                textAlign: el.align as any,
                lineHeight: 1.1,
                textShadow: resolvedShadow,
                width: '100%',
                // FIX: consistent padding so text starts/ends naturally
                padding: `0 ${scaledTextPad}px`,
                boxSizing: 'border-box',
                userSelect: 'none',
                display: 'block',
                wordBreak: 'break-word',
                whiteSpace: 'normal',
              }}>
                {demoText || el.label}
              </span>
            ) : el.id === 'qrCode' ? (
              <div style={{
                width: '100%', height: '100%',
                background: '#ffffff',
                borderRadius: '14%',
                boxShadow: `0 ${4 * scale}px ${20 * scale}px rgba(0,0,0,0.35)`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '8%', boxSizing: 'border-box',
              }}>
                <svg viewBox="0 0 40 40" width="100%" height="100%" style={{ borderRadius: 4 * scale }}>
                  <rect width="40" height="40" fill="#fff" />
                  <rect x="1" y="1" width="12" height="12" rx="1.5" fill="none" stroke="#111" strokeWidth="2.2" />
                  <rect x="4" y="4" width="6" height="6" rx="0.5" fill="#111" />
                  <rect x="27" y="1" width="12" height="12" rx="1.5" fill="none" stroke="#111" strokeWidth="2.2" />
                  <rect x="30" y="4" width="6" height="6" rx="0.5" fill="#111" />
                  <rect x="1" y="27" width="12" height="12" rx="1.5" fill="none" stroke="#111" strokeWidth="2.2" />
                  <rect x="4" y="30" width="6" height="6" rx="0.5" fill="#111" />
                  {[14,17,20,23,26,14,17,20,23,26,14,17,20,23,26,14,17,20,23,26,27,30,33,36].map((cx, i) => (
                    <rect key={i} x={cx} y={14 + (i % 6) * 4} width="2.2" height="2.2" rx="0.4" fill="#111" />
                  ))}
                </svg>
              </div>
            ) : (
              // FIX: no drop-shadow/backdropFilter on image placeholders in preview
              <div style={{
                width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.15)',
                borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  color: 'rgba(255,255,255,0.45)',
                  fontSize: `${scaledFont}px`,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                }}>
                  {el.label}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}