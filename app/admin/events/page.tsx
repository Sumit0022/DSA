"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, onSnapshot, doc, addDoc, deleteDoc, updateDoc, getDoc, getDocs, where, writeBatch, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/hooks/useUser";
import { MapPin, Calendar as CalendarIcon, Users, Clock, Trash2, ShieldAlert, Eye, UserCircle, Briefcase, Download, FileText, X, CheckCircle, Upload, QrCode, CheckCircle2, Scan } from "lucide-react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Scanner } from '@yudiel/react-qr-scanner';
import { toPng } from "html-to-image";
import EventPassCard from "@/components/EventPassCard";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const { userData } = useUser();

  // Create Event State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "", description: "", type: "Campaign", region: "National",
    date: "", time: "", location: ""
  });

  // Inspect Event State
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [organizerDetails, setOrganizerDetails] = useState<any>(null);
  const [loadingOrganizer, setLoadingOrganizer] = useState(false);

  const [selectedEventRsvps, setSelectedEventRsvps] = useState<any>(null);
  const [rsvpUsers, setRsvpUsers] = useState<any[]>([]);
  const [loadingRsvps, setLoadingRsvps] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Admin Pass Download/View State
  const [downloadingPassId, setDownloadingPassId] = useState<string | null>(null);
  const [passData, setPassData] = useState<any>(null);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const passRef = useRef<HTMLDivElement>(null);

  // Conclude Event State
  const [cloudConfig, setCloudConfig] = useState({ cloudName: "", uploadPreset: "" });
  const [isConcludeModalOpen, setIsConcludeModalOpen] = useState(false);
  const [selectedConcludeEvent, setSelectedConcludeEvent] = useState<any>(null);
  const [concludeForm, setConcludeForm] = useState({ actualAttendees: 0, summary: "", impact: "" });
  const [newMediaFiles, setNewMediaFiles] = useState<{file: File, url: string}[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const fetchCloudConfig = async () => {
      try {
        const docSnap = await getDoc(doc(db, "settings", "cloudinary"));
        if (docSnap.exists()) setCloudConfig(docSnap.data() as any);
      } catch (e) {
        console.error("Failed to fetch cloudinary config", e);
      }
    };
    fetchCloudConfig();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dateObj: doc.data().date?.toDate() || new Date()
      }));
      setEvents(eventsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm("🚨 WARNING: Are you sure you want to permanently delete this event? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "events", eventId));
      } catch (error) {
        console.error("Error deleting event:", error);
        toast.error("Failed to delete event.");
      }
    }
  };

  const openInspectModal = async (event: any) => {
    setSelectedEvent(event);
    setIsInspectModalOpen(true);
    setOrganizerDetails(null);
    
    if (event.organizerId && event.organizerId !== "Admin") {
      setLoadingOrganizer(true);
      try {
        const userDoc = await getDoc(doc(db, "members", event.organizerId));
        if (userDoc.exists()) {
          setOrganizerDetails(userDoc.data());
        } else {
          setOrganizerDetails({ name: "Unknown User", role: "N/A" });
        }
      } catch (err) {
        console.error("Failed to fetch organizer", err);
      } finally {
        setLoadingOrganizer(false);
      }
    } else if (event.organizerId === "Admin") {
      setOrganizerDetails({ name: "System Admin", role: "Administrator" });
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const eventDateTime = new Date(`${formData.date}T${formData.time}`);
      await addDoc(collection(db, "events"), {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        region: formData.region,
        location: formData.location,
        date: eventDateTime,
        createdAt: new Date(),
        organizerId: userData?.id || "Admin",
        rsvps: [],
        guestRsvps: []
      });

      // --- SEND NOTIFICATIONS ---
      try {
        const usersRef = collection(db, "users");
        const userQuery = formData.region === "National" 
          ? query(usersRef) 
          : query(usersRef, where("district", "==", formData.region));
          
        const userSnapshot = await getDocs(userQuery);
        
        const batches = [];
        let currentBatch = writeBatch(db);
        let opCount = 0;

        userSnapshot.forEach(userDoc => {
          // Don't notify the admin themselves if they are the ones testing
          if (userDoc.id === userData?.id) return;

          const notifRef = doc(collection(db, "notifications"));
          currentBatch.set(notifRef, {
            userId: userDoc.id,
            title: `New Event: ${formData.title}`,
            message: `A new ${formData.type} is happening in ${formData.region === 'National' ? 'your area' : formData.region} on ${eventDateTime.toLocaleDateString('en-IN')}. Check it out!`,
            type: "info",
            isRead: false,
            timestamp: new Date(),
            link: "/events"
          });
          opCount++;
          
          if (opCount >= 490) {
            batches.push(currentBatch.commit());
            currentBatch = writeBatch(db);
            opCount = 0;
          }
        });
        
        if (opCount > 0) batches.push(currentBatch.commit());
        await Promise.all(batches);
      } catch (notifErr) {
        console.error("Failed to send notifications:", notifErr);
      }
      // --------------------------

      toast.success("Event created successfully!");
      setIsCreateModalOpen(false);
      setFormData({ title: "", description: "", type: "Campaign", region: "National", date: "", time: "", location: "" });
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadToCloudinary = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const url = `https://api.cloudinary.com/v1_1/${cloudConfig.cloudName}/auto/upload`;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", cloudConfig.uploadPreset);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const prog = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(prog));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.secure_url);
        } else {
          reject("Upload failed");
        }
      };

      xhr.onerror = () => reject("Network error");
      xhr.send(fd);
    });
  };

  const openConcludeModal = (event: any) => {
    setSelectedConcludeEvent(event);
    if (event.status === "Completed" && event.report) {
      setConcludeForm({
        actualAttendees: event.report.actualAttendees || 0,
        summary: event.report.summary || "",
        impact: event.report.impact || ""
      });
    } else {
      setConcludeForm({
        actualAttendees: (event.rsvps?.length || 0) + (event.guestRsvps?.length || 0),
        summary: "",
        impact: ""
      });
    }
    setNewMediaFiles([]);
    setIsConcludeModalOpen(true);
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (newMediaFiles.length + files.length > 20) {
      return toast.error("You can only upload up to 20 photos.");
    }
    const newFiles = files.map(file => ({ file, url: URL.createObjectURL(file) }));
    setNewMediaFiles(prev => [...prev, ...newFiles]);
  };

  const removeMedia = (index: number) => {
    setNewMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleConcludeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudConfig.cloudName || !cloudConfig.uploadPreset) {
      return toast.error("Cloudinary API details not configured. Please check Settings.");
    }

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      let uploadedPhotoUrls: string[] = selectedConcludeEvent?.report?.photos || [];
      
      if (newMediaFiles.length > 0) {
        uploadedPhotoUrls = [];
        for (let i = 0; i < newMediaFiles.length; i++) {
          const secureUrl = await uploadToCloudinary(newMediaFiles[i].file);
          uploadedPhotoUrls.push(secureUrl);
        }
      }

      const reportData = {
        actualAttendees: concludeForm.actualAttendees,
        summary: concludeForm.summary,
        impact: concludeForm.impact,
        photos: uploadedPhotoUrls,
        submittedAt: new Date()
      };

      await updateDoc(doc(db, "events", selectedConcludeEvent.id), {
        status: "Completed",
        report: reportData
      });

      toast.success(selectedConcludeEvent.status === "Completed" ? "Event report updated!" : "Event concluded and report submitted!");
      setIsConcludeModalOpen(false);
    } catch (error) {
      console.error("Error concluding event:", error);
      toast.error("Failed to save report.");
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const exportGlobalGuestLeads = async () => {
    try {
      const q = query(collection(db, "guests"));
      const snapshot = await getDocs(q);
      const allGuests = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (!allGuests.length) {
        toast.error("No guest leads found in the database yet.");
        return;
      }

      const headers = "Name,Phone,Source,Date Added\n";
      const csvContent = allGuests.map((g: any) => 
        `"${g.name || ''}","${g.phone || ''}","${g.source || 'Event Join'}","${g.createdAt?.toDate?.()?.toLocaleDateString() || ''}"`
      ).join("\n");
      
      const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Global_Guest_Leads.csv`;
      link.click();
    } catch (error) {
      console.error("Error exporting leads:", error);
      toast.error("Failed to export leads.");
    }
  };

  const openRsvpModal = async (event: any) => {
    setSelectedEventRsvps(event);
    setLoadingRsvps(true);
    setIsScannerOpen(false);
    
    try {
      const q = query(collection(db, "members"));
      const snapshot = await getDocs(q);
      const allMembers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const rsvpMembers = allMembers.filter(m => event.rsvps?.includes(m.id));
      
      const guests = (event.guestRsvps || []).map((g: any, index: number) => ({
        id: g.phone || `guest_${index}`,
        name: g.name,
        phone: g.phone,
        district: "Guest/External",
        role: "Non-Member",
        isGuest: true
      }));

      setRsvpUsers([...rsvpMembers, ...guests]);
    } catch (error) {
      console.error("Error fetching RSVPs:", error);
    } finally {
      setLoadingRsvps(false);
    }
  };

  const handleToggleAttendance = async (userId: string) => {
    if (!selectedEventRsvps) return;
    
    const attendedArray = selectedEventRsvps.attended || [];
    const hasAttended = attendedArray.includes(userId);
    
    try {
      const eventRef = doc(db, "events", selectedEventRsvps.id);
      
      let newAttended;
      if (hasAttended) {
        newAttended = attendedArray.filter((id: string) => id !== userId);
        toast.success("Attendance removed.");
      } else {
        newAttended = [...attendedArray, userId];
        toast.success("Attendance marked!");
      }
      
      await updateDoc(eventRef, { attended: newAttended });
      
      setSelectedEventRsvps({ ...selectedEventRsvps, attended: newAttended });
    } catch (error) {
      console.error("Error toggling attendance", error);
      toast.error("Failed to update attendance.");
    }
  };

  const handleQRScan = async (result: any) => {
    if (!result || !result[0]) return;
    const qrText = result[0].rawValue;
    const parts = qrText.split("::");
    if (parts.length === 2) {
      const [qrEventId, qrUserId] = parts;
      if (qrEventId !== selectedEventRsvps.id) {
        toast.error("Invalid Pass: This pass is for a different event!");
        return;
      }
      const attendedArray = selectedEventRsvps.attended || [];
      if (attendedArray.includes(qrUserId)) {
        toast.error("User already marked as attended!");
        return;
      }
      await handleToggleAttendance(qrUserId);
    } else {
      toast.error("Invalid QR Code format.");
    }
  };

  const handleAdminDownloadPass = async (userName: string) => {
    setDownloadingPassId(userName);
    
    setTimeout(async () => {
      if (passRef.current) {
        try {
          const dataUrl = await toPng(passRef.current, { cacheBust: true, pixelRatio: 3 });
          const link = document.createElement('a');
          link.download = `Pass-${userName.replace(/\s+/g, '-')}.png`;
          link.href = dataUrl;
          link.click();
          toast.success("Pass downloaded!");
        } catch (err) {
          console.error("Failed to download pass", err);
          toast.error("Failed to generate pass.");
        } finally {
          setDownloadingPassId(null);
        }
      }
    }, 100);
  };

  const openPassModal = (user: any) => {
    setPassData({
      event: selectedEventRsvps,
      user: user
    });
    setIsPassModalOpen(true);
  };

  const exportCSV = () => {
    if (!rsvpUsers.length) return;
    const headers = "Name,Phone,District,Status\n";
    const csvContent = rsvpUsers.map(user => 
      `"${user.name || ''}","${user.phone || ''}","${user.district || ''}","Joined"`
    ).join("\n");
    
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Joined_${selectedEventRsvps.title.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    if (!rsvpUsers.length) return;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 122, 255);
    doc.text("DSA Event Attendance Report", 14, 22);
    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.text(`Event: ${selectedEventRsvps.title}`, 14, 32);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${selectedEventRsvps.dateObj.toLocaleDateString('en-IN')}`, 14, 40);
    doc.text(`Location: ${selectedEventRsvps.location}`, 14, 46);
    doc.text(`Total Joined: ${rsvpUsers.length}`, 14, 52);
    const tableData = rsvpUsers.map((user, index) => [
      index + 1, user.name || 'N/A', user.phone || 'N/A', user.district || 'N/A', user.role || 'Citizen'
    ]);
    autoTable(doc, {
      startY: 60,
      head: [['#', 'Name', 'Phone', 'District', 'Role']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 122, 255], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 },
      alternateRowStyles: { fillColor: [245, 248, 255] }
    });
    doc.save(`Joined_${selectedEventRsvps.title.replace(/\s+/g, '_')}.pdf`);
  };

  const filteredEvents = events.filter(e => filter === "All" || e.region === filter);
  const regions = ["All", ...Array.from(new Set(events.map(e => e.region)))];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Master Events Tracker</h1>
            <p className="text-gray-500 font-medium mt-1">Monitor and manage all events across regions.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
              <span className="text-sm font-bold text-gray-600">Total Events:</span>
              <span className="bg-[#007AFF]/10 text-[#007AFF] px-3 py-1 rounded-full font-black">{events.length}</span>
            </div>
            <button
              onClick={exportGlobalGuestLeads}
              className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-gray-900/20 transition-all hover:-translate-y-0.5"
            >
              Export All Leads
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#007AFF] hover:bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5"
            >
              + Create Event
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-8">
          {regions.map((r: any) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === r 
                  ? "bg-gray-900 text-white shadow-md" 
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {r === "All" ? "All Regions" : r}
            </button>
          ))}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
            <ShieldAlert className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900">No Events Found</h3>
            <p className="text-gray-500 mt-2">There are no events matching the selected region.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence>
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                        event.type === 'Campaign' ? 'bg-orange-100 text-orange-700' :
                        event.type === 'Protest' ? 'bg-red-100 text-red-700' :
                        event.type === 'Meeting' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {event.type}
                      </span>
                      <span className="text-xs font-bold text-gray-500 border border-gray-200 px-2 py-0.5 rounded-md">
                        {event.region}
                      </span>
                      {event.dateObj < new Date() && event.status !== "Completed" && (
                         <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                           Past Event
                         </span>
                      )}
                      {event.status === "Completed" && (
                        <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Completed
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{event.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-1 mb-3">{event.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-gray-600">
                      <div className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> {event.dateObj.toLocaleDateString()}</div>
                      <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {event.dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {event.location}</div>
                      <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        <Users className="w-3.5 h-3.5" /> {event.rsvps?.length || 0} Joined
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pt-4 lg:pt-0 lg:border-l lg:border-gray-100 lg:pl-6 flex flex-wrap items-center justify-end gap-3">
                    <button
                      onClick={() => openConcludeModal(event)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
                        event.status === "Completed" 
                          ? "bg-amber-50 hover:bg-amber-100 text-amber-600" 
                          : "bg-green-50 hover:bg-green-100 text-green-600"
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {event.status === "Completed" ? "Edit Report" : "Conclude"}
                    </button>
                    <button
                      onClick={() => openRsvpModal(event)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-xl font-bold text-sm transition-colors"
                    >
                      <Users className="w-4 h-4" />
                      Joined ({(event.rsvps?.length || 0) + (event.guestRsvps?.length || 0)})
                    </button>
                    <button
                      onClick={() => openInspectModal(event)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold text-sm transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Inspect
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative z-10 max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-black text-gray-900">Schedule New Event</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-900">✕</button>
              </div>
              <form onSubmit={handleCreateEvent} className="p-6 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Event Title</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border rounded-xl" placeholder="E.g., Nationwide Protest for Healthcare" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Event Type</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border rounded-xl">
                      <option>Campaign</option>
                      <option>Protest</option>
                      <option>Meeting</option>
                      <option>Volunteer Drive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Region</label>
                    <input required type="text" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border rounded-xl" placeholder="E.g., National or Bareilly" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                    <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Time</label>
                    <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border rounded-xl" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                  <input required type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border rounded-xl" placeholder="Full address or meeting link" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                  <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full px-4 py-3 bg-gray-50 border rounded-xl" placeholder="What is this event about?" />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-[#007AFF] text-white font-bold rounded-xl hover:bg-blue-600 disabled:opacity-50">
                    {isSubmitting ? "Publishing..." : "Publish Event"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isInspectModalOpen && selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsInspectModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative z-10 max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Eye className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 leading-tight">Event Details</h3>
                </div>
                <button onClick={() => setIsInspectModalOpen(false)} className="text-gray-400 hover:text-gray-900 bg-white p-2 rounded-full border border-gray-100 shadow-sm transition-all hover:scale-105">✕</button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 mb-2">{selectedEvent.title}</h2>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-gray-100 rounded-md text-xs font-bold text-gray-600 uppercase tracking-widest">{selectedEvent.type}</span>
                    <span className="px-3 py-1 border border-gray-200 rounded-md text-xs font-bold text-gray-500">{selectedEvent.region}</span>
                    {selectedEvent.status === "Completed" && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Completed
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                      <CalendarIcon className="w-4 h-4" /> Date & Time
                    </div>
                    <p className="font-bold text-gray-900">{selectedEvent.dateObj.toLocaleDateString()}</p>
                    <p className="text-sm text-gray-600">{selectedEvent.dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                      <MapPin className="w-4 h-4" /> Location
                    </div>
                    <p className="font-bold text-gray-900 line-clamp-2">{selectedEvent.location}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 col-span-2 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                        <Users className="w-4 h-4" /> Total Engagement
                      </div>
                      <p className="font-bold text-gray-900">{selectedEvent.rsvps?.length || 0} Registered Members</p>
                      <p className="text-sm text-gray-600">{selectedEvent.guestRsvps?.length || 0} Guest Leads</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Created On</p>
                      <p className="text-sm font-semibold text-gray-700">{selectedEvent.createdAt?.toDate?.().toLocaleDateString() || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {selectedEvent.status === "Completed" && selectedEvent.report && (
                  <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 space-y-6">
                    <div className="flex items-center gap-3 border-b border-blue-200/50 pb-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-gray-900 leading-tight">Impact Report</h4>
                        <p className="text-sm font-medium text-blue-600">Event successfully concluded</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div className="bg-white p-5 rounded-2xl border border-blue-100/50 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center shrink-0">
                          <Users className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-0.5">Actual Attendees</p>
                          <p className="text-2xl font-black text-gray-900">{selectedEvent.report.actualAttendees || 0}</p>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-gray-400" /> Event Summary
                        </h5>
                        <p className="text-gray-600 text-sm leading-relaxed bg-white p-4 rounded-xl border border-blue-100/50">
                          {selectedEvent.report.summary}
                        </p>
                      </div>

                      <div>
                        <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" /> Key Impact & Outcome
                        </h5>
                        <p className="text-gray-700 font-medium text-sm leading-relaxed bg-green-50 p-4 rounded-xl border border-green-200/50">
                          {selectedEvent.report.impact}
                        </p>
                      </div>

                      {selectedEvent.report.photos && selectedEvent.report.photos.length > 0 && (
                        <div>
                          <h5 className="font-bold text-gray-900 mb-3">Event Gallery ({selectedEvent.report.photos.length})</h5>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {selectedEvent.report.photos.map((url: string, idx: number) => (
                              <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-[1.02]">
                                <img src={url} alt={`Event Photo ${idx + 1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Organizer Information</h4>
                  {loadingOrganizer ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse" />
                      <div className="space-y-2">
                        <div className="w-32 h-4 bg-gray-100 rounded animate-pulse" />
                        <div className="w-24 h-3 bg-gray-100 rounded animate-pulse" />
                      </div>
                    </div>
                  ) : organizerDetails ? (
                    <div className="flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
                      <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg shadow-sm">
                        {organizerDetails.name ? organizerDetails.name.charAt(0) : <UserCircle />}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-lg leading-tight">{organizerDetails.name || "Unknown Organizer"}</p>
                        <div className="flex items-center gap-2 text-blue-600 mt-1">
                          <Briefcase className="w-3.5 h-3.5" />
                          <p className="text-sm font-bold">{organizerDetails.role || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Organizer details not found.</p>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEventRsvps && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedEventRsvps(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90dvh]"
            >
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 leading-tight">{selectedEventRsvps.title}</h3>
                  <p className="text-sm font-medium text-gray-500 mt-1">
                    {(selectedEventRsvps.rsvps?.length || 0) + (selectedEventRsvps.guestRsvps?.length || 0)} Total Attending • {selectedEventRsvps.attended?.length || 0} Checked In
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsScannerOpen(!isScannerOpen)} className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${isScannerOpen ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'}`}>
                    <Scan className="w-4 h-4" /> {isScannerOpen ? "Close Scanner" : "Scan Pass"}
                  </button>
                  <button onClick={() => {setSelectedEventRsvps(null); setIsScannerOpen(false);}} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors bg-white shadow-sm border border-gray-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {isScannerOpen && (
                  <div className="mb-6 bg-black rounded-2xl overflow-hidden relative shadow-inner">
                    <div className="p-4 bg-gray-900 text-white text-center text-sm font-bold">
                      Point camera at the Attendee's QR Code Pass
                    </div>
                    <Scanner 
                      onScan={handleQRScan}
                      components={{ finder: false }}
                    />
                  </div>
                )}
                
                {loadingRsvps ? (
                  <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
                ) : rsvpUsers.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-gray-500 font-medium">No one has joined yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rsvpUsers.map(user => {
                      const hasAttended = selectedEventRsvps.attended?.includes(user.id);
                      return (
                        <div key={user.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-2xl gap-4 ${user.isGuest ? 'bg-orange-50/50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 border rounded-full flex items-center justify-center font-bold shadow-sm ${user.isGuest ? 'bg-orange-100 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-blue-600'}`}>
                              {user.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-900">{user.name}</p>
                                {user.isGuest && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-black uppercase rounded">Guest</span>}
                              </div>
                              <p className="text-xs font-semibold text-gray-500">{user.phone}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                            <button
                              onClick={() => openPassModal(user)}
                              className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm"
                            >
                              <QrCode className="w-3.5 h-3.5" /> View Pass
                            </button>
                            
                            <button
                              onClick={() => handleToggleAttendance(user.id)}
                              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold transition-all border ${
                                hasAttended 
                                  ? "bg-green-500 text-white border-green-600 shadow-inner" 
                                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              {hasAttended ? "Attended" : "Mark Attended"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 shrink-0 flex items-center justify-between bg-white">
                <button onClick={() => setSelectedEventRsvps(null)} className="px-5 py-2.5 font-bold text-gray-500 hover:text-gray-800">Close</button>
                <div className="flex items-center gap-3">
                  <button onClick={exportCSV} disabled={!rsvpUsers.length} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold disabled:opacity-50 transition-colors">
                    <Download className="w-4 h-4" /> CSV
                  </button>
                  <button onClick={exportPDF} disabled={!rsvpUsers.length} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50 transition-colors shadow-lg shadow-blue-600/20">
                    <FileText className="w-4 h-4" /> Export PDF
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isConcludeModalOpen && selectedConcludeEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isProcessing && setIsConcludeModalOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90dvh]"
            >
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
                <div>
                  <h3 className="text-xl font-black text-gray-900 leading-tight">
                    {selectedConcludeEvent.status === "Completed" ? "Edit Event Report (Admin Override)" : "Submit Event Report"}
                  </h3>
                  <p className="text-sm font-medium text-gray-500 mt-1">{selectedConcludeEvent.title}</p>
                </div>
                <button disabled={isProcessing} onClick={() => setIsConcludeModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors bg-white shadow-sm border border-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <form id="adminConcludeForm" onSubmit={handleConcludeSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Actual Attendees</label>
                    <input type="number" min="0" required value={concludeForm.actualAttendees} onChange={e => setConcludeForm({...concludeForm, actualAttendees: parseInt(e.target.value) || 0})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Event Summary</label>
                    <textarea required rows={3} value={concludeForm.summary} onChange={e => setConcludeForm({...concludeForm, summary: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none resize-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Key Impact / Outcome</label>
                    <textarea required rows={2} value={concludeForm.impact} onChange={e => setConcludeForm({...concludeForm, impact: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none resize-none focus:border-blue-500" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-gray-700">Photos (Max 20)</label>
                      <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{newMediaFiles.length} / 20</span>
                    </div>
                    {selectedConcludeEvent.status === "Completed" && newMediaFiles.length === 0 && selectedConcludeEvent.report?.photos?.length > 0 && (
                      <div className="mb-4 p-3 bg-amber-50 text-amber-700 rounded-xl text-sm font-medium border border-amber-200">
                        This event already has {selectedConcludeEvent.report.photos.length} photos. If you upload new photos here, they will <b>replace</b> the existing photos.
                      </div>
                    )}
                    <div className="relative border-2 border-dashed border-gray-300 rounded-2xl p-6 hover:bg-gray-50 transition-colors text-center">
                      <input 
                        type="file" accept="image/*" multiple onChange={handleMediaUpload} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={newMediaFiles.length >= 20 || isProcessing}
                      />
                      <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                          <Upload className="w-6 h-6 text-blue-500" />
                        </div>
                        <p className="text-sm font-bold text-gray-700">Click or drag images to upload</p>
                      </div>
                    </div>
                    
                    {newMediaFiles.length > 0 && (
                      <div className="grid grid-cols-4 gap-3 mt-4">
                        {newMediaFiles.map((media, index) => (
                          <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200">
                            <img src={media.url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeMedia(index)} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-gray-100 shrink-0 flex items-center justify-between bg-gray-50">
                <button type="button" disabled={isProcessing} onClick={() => setIsConcludeModalOpen(false)} className="px-5 py-2.5 font-bold text-gray-600 hover:text-gray-900">Cancel</button>
                <button form="adminConcludeForm" type="submit" disabled={isProcessing} className="relative px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold disabled:opacity-50 transition-colors shadow-lg shadow-green-600/20 overflow-hidden">
                  {isProcessing ? (
                    <div className="flex items-center gap-2 z-10 relative">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving ({uploadProgress}%)
                    </div>
                  ) : "Save Report"}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-white/20 transition-all duration-300 z-0" style={{ width: `${uploadProgress}%` }} />
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        {passData && (
          <div ref={passRef}>
            <EventPassCard
              event={{
                id: passData.event.id,
                title: passData.event.title,
                dateObj: passData.event.date,
                location: passData.event.location
              }}
              attendee={{
                name: passData.user.name,
                role: passData.user.role,
                id: passData.user.id
              }}
              qrData={`${passData.event.id}::${passData.user.id}`}
            />
          </div>
        )}
      </div>

      {/* 3D FLOATING PASS MODAL */}
      <AnimatePresence>
        {isPassModalOpen && passData && (
          <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden">
            <div className="flex min-h-full items-center justify-center p-4 py-12">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setIsPassModalOpen(false)}
              />
              
              <div className="relative z-10 w-full max-w-[340px] mx-auto flex flex-col items-center" style={{ perspective: "1000px" }}>
                <motion.div
                  initial={{ opacity: 0, y: 50, rotateX: 20, scale: 0.8 }}
                  animate={{ opacity: 1, rotateX: 0, scale: 1, y: [0, -8, 0] }}
                  transition={{
                    duration: 0.6, type: "spring", bounce: 0.4,
                    y: { repeat: Infinity, duration: 4, ease: "easeInOut" }
                  }}
                  className="w-full flex justify-center"
                >
                  <div className="transform scale-95 sm:scale-100 origin-center">
                    <EventPassCard
                      event={{
                        id: passData.event.id,
                        title: passData.event.title,
                        dateObj: passData.event.date,
                        location: passData.event.location
                      }}
                      attendee={{
                        name: passData.user.name,
                        role: passData.user.role,
                        id: passData.user.id
                      }}
                      qrData={`${passData.event.id}::${passData.user.id}`}
                    />
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="mt-8 flex flex-col items-center gap-4"
                >
                  <button
                    onClick={() => handleAdminDownloadPass(passData.user.name)}
                    disabled={downloadingPassId === passData.user.name}
                    className="flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-[#007AFF] rounded-full font-black shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-all w-full sm:w-auto"
                  >
                    {downloadingPassId === passData.user.name ? "Preparing Pass..." : <><Download className="w-5 h-5" /> Save Pass</>}
                  </button>
                  <button onClick={() => setIsPassModalOpen(false)} className="text-white/70 text-sm font-bold tracking-widest uppercase hover:text-white transition-colors py-2">
                    Close View
                  </button>
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
