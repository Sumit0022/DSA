"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, onSnapshot, doc, addDoc, deleteDoc, getDocs, updateDoc, getDoc, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { MapPin, Calendar as CalendarIcon, Users, Clock, Plus, Trash2, Download, FileText, X, AlertCircle, CheckCircle, Upload, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";
import { Scanner } from '@yudiel/react-qr-scanner';
import { toPng } from "html-to-image";
import EventPassCard from "@/components/EventPassCard";
import { QrCode, CheckCircle2, Scan } from "lucide-react";

export default function ManageEventsPage() {
  const { userData, loadingUser } = useUser();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    type: "Meeting",
    region: "National"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        if (docSnap.exists()) {
          setCloudConfig(docSnap.data() as any);
        }
      } catch (e) {
        console.error("Failed to fetch cloudinary config", e);
      }
    };
    fetchCloudConfig();
  }, []);

  useEffect(() => {
    if (!userData?.role) return;

    const q = query(collection(db, "events"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date()
      }));
      // Filter events by the leader
      const myEvents = eventsData.filter(e => e.organizerId === userData.id);
      myEvents.sort((a, b) => b.date.getTime() - a.date.getTime()); // Latest first
      setEvents(myEvents);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData]);

  useEffect(() => {
    if (userData) {
      setFormData(prev => ({ ...prev, region: userData.district || "National" }));
    }
  }, [userData]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    setIsSubmitting(true);

    try {
      const eventDateTime = new Date(`${formData.date}T${formData.time}`);
      await addDoc(collection(db, "events"), {
        title: formData.title,
        description: formData.description,
        date: eventDateTime,
        location: formData.location,
        type: formData.type,
        region: formData.region,
        organizerId: userData.id,
        rsvps: [],
        status: "Upcoming",
        createdAt: new Date()
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
          // Don't notify the creator
          if (userDoc.id === userData.id) return;

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
      setFormData({
        title: "",
        description: "",
        date: "",
        time: "",
        location: "",
        type: "Meeting",
        region: userData.district || "National"
      });
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      try {
        await deleteDoc(doc(db, "events", eventId));
      } catch (error) {
        console.error("Error deleting event:", error);
        toast.error("Failed to delete event.");
      }
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
          console.error("Cloudinary Error:", xhr.responseText);
          reject("Upload failed");
        }
      };

      xhr.onerror = () => reject("Network error during upload");
      xhr.send(fd);
    });
  };

  const openConcludeModal = (event: any) => {
    setSelectedConcludeEvent(event);
    setConcludeForm({
      actualAttendees: (event.rsvps?.length || 0) + (event.guestRsvps?.length || 0),
      summary: "",
      impact: ""
    });
    setNewMediaFiles([]);
    setIsConcludeModalOpen(true);
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (newMediaFiles.length + files.length > 20) {
      return toast.error("You can only upload up to 20 photos.");
    }

    const newFiles = files.map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));
    setNewMediaFiles(prev => [...prev, ...newFiles]);
  };

  const removeMedia = (index: number) => {
    setNewMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleConcludeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudConfig.cloudName || !cloudConfig.uploadPreset) {
      return toast.error("Cloudinary API details not configured. Please contact Admin.");
    }

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      let uploadedPhotoUrls: string[] = [];
      
      for (let i = 0; i < newMediaFiles.length; i++) {
        const item = newMediaFiles[i];
        const secureUrl = await uploadToCloudinary(item.file);
        uploadedPhotoUrls.push(secureUrl);
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

      toast.success("Event concluded and report submitted!");
      setIsConcludeModalOpen(false);
    } catch (error) {
      console.error("Error concluding event:", error);
      toast.error("Failed to conclude event.");
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const openRsvpModal = async (event: any) => {
    setSelectedEventRsvps(event);
    setLoadingRsvps(true);
    setIsScannerOpen(false);
    
    try {
      // Fetch all members (simplified approach for now)
      const q = query(collection(db, "members"));
      const snapshot = await getDocs(q);
      const allMembers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const rsvpMembers = allMembers.filter(m => event.rsvps?.includes(m.id));
      
      // Combine Members and Guests
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
      
      // Update local state to reflect change immediately
      setSelectedEventRsvps({ ...selectedEventRsvps, attended: newAttended });
    } catch (error) {
      console.error("Error toggling attendance", error);
      toast.error("Failed to update attendance.");
    }
  };

  const handleQRScan = async (result: any) => {
    if (!result || !result[0]) return;
    const qrText = result[0].rawValue;
    
    // Format: eventId::userId
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
      
      // Mark as attended
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
      `"${user.name || ''}","${user.phone || ''}","${user.district || ''}","Attending"`
    ).join("\n");
    
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `RSVP_${selectedEventRsvps.title.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    if (!rsvpUsers.length) return;
    
    const doc = new jsPDF();
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 122, 255);
    doc.text("DSA Event Attendance Report", 14, 22);
    
    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.text(`Event: ${selectedEventRsvps.title}`, 14, 32);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${selectedEventRsvps.date.toLocaleDateString('en-IN')}`, 14, 40);
    doc.text(`Location: ${selectedEventRsvps.location}`, 14, 46);
    doc.text(`Total Attending: ${rsvpUsers.length}`, 14, 52);

    const tableData = rsvpUsers.map((user, index) => [
      index + 1,
      user.name || 'N/A',
      user.phone || 'N/A',
      user.district || 'N/A',
      user.role || 'Citizen'
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

    doc.save(`Attendance_${selectedEventRsvps.title.replace(/\s+/g, '_')}.pdf`);
  };

  if (!loadingUser && !userData?.role) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-500 mt-2">This page is restricted to Leaders.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Manage Events</h1>
            <p className="text-gray-500 font-medium mt-1">Create and manage your regional events.</p>
          </div>
          
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-[#FF9500] hover:bg-[#E08300] text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-[#FF9500]/20 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            Create New Event
          </button>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="h-48 bg-gray-200 animate-pulse rounded-3xl" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarIcon className="w-8 h-8 text-[#FF9500]" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No Events Created</h3>
            <p className="text-gray-500 mt-2">You haven't created any events yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {events.map((event) => (
              <div key={event.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600 uppercase tracking-wider">
                      {event.type}
                    </span>
                    <span className="text-sm font-semibold text-[#007AFF] bg-[#007AFF]/10 px-3 py-1 rounded-full">
                      {event.region}
                    </span>
                    {event.status === "Completed" && (
                      <span className="text-sm font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Completed
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-600">
                    <div className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> {event.date.toLocaleDateString()}</div>
                    <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {event.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {event.location}</div>
                  </div>
                </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {event.status !== "Completed" && (
                      <button
                        onClick={() => openConcludeModal(event)}
                        className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 px-5 py-2.5 rounded-xl font-bold transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Conclude Event
                      </button>
                    )}
                    <button
                      onClick={() => openRsvpModal(event)}
                      className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2.5 rounded-xl font-bold transition-colors"
                    >
                      <Users className="w-4 h-4" />
                      Joined ({(event.rsvps?.length || 0) + (event.guestRsvps?.length || 0)})
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsCreateModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90dvh]"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-gray-900">Schedule New Event</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <form id="eventForm" onSubmit={handleCreateEvent} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Event Title</label>
                    <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF9500] focus:border-[#FF9500] outline-none" placeholder="e.g., Ward 4 Cleanliness Drive" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Date</label>
                      <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Time</label>
                      <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Location</label>
                    <input required type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Full address or Google Maps link" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Type</label>
                      <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                        <option value="Meeting">Meeting</option>
                        <option value="Campaign">Campaign</option>
                        <option value="Protest">Protest</option>
                        <option value="Social">Social Gathering</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Region Visibility</label>
                      <select required value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                        <option value={userData?.district || "Local"}>My Region ({userData?.district})</option>
                        <option value="National">National (All Members)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Description</label>
                    <textarea required rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none resize-none" placeholder="What is this event about?" />
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 font-bold text-gray-600 hover:text-gray-900">Cancel</button>
                <button form="eventForm" type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#FF9500] hover:bg-[#E08300] text-white rounded-xl font-bold disabled:opacity-50 transition-colors">
                  {isSubmitting ? "Creating..." : "Publish Event"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RSVP Modal */}
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
                    <p className="text-gray-500 font-medium">No one has RSVP'd yet.</p>
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

      {/* Conclude Event Modal */}
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
                  <h3 className="text-xl font-black text-gray-900 leading-tight">Submit Event Report</h3>
                  <p className="text-sm font-medium text-gray-500 mt-1">{selectedConcludeEvent.title}</p>
                </div>
                <button disabled={isProcessing} onClick={() => setIsConcludeModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors bg-white shadow-sm border border-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <form id="concludeForm" onSubmit={handleConcludeSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Actual Attendees</label>
                    <input type="number" min="0" required value={concludeForm.actualAttendees} onChange={e => setConcludeForm({...concludeForm, actualAttendees: parseInt(e.target.value) || 0})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500" />
                    <p className="text-xs text-gray-500 mt-1">Pre-filled with joined count, but you can update it if more people showed up.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Event Summary</label>
                    <textarea required rows={3} value={concludeForm.summary} onChange={e => setConcludeForm({...concludeForm, summary: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none resize-none focus:border-blue-500" placeholder="Briefly describe what happened during the event..." />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Key Impact / Outcome</label>
                    <textarea required rows={2} value={concludeForm.impact} onChange={e => setConcludeForm({...concludeForm, impact: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none resize-none focus:border-blue-500" placeholder="e.g., Planted 100 trees, collected 50 bags of trash..." />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-gray-700">Upload Photos (Max 20)</label>
                      <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{newMediaFiles.length} / 20</span>
                    </div>
                    <div className="relative border-2 border-dashed border-gray-300 rounded-2xl p-6 hover:bg-gray-50 transition-colors text-center">
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        onChange={handleMediaUpload} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={newMediaFiles.length >= 20 || isProcessing}
                      />
                      <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                          <Upload className="w-6 h-6 text-blue-500" />
                        </div>
                        <p className="text-sm font-bold text-gray-700">Click or drag images to upload</p>
                        <p className="text-xs text-gray-500">JPG, PNG, WebP allowed</p>
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
                <button form="concludeForm" type="submit" disabled={isProcessing} className="relative px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold disabled:opacity-50 transition-colors shadow-lg shadow-green-600/20 overflow-hidden">
                  {isProcessing ? (
                    <div className="flex items-center gap-2 z-10 relative">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading ({uploadProgress}%)
                    </div>
                  ) : "Submit Report"}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-white/20 transition-all duration-300 z-0" style={{ width: `${uploadProgress}%` }} />
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden Pass Renderer for Admin/Leader Download */}
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
