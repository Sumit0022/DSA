// app/admin/donations/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Download, FileText, IndianRupee, Search, TrendingUp, Users, Filter, Loader2, CheckCircle2, HeartHandshake } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function TreasuryDashboard() {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("All");

  useEffect(() => {
    const q = query(collection(db, "donations"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      setDonations(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredDonations = donations.filter((donation) => {
    const matchesSearch =
      donation.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donation.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donation.panNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donation.razorpayPaymentId?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesTime = true;
    if (donation.createdAt && timeFilter !== "All") {
      const date = donation.createdAt.toDate();
      const now = new Date();
      if (timeFilter === "Week") {
        const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
        matchesTime = date >= weekAgo;
      } else if (timeFilter === "Month") {
        matchesTime = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      } else if (timeFilter === "Year") {
        matchesTime = date.getFullYear() === now.getFullYear();
      }
    }
    return matchesSearch && matchesTime;
  });

  const totalRaised = filteredDonations.reduce((sum, doc) => sum + Number(doc.amount), 0);
  const totalDonors = new Set(filteredDonations.map(d => d.userId)).size;

  const exportCSV = () => {
    const headers = ["Date", "Time", "Donation ID", "Citizen Name", "PAN Number", "Phone", "Email", "Amount (INR)", "Status"];
    const csvRows = filteredDonations.map(d => {
      const dateObj = d.createdAt ? d.createdAt.toDate() : new Date();
      return [
        dateObj.toLocaleDateString(),
        dateObj.toLocaleTimeString(),
        d.razorpayPaymentId || d.id,
        `"${d.userName || 'Unknown'}"`,
        d.panNumber || 'N/A',
        d.userPhone || 'N/A',
        d.userEmail || 'N/A',
        d.amount,
        d.status
      ].join(",");
    });
    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `DSA_Treasury_${timeFilter}_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  // ✅ MODERN PDF EXPORT WITH DSA BRANDING
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // ── HEADER BAND ──────────────────────────────────────────────
    // Dark navy background
    doc.setFillColor(10, 15, 30);
    doc.rect(0, 0, pageW, 42, "F");

    // Accent blue left stripe
    doc.setFillColor(0, 122, 255);
    doc.rect(0, 0, 6, 42, "F");

    // Try to load logo from public folder
    try {
      const img = new Image();
      img.src = "/dsa-logo.png";
      doc.addImage(img, "PNG", 12, 6, 28, 28);
    } catch (_) {
      // logo unavailable — skip silently
    }

    // Party name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("Democratic Social Alliance", 46, 18);

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(160, 185, 220);
    doc.text("Official Treasury & Donation Ledger", 46, 26);

    // Right-side meta pill
    doc.setFillColor(0, 122, 255);
    doc.roundedRect(pageW - 68, 10, 60, 22, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`Filter: ${timeFilter}`, pageW - 58, 19);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - 58, 26);

    // ── SUMMARY CARDS ROW ────────────────────────────────────────
    const cardY = 50;
    const cardH = 22;
    const cardW = 72;
    const cards = [
      { label: "TOTAL FUNDS RAISED", value: `INR ${totalRaised.toLocaleString()}`, accent: [0, 122, 255] },
      { label: "UNIQUE DONORS",      value: `${totalDonors} Citizens`,             accent: [16, 185, 129] },
      { label: "TOTAL TRANSACTIONS", value: `${filteredDonations.length} TXNs`,    accent: [249, 115, 22] },
    ];

    cards.forEach((card, i) => {
      const x = 14 + i * (cardW + 8);
      // Card bg
      doc.setFillColor(245, 247, 252);
      doc.roundedRect(x, cardY, cardW, cardH, 3, 3, "F");
      // Left accent bar
      doc.setFillColor(...(card.accent as [number, number, number]));
      doc.roundedRect(x, cardY, 3, cardH, 1, 1, "F");
      // Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(120, 130, 150);
      doc.text(card.label, x + 7, cardY + 8);
      // Value
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(10, 15, 30);
      doc.text(card.value, x + 7, cardY + 18);
    });

    // ── SECTION LABEL ────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 110, 130);
    doc.text("TRANSACTION RECORDS", 14, 82);
    // Thin divider line
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.4);
    doc.line(14, 84, pageW - 14, 84);

    // ── TABLE ────────────────────────────────────────────────────
    const tableRows = filteredDonations.map(d => {
      const dateObj = d.createdAt ? d.createdAt.toDate() : new Date();
      return [
        dateObj.toLocaleDateString("en-IN"),
        dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        d.razorpayPaymentId || d.id || "N/A",
        d.userName || "Unknown",
        d.userPhone || "N/A",
        d.panNumber || "N/A",
        `Rs. ${Number(d.amount).toLocaleString("en-IN")}`,
        (d.status || "paid").toUpperCase(),
      ];
    });

    autoTable(doc, {
      head: [["Date", "Time", "Transaction ID", "Citizen Name", "Phone", "PAN Number", "Amount", "Status"]],
      body: tableRows,
      startY: 87,
      margin: { left: 14, right: 14 },
      theme: "plain",
      headStyles: {
        fillColor: [10, 15, 30],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 20 },
        2: { cellWidth: 52, font: "courier", fontSize: 7 },
        3: { cellWidth: 36 },
        4: { cellWidth: 28 },
        5: { cellWidth: 28, font: "courier" },
        6: { cellWidth: 24, fontStyle: "bold" },
        7: { cellWidth: 22, halign: "center" },
      },
      styles: {
        fontSize: 8,
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
        textColor: [30, 35, 50],
        lineColor: [230, 234, 240],
        lineWidth: 0.3,
      },
      alternateRowStyles: { fillColor: [248, 250, 254] },
      // Status column — green badge feel via didDrawCell
      didDrawCell: (data: any) => {
        if (data.section === "body" && data.column.index === 7) {
          const { x, y, width, height } = data.cell;
          doc.setFillColor(220, 252, 231);
          doc.setDrawColor(134, 239, 172);
          doc.roundedRect(x + 2, y + 2, width - 4, height - 4, 2, 2, "FD");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(21, 128, 61);
          doc.text(
            String(data.cell.raw),
            x + width / 2,
            y + height / 2 + 2.5,
            { align: "center" }
          );
        }
      },
    });

    // ── FOOTER ───────────────────────────────────────────────────
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFillColor(10, 15, 30);
      doc.rect(0, pageH - 12, pageW, 12, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(160, 185, 220);
      doc.text("Democratic Social Alliance — Confidential Treasury Document", 14, pageH - 4.5);
      doc.text(`Page ${p} of ${totalPages}`, pageW - 14, pageH - 4.5, { align: "right" });
    }

    doc.save(`DSA_Treasury_Report_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" /></div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <IndianRupee className="w-6 h-6 text-[#007AFF]" /> Alliance Treasury
          </h1>
          <p className="text-sm text-gray-500 mt-1">Monitor ground funding, export ledgers, and track citizen contributions.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 shadow-sm flex items-center gap-2 transition-colors">
            <FileText className="w-4 h-4 text-green-600" /> Export CSV
          </button>
          <button onClick={exportPDF} className="px-4 py-2.5 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-black shadow-md flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4 text-red-400" /> Export PDF
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><IndianRupee className="w-24 h-24" /></div>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Total Funds Raised ({timeFilter})</p>
          <h3 className="text-3xl font-black text-gray-900">₹{totalRaised.toLocaleString()}</h3>
        </div>
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Users className="w-24 h-24" /></div>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Unique Donors ({timeFilter})</p>
          <h3 className="text-3xl font-black text-gray-900">{totalDonors} Citizens</h3>
        </div>
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp className="w-24 h-24" /></div>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Total Transactions ({timeFilter})</p>
          <h3 className="text-3xl font-black text-gray-900">{filteredDonations.length} TXNs</h3>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col sm:flex-row gap-4 bg-gray-50 border border-gray-200 p-4 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search by Citizen Name, Email, PAN, or TXN ID..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#007AFF] font-medium shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1.5 shrink-0 shadow-sm">
          <Filter className="w-4 h-4 text-gray-400 ml-2" />
          {["All", "Week", "Month", "Year"].map((filter) => (
            <button
              key={filter} onClick={() => setTimeFilter(filter)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeFilter === filter ? "bg-gray-900 text-white shadow" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] text-gray-500 uppercase tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4">Transaction Details</th>
                <th className="px-6 py-4">Citizen Profile</th>
                <th className="px-6 py-4">PAN Details</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDonations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-400 font-medium">
                    <HeartHandshake className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    No transactions found for the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredDonations.map((d) => (
                  <tr key={d.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 font-mono text-xs">{d.razorpayPaymentId || d.id}</p>
                      <p className="text-[10px] text-gray-500 font-semibold mt-1">
                        {d.createdAt ? new Date(d.createdAt.toDate()).toLocaleString() : "Processing"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{d.userName || "Unknown"}</p>
                      <p className="text-[10px] text-gray-500 font-semibold mt-1">{d.userEmail} | {d.userPhone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-700 font-mono text-xs">{d.panNumber || "N/A"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-black text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                        ₹{d.amount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-widest">
                        <CheckCircle2 className="w-3 h-3" /> {d.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}