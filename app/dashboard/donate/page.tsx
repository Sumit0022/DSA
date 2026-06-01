// app/dashboard/donate/page.tsx
"use client";

import { useState, useEffect } from "react";
import { HeartHandshake, ShieldCheck, History, Loader2, IndianRupee, Clock, CheckCircle2, FileText, CreditCard, AlertTriangle, X, Info } from "lucide-react";
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import jsPDF from "jspdf";
import { motion, AnimatePresence } from "framer-motion";

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function DonatePage() {
  const { userData, loadingUser } = useUser();
  const [amount, setAmount] = useState<string>("500");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [panNumber, setPanNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // MODERN UI STATES
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | null }>({ message: "", type: null });
  const [successModal, setSuccessModal] = useState<{show: boolean, amount: number, txnId: string}>({show: false, amount: 0, txnId: ""});

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: null }), 5000);
  };

  // Fetch Past Donations
  useEffect(() => {
    if (!userData?.id) return;
    const q = query(collection(db, "donations"), where("userId", "==", userData.id), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      setHistory(docs);
      setLoadingHistory(false);
    });
    return () => unsubscribe();
  }, [userData?.id]);

  const handleDonate = async () => {
    const finalAmount = parseInt(amount === "custom" ? customAmount : amount);
    if (!finalAmount || finalAmount < 100) return showToast("Minimum contribution amount is ₹100", "error");
    if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.toUpperCase())) {
      return showToast("Invalid PAN Card format. Please check or leave empty.", "error");
    }
    if (!userData) return showToast("User identity not found. Please log in again.", "error");

    setIsProcessing(true);

    try {
      const res = await loadRazorpayScript();
      if (!res) throw new Error("Secure payment gateway failed to load. Check your connection.");

      const orderResponse = await fetch("/api/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: finalAmount }),
      });
      const orderData = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(orderData.error);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_SoRUGbeDDagVeE", 
        amount: orderData.amount,
        currency: "INR",
        name: "Democratic Social Alliance",
        description: "Official Alliance Treasury Contribution",
        order_id: orderData.orderId,
        handler: async function (response: any) {
          // On Success, Save to Firebase
          await addDoc(collection(db, "donations"), {
            userId: userData.id,
            userName: userData.name,
            userEmail: userData.email || "N/A",
            userPhone: userData.phone || "N/A",
            panNumber: panNumber ? panNumber.toUpperCase() : "NOT PROVIDED",
            amount: finalAmount,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            status: "Success",
            createdAt: serverTimestamp(),
          });
          
          setPanNumber("");
          setIsProcessing(false);
          // Trigger the beautiful success modal!
          setSuccessModal({show: true, amount: finalAmount, txnId: response.razorpay_payment_id});
        },
        prefill: {
          name: userData.name,
          email: userData.email,
          contact: userData.phone,
        },
        theme: { color: "#007AFF" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setIsProcessing(false);
        showToast(`Transaction Failed: ${response.error.description}`, "error");
      });
      rzp.open();
    } catch (error: any) {
      console.error(error);
      setIsProcessing(false);
      showToast(error.message || "Failed to initiate secure connection.", "error");
    }
  };

  // 80G Receipt Generator - MODERN REDESIGN
const generate80GReceipt = async (record: any) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const dateObj = record.createdAt ? record.createdAt.toDate() : new Date();
  const formattedDate = dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const receiptNo = `DSA-${dateObj.getFullYear()}-${record.razorpayPaymentId.slice(-8).toUpperCase()}`;

  // ─── BACKGROUND ────────────────────────────────────────────────────────────
  // Full page off-white background
  doc.setFillColor(252, 252, 253);
  doc.rect(0, 0, pageW, pageH, "F");

  // Top dark header band
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageW, 55, "F");

  // Accent stripe (blue)
  doc.setFillColor(0, 122, 255);
  doc.rect(0, 55, pageW, 4, "F");

  // ─── LOGO ──────────────────────────────────────────────────────────────────
  try {
    const logoResp = await fetch("/dsa-logo.png");
    const blob = await logoResp.blob();
    const b64: string = await new Promise((res) => {
      const reader = new FileReader();
      reader.onload = () => res((reader.result as string).split(",")[1]);
      reader.readAsDataURL(blob);
    });
    // Place logo top-left in header
    doc.addImage(b64, "PNG", 14, 8, 32, 32);
  } catch (_) {
    // Logo load failed — skip silently
  }

  // ─── HEADER TEXT ───────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("Democratic Social Alliance", 52, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("Headquarters, New Delhi, India", 52, 30);
  doc.text("contact@dsa.org  ·  Reg. No: DSA/2026/80G", 52, 37);
  doc.text("CIN: U85300DL2026NPL000000  ·  FCRA: 000000000", 52, 44);

  // ─── RECEIPT TITLE BAND ────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("DONATION RECEIPT", pageW / 2, 72, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("(Eligible for Tax Exemption under Section 80G of Income Tax Act, 1961)", pageW / 2, 79, { align: "center" });

  // Thin separator
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, 84, pageW - 14, 84);

  // ─── RECEIPT META ROW ──────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("RECEIPT NO.", 14, 92);
  doc.text("DATE", pageW - 14, 92, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(receiptNo, 14, 99);
  doc.text(formattedDate, pageW - 14, 99, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 104, pageW - 14, 104);

  // ─── MAIN DETAILS CARD ─────────────────────────────────────────────────────
  // Card background
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, 110, pageW - 28, 100, 4, 4, "FD");

  // Blue left accent bar inside card
  doc.setFillColor(0, 122, 255);
  doc.roundedRect(14, 110, 3, 100, 1.5, 1.5, "F");

  const labelColor: [number, number, number] = [100, 116, 139];
  const valueColor: [number, number, number] = [15, 23, 42];
  const fieldX = 24;
  const valueX = 80;

  const drawField = (label: string, value: string, y: number, valueBold = false, valueLarge = false) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...labelColor);
    doc.text(label.toUpperCase(), fieldX, y);

    doc.setFont("helvetica", valueBold ? "bold" : "normal");
    doc.setFontSize(valueLarge ? 14 : 10);
    doc.setTextColor(...valueColor);
    doc.text(value, valueX, y);
  };

  drawField("Received With Thanks From", record.userName.toUpperCase(), 122, true);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(fieldX, 128, pageW - 20, 128);

  drawField("Email Address", record.userEmail || "N/A", 138);

  doc.line(fieldX, 144, pageW - 20, 144);

  drawField("PAN Card Number", record.panNumber || "NOT PROVIDED", 154, true);

  doc.line(fieldX, 160, pageW - 20, 160);

  // Amount — big and prominent
  drawField("Contribution Amount", `INR ${record.amount.toLocaleString("en-IN")} /-`, 172, true, true);

  doc.line(fieldX, 180, pageW - 20, 180);

  drawField("Payment Method", "Razorpay — UPI / Card / Net Banking", 190);

  doc.line(fieldX, 196, pageW - 20, 196);

  drawField("Transaction ID", record.razorpayPaymentId, 206);

  // ─── STATUS BADGE ──────────────────────────────────────────────────────────
  doc.setFillColor(220, 252, 231); // green-100
  doc.roundedRect(pageW - 52, 112, 36, 12, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(22, 163, 74); // green-600
  doc.text("✓  SUCCESS", pageW - 34, 120, { align: "center" });

  // ─── DECLARATION BOX ───────────────────────────────────────────────────────
  doc.setFillColor(239, 246, 255); // blue-50
  doc.setDrawColor(191, 219, 254); // blue-200
  doc.setLineWidth(0.4);
  doc.roundedRect(14, 220, pageW - 28, 28, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text("Tax Exemption Declaration", 20, 229);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const declaration =
    "This receipt is computer generated and valid for claiming tax exemption under section 80G(5)(vi) of the " +
    "Income Tax Act, 1961. 100% of your contribution goes towards the official treasury of the Democratic Social " +
    "Alliance. No goods or services were provided in consideration of this donation.";
  const lines = doc.splitTextToSize(declaration, pageW - 42);
  doc.text(lines, 20, 236);

  // ─── FOOTER ────────────────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, 262, pageW - 14, 262);

  // Authorized signatory box (right)
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(pageW - 70, 268, 56, 22, "S");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Authorized Signatory", pageW - 42, 282, { align: "center" });
  doc.text("Democratic Social Alliance", pageW - 42, 287, { align: "center" });

  // Footer left note
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("Generated on: " + new Date().toLocaleString("en-IN"), 14, 272);
  doc.text("This is a system-generated document and does not require a physical signature.", 14, 278);
  doc.text("For queries: contact@dsa.org | www.dsa.org", 14, 284);

  // Bottom accent bar
  doc.setFillColor(0, 122, 255);
  doc.rect(0, pageH - 5, pageW, 5, "F");
  doc.setFillColor(15, 23, 42);
  doc.rect(0, pageH - 10, pageW, 5, "F");

  doc.save(`DSA_80G_Receipt_${record.razorpayPaymentId}.pdf`);
};

  if (loadingUser) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 relative">
      
      {/* MODERN FLOATING TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast.type && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[500] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm max-w-sm border ${
              toast.type === "success" ? "bg-gray-900 text-white border-gray-800" : 
              toast.type === "info" ? "bg-blue-50 text-blue-700 border-blue-200" :
              "bg-red-50 text-red-600 border-red-200"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />}
            {toast.type === "error" && <AlertTriangle className="w-5 h-5 shrink-0" />}
            {toast.type === "info" && <Info className="w-5 h-5 shrink-0" />}
            <p className="leading-snug">{toast.message}</p>
            <button onClick={() => setToast({ message: "", type: null })} className="ml-auto opacity-50 hover:opacity-100 transition-opacity">
              <X className="w-4 h-4 shrink-0" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PREMIUM SUCCESS MODAL */}
      <AnimatePresence>
        {successModal.show && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
            >
              <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-8 text-center relative overflow-hidden">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-3xl font-black text-white">Thank You!</h3>
                <p className="text-green-50 text-sm font-medium mt-2">Your contribution powers the alliance.</p>
              </div>
              <div className="p-6 md:p-8 space-y-4">
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Amount</span>
                    <span className="font-black text-gray-900 text-lg">₹{successModal.amount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-gray-200 pt-3">
                    <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Transaction ID</span>
                    <span className="font-mono text-xs text-gray-700 font-bold">{successModal.txnId}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSuccessModal({show: false, amount: 0, txnId: ""})} 
                  className="w-full py-4 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-black transition-colors"
                >
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER HERO */}
      <div className="bg-gray-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#007AFF]/30 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 border border-white/20 backdrop-blur-sm">
            <HeartHandshake className="w-6 h-6 text-[#007AFF]" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 leading-tight">Fund the Movement. <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#007AFF]">Empower the Ground.</span></h1>
          <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-xl">
            The alliance runs on the transparent support of its citizens. Contributions are eligible for tax deduction under Section 80G.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* DONATION WIDGET */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-3xl p-6 shadow-sm h-max">
          <h3 className="font-black text-gray-900 text-xl mb-6">Make a Contribution</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {["100", "500", "1000"].map((val) => (
                <button
                  key={val}
                  onClick={() => { setAmount(val); setCustomAmount(""); }}
                  className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${amount === val ? 'border-[#007AFF] bg-blue-50 text-[#007AFF]' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'}`}
                >
                  ₹{val}
                </button>
              ))}
            </div>
            
            <div className="relative">
              <input
                type="number"
                placeholder="Custom Amount (Min ₹100)"
                value={customAmount}
                onChange={(e) => { setAmount("custom"); setCustomAmount(e.target.value); }}
                className={`w-full pl-10 pr-4 py-3.5 bg-gray-50 border-2 rounded-xl text-sm font-bold outline-none transition-all ${amount === "custom" ? 'border-[#007AFF] bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}
              />
              <IndianRupee className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${amount === "custom" ? 'text-[#007AFF]' : 'text-gray-400'}`} />
            </div>

            <div className="pt-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">PAN Card (For 80G Receipt) *Optional</label>
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ABCDE1234F"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-[#007AFF] shadow-sm uppercase"
                />
              </div>
            </div>

            <button
              onClick={handleDonate}
              disabled={isProcessing}
              className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors shadow-lg disabled:opacity-50 mt-4"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              {isProcessing ? "Connecting Treasury..." : `Securely Donate ₹${amount === "custom" ? customAmount || "0" : amount}`}
            </button>
            <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center justify-center gap-1">
               Secured by Razorpay Encryption
            </p>
          </div>
        </div>

        {/* CONTRIBUTION LEDGER */}
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[500px]">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400" /> Contribution Ledger
            </h3>
            <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-1 rounded uppercase font-bold tracking-widest">Permanent Record</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {loadingHistory ? (
              <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" /></div>
            ) : history.length === 0 ? (
              <div className="text-center py-20 text-gray-400 px-6">
                <HeartHandshake className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-medium text-sm">Your ledger is currently empty. Make your first contribution to the alliance treasury to leave your mark.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100 group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-black text-gray-900 flex items-center gap-0.5"><IndianRupee className="w-3.5 h-3.5"/>{record.amount}</p>
                        <p className="text-[10px] text-gray-400 font-bold tracking-wider mt-0.5">TXN: {record.razorpayPaymentId}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-500">{record.createdAt ? new Date(record.createdAt.toDate()).toLocaleDateString() : "Just Now"}</p>
                        <p className="text-[10px] text-gray-400 font-bold flex items-center justify-end gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {record.createdAt ? new Date(record.createdAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                        </p>
                      </div>
                      <button 
                        onClick={() => generate80GReceipt(record)}
                        title="Download 80G Receipt"
                        className="p-2 bg-white border border-gray-200 text-[#007AFF] rounded-lg shadow-sm hover:bg-blue-50 transition-colors opacity-0 md:group-hover:opacity-100 md:opacity-0 opacity-100"
                      >
                        <FileText className="w-4 h-4" />
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
  );
}