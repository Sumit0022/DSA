"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { INDIA_LOCATIONS } from "@/lib/locations";
import { MapPin, Calendar as CalendarIcon, Users, Clock, CheckCircle2, AlertCircle, Download, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { toPng } from "html-to-image";
import EventPassCard from "@/components/EventPassCard";

export default function EventsPage() {
  const { userData, loadingUser } = useUser();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"National" | "My Region" | "Attending">("National");
  const [guestDistrict, setGuestDistrict] = useState<string | null>(null);

  // LOCATION MODAL STATE
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  // GUEST RSVP STATE
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [guestForm, setGuestForm] = useState({ name: "", phone: "" });
  const [isSubmittingGuest, setIsSubmittingGuest] = useState(false);
  const [guestJoinedEvents, setGuestJoinedEvents] = useState<string[]>([]);
  const [guestData, setGuestData] = useState<{name: string, phone: string} | null>(null);

  // Pass Download/View State
  const [downloadingPassId, setDownloadingPassId] = useState<string | null>(null);
  const [passEventData, setPassEventData] = useState<any>(null);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const passRef = useRef<HTMLDivElement>(null);

  // INSPECT MODAL STATE
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [selectedInspectEvent, setSelectedInspectEvent] = useState<any>(null);

  useEffect(() => {
    // Load guest events from local storage on mount
    const stored = localStorage.getItem("dsa_guest_events");
    const storedData = localStorage.getItem("dsa_guest_data");
    if (stored) {
      try {
        setGuestJoinedEvents(JSON.parse(stored));
      } catch (e) {}
    }
    if (storedData) {
      try {
        setGuestData(JSON.parse(storedData));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const q = query(collection(db, "events"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date()
      }));
      // Sort by date upcoming
      eventsData.sort((a, b) => a.date.getTime() - b.date.getTime());
      setEvents(eventsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRSVP = async (eventId: string, isAttending: boolean) => {
    if (!userData) {
      // Open Guest Modal for Non-Members
      setSelectedEventId(eventId);
      setIsGuestModalOpen(true);
      return;
    }
    
    const eventRef = doc(db, "events", eventId);
    try {
      if (isAttending) {
        await updateDoc(eventRef, {
          rsvps: arrayRemove(userData.id)
        });
      } else {
        await updateDoc(eventRef, {
          rsvps: arrayUnion(userData.id)
        });
      }
    } catch (error) {
      console.error("Error updating RSVP:", error);
      toast.error("Failed to update join status. Please try again.");
    }
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !guestForm.name || !guestForm.phone) return;
    
    setIsSubmittingGuest(true);
    try {
      const eventRef = doc(db, "events", selectedEventId);
      const guestInfo = { 
        name: guestForm.name, 
        phone: guestForm.phone,
        rsvpDate: new Date().toISOString()
      };

      await updateDoc(eventRef, {
        guestRsvps: arrayUnion(guestInfo)
      });

      await addDoc(collection(db, "guests"), {
        name: guestForm.name,
        phone: guestForm.phone,
        eventId: selectedEventId,
        source: "Event RSVP",
        createdAt: serverTimestamp()
      });

      toast.success("Thank you! Your join request is confirmed.");
      setIsGuestModalOpen(false);
      setGuestForm({ name: "", phone: "" });
      
      const newJoined = [...guestJoinedEvents, selectedEventId];
      setGuestJoinedEvents(newJoined);
      localStorage.setItem("dsa_guest_events", JSON.stringify(newJoined));
      localStorage.setItem("dsa_guest_data", JSON.stringify(guestInfo));
      setGuestData(guestInfo);
    } catch (error) {
      console.error("Error submitting guest RSVP:", error);
      toast.error("Failed to join. Please try again.");
    } finally {
      setIsSubmittingGuest(false);
    }
  };

  const handleDownloadPass = async (eventTitle: string) => {
    setDownloadingPassId(eventTitle);
    
    // Wait a tick for safety
    setTimeout(async () => {
      if (passRef.current) {
        try {
          const dataUrl = await toPng(passRef.current, { cacheBust: true, pixelRatio: 3 });
          const link = document.createElement('a');
          link.download = `DSA-Pass-${eventTitle.replace(/\s+/g, '-')}.png`;
          link.href = dataUrl;
          link.click();
          toast.success("Entry pass downloaded!");
        } catch (err) {
          console.error("Failed to download pass", err);
          toast.error("Failed to generate pass.");
        } finally {
          setDownloadingPassId(null);
        }
      }
    }, 100);
  };

  const openPassModal = (event: any) => {
    setPassEventData(event);
    setIsPassModalOpen(true);
  };

  const filteredEvents = events.filter(event => {
    if (filter === "National") return event.region === "National";
    if (filter === "My Region") {
      if (userData) return event.region === userData.district;
      if (guestDistrict) return event.region.toLowerCase() === guestDistrict.toLowerCase();
      return false;
    }
    if (filter === "Attending") {
      return (userData && event.rsvps?.includes(userData.id)) || guestJoinedEvents.includes(event.id);
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50 relative pt-20 md:pt-24">
      {/* Premium Header */}
      <div className="relative bg-white border-b border-gray-100 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-16 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Events & Campaigns</h1>
              <p className="text-gray-500 font-medium mt-1">Join on-ground activities and make an impact.</p>
            </div>
          </motion.div>
          
          {/* Filters */}
          <div className="flex bg-gray-100 p-1.5 rounded-full w-fit mx-auto relative z-10 shadow-inner">
            {["National", "My Region", "Attending"].map((f) => (
              <button
                key={f}
                onClick={() => {
                  if (f === "My Region" && !userData) {
                    setIsLocationModalOpen(true);
                  } else {
                    setFilter(f as any);
                  }
                }}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                  filter === f 
                    ? "bg-gray-900 text-white shadow-md scale-105" 
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-3xl" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {filter === "Attending" ? "No Events Joined Yet" : "No Events Found"}
            </h3>
            <p className="text-gray-500 mt-2">
              {filter === "Attending" 
                ? "You haven't joined any events yet. Check out the National or Regional tab to find events near you!" 
                : `There are no ${filter.toLowerCase()} events scheduled right now.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence>
              {filteredEvents.map((event, index) => {
                const isAttending = (userData && event.rsvps?.includes(userData.id)) || guestJoinedEvents.includes(event.id);
                const isPast = event.date < new Date();
                
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group bg-white rounded-3xl flex flex-col sm:flex-row border border-gray-100 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative"
                  >
                    {/* LEFT BANNER (Date & Time) */}
                    <div className="bg-gradient-to-br from-[#007AFF] to-blue-800 sm:w-36 p-6 flex sm:flex-col items-center justify-between sm:justify-center text-white shrink-0 relative overflow-hidden">
                      {/* Decorative Elements */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl -mr-10 -mt-10"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-10 -mb-10"></div>
                      
                      <div className="relative z-10 text-center flex flex-row sm:flex-col items-center gap-3 sm:gap-1">
                        <span className="text-sm font-black uppercase tracking-widest text-blue-100">
                          {event.date.toLocaleDateString('en-IN', { month: 'short' })}
                        </span>
                        <span className="text-4xl sm:text-5xl font-black leading-none">
                          {event.date.getDate()}
                        </span>
                        <div className="flex flex-col items-center mt-0 sm:mt-2">
                          <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-0.5">Time</span>
                          <span className="text-xs font-bold text-white bg-white/20 px-2 py-1 rounded backdrop-blur-sm">
                            {event.date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT CONTENT */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Tags */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                            {event.type || 'Campaign'}
                          </span>
                          <span className="px-3 py-1 border border-gray-100 text-gray-500 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                            {event.region}
                          </span>
                        </div>

                        {/* Title & Location */}
                        <h3 className="text-2xl font-black text-gray-900 leading-tight mb-3 pr-4 group-hover:text-[#007AFF] transition-colors">
                          {event.title}
                        </h3>
                        
                        <div className="flex items-start gap-2 text-gray-500 text-sm mb-4 bg-gray-50/50 p-3 rounded-xl border border-gray-50">
                          <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                          <span className="line-clamp-2 font-medium">{event.location}</span>
                        </div>
                        
                        <p className="text-gray-500 text-sm mb-6 line-clamp-2">
                          {event.description}
                        </p>
                      </div>

                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center justify-between pt-5 border-t border-gray-100 gap-4 mt-auto">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                          <Users className="w-4 h-4 text-[#007AFF]" />
                          {(event.rsvps?.length || 0) + (event.guestRsvps?.length || 0)} Attending
                        </div>
                        
                        {!isPast ? (
                          <div className="flex flex-wrap items-center justify-end gap-2.5">
                            <button
                              onClick={() => { setSelectedInspectEvent(event); setIsInspectModalOpen(true); }}
                              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-300"
                            >
                              View Details
                            </button>
                            {isAttending && (
                              <button
                                onClick={() => openPassModal(event)}
                                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all duration-300"
                              >
                                <QrCode className="w-4 h-4" /> View Pass
                              </button>
                            )}
                            {!isAttending && (
                              <button
                                onClick={() => handleRSVP(event.id, false)}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 shadow-sm bg-[#007AFF] text-white hover:bg-blue-600 hover:-translate-y-0.5 shadow-blue-500/20"
                              >
                                Join Now
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setSelectedInspectEvent(event); setIsInspectModalOpen(true); }}
                              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-300"
                            >
                              View Details
                            </button>
                            <div className="px-5 py-2.5 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm border border-gray-200">
                              Completed
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* LOCATION SELECTOR MODAL */}
      <AnimatePresence>
        {isLocationModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsLocationModalOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl relative z-10 flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 leading-tight">Select Region</h3>
                    <p className="text-xs font-semibold text-gray-500">Find events near you</p>
                  </div>
                </div>
                <button onClick={() => setIsLocationModalOpen(false)} className="text-gray-400 hover:text-gray-900 bg-white shadow-sm p-2 rounded-full border border-gray-100 transition-all hover:scale-105">✕</button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">State</label>
                  <select 
                    value={selectedState} 
                    onChange={e => { setSelectedState(e.target.value); setSelectedDistrict(""); }} 
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium transition-all"
                  >
                    <option value="">Select your state...</option>
                    {Object.keys(INDIA_LOCATIONS).map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                
                <AnimatePresence>
                  {selectedState && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                      <label className="block text-sm font-bold text-gray-700 mb-2">District</label>
                      <select 
                        value={selectedDistrict} 
                        onChange={e => setSelectedDistrict(e.target.value)} 
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium transition-all"
                      >
                        <option value="">Select your district...</option>
                        {INDIA_LOCATIONS[selectedState].map(district => (
                          <option key={district} value={district}>{district}</option>
                        ))}
                      </select>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="pt-2">
                  <button 
                    disabled={!selectedDistrict}
                    onClick={() => {
                      setGuestDistrict(selectedDistrict);
                      setFilter("My Region");
                      setIsLocationModalOpen(false);
                    }} 
                    className="w-full py-4 bg-[#007AFF] text-white font-black rounded-2xl hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-[#007AFF] transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-5 h-5" />
                    Show Local Events
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GUEST RSVP MODAL */}
      <AnimatePresence>
        {isGuestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsGuestModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col"
            >
              <div className="p-8 text-center border-b border-gray-100">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">Join the Event</h3>
                <p className="text-gray-500 font-medium mt-2">Enter your details to confirm your attendance as a guest.</p>
              </div>

              <form onSubmit={handleGuestSubmit} className="p-8 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Name</label>
                  <input 
                    required 
                    type="text" 
                    value={guestForm.name} 
                    onChange={e => setGuestForm({...guestForm, name: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                    placeholder="E.g., Rahul Sharma" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">WhatsApp / Phone Number</label>
                  <div className="flex bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                    <span className="px-4 py-3 bg-gray-100 text-gray-500 font-bold border-r border-gray-200 flex items-center">
                      +91
                    </span>
                    <input 
                      required 
                      type="tel" 
                      maxLength={10}
                      pattern="[0-9]{10}"
                      value={guestForm.phone} 
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setGuestForm({...guestForm, phone: val});
                      }} 
                      className="w-full px-4 py-3 bg-transparent outline-none" 
                      placeholder="Enter 10 digit number" 
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsGuestModalOpen(false)} className="flex-1 py-3 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmittingGuest || guestForm.phone.length !== 10} className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-lg shadow-gray-900/20">
                    {isSubmittingGuest ? "Confirming..." : "Confirm Join"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INSPECT EVENT MODAL */}
      <AnimatePresence>
        {isInspectModalOpen && selectedInspectEvent && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsInspectModalOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-white w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl relative z-10 max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 leading-tight">Event Details</h3>
                </div>
                <button onClick={() => setIsInspectModalOpen(false)} className="text-gray-400 hover:text-gray-900 bg-white p-2 rounded-full border border-gray-100 shadow-sm transition-all hover:scale-105">✕</button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 mb-2">{selectedInspectEvent.title}</h2>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold uppercase tracking-widest">{selectedInspectEvent.type}</span>
                    <span className="px-3 py-1 border border-gray-200 text-gray-500 rounded-md text-xs font-bold">{selectedInspectEvent.region}</span>
                    {selectedInspectEvent.status === "Completed" && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                    )}
                  </div>
                  <div className="prose prose-blue max-w-none">
                    <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{selectedInspectEvent.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
                      <CalendarIcon className="w-4 h-4" /> Date & Time
                    </div>
                    <p className="font-bold text-gray-900 text-lg">
                      {selectedInspectEvent.date.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-gray-600 font-medium">
                      {selectedInspectEvent.date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
                      <MapPin className="w-4 h-4" /> Location
                    </div>
                    <p className="font-bold text-gray-900">{selectedInspectEvent.location}</p>
                  </div>
                </div>

                {/* Inspect Modal Action Bar */}
                {(() => {
                  const isAttending = (userData && selectedInspectEvent.rsvps?.includes(userData.id)) || guestJoinedEvents.includes(selectedInspectEvent.id);
                  const isPast = selectedInspectEvent.date < new Date();
                  
                  if (!isPast && isAttending) {
                    return (
                      <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900">You're attending this event!</p>
                            <p className="text-xs font-medium text-gray-500">Access your pass for entry.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setIsInspectModalOpen(false); // Close inspect modal
                            setTimeout(() => openPassModal(selectedInspectEvent), 150); // Open pass modal after a tick
                          }}
                          className="flex items-center justify-center gap-2 px-6 py-3 bg-[#007AFF] text-white rounded-xl font-bold shadow-md hover:bg-blue-600 hover:-translate-y-0.5 transition-all w-full sm:w-auto"
                        >
                          <QrCode className="w-4 h-4" /> View Pass
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

                {selectedInspectEvent.status === "Completed" && selectedInspectEvent.report && (
                  <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 space-y-6">
                    <div className="flex items-center gap-3 border-b border-blue-200/50 pb-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-white" />
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
                          <p className="text-2xl font-black text-gray-900">{selectedInspectEvent.report.actualAttendees || 0}</p>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-gray-400" /> Event Summary
                        </h5>
                        <p className="text-gray-600 text-sm leading-relaxed bg-white p-4 rounded-xl border border-blue-100/50">
                          {selectedInspectEvent.report.summary}
                        </p>
                      </div>

                      <div>
                        <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" /> Key Impact & Outcome
                        </h5>
                        <p className="text-gray-700 font-medium text-sm leading-relaxed bg-green-50 p-4 rounded-xl border border-green-200/50">
                          {selectedInspectEvent.report.impact}
                        </p>
                      </div>

                      {selectedInspectEvent.report.photos && selectedInspectEvent.report.photos.length > 0 && (
                        <div>
                          <h5 className="font-bold text-gray-900 mb-3">Event Gallery ({selectedInspectEvent.report.photos.length})</h5>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {selectedInspectEvent.report.photos.map((url: string, idx: number) => (
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

                <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                  <button onClick={() => setIsInspectModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                    Close
                  </button>
                  {selectedInspectEvent.date >= new Date() && (
                    <button
                      onClick={() => {
                        const isAtt = (userData && selectedInspectEvent.rsvps?.includes(userData.id)) || guestJoinedEvents.includes(selectedInspectEvent.id);
                        if (isAtt && !userData) {
                          toast.success("You are already attending this event as a guest.");
                          return;
                        }
                        setIsInspectModalOpen(false);
                        handleRSVP(selectedInspectEvent.id, isAtt);
                      }}
                      className="px-6 py-3 bg-[#007AFF] text-white font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25"
                    >
                      {((userData && selectedInspectEvent.rsvps?.includes(userData.id)) || guestJoinedEvents.includes(selectedInspectEvent.id)) ? "Cancel Join" : "Join Now"}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden Event Pass Renderer for Download - we still need this if the modal one is animated and scaled */}
      {/* Actually we can use the one inside the modal directly, but maintaining a hidden pristine one is safer for html-to-image to avoid capturing 3D transforms. */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        {passEventData && (
          <div ref={passRef}>
            <EventPassCard
              event={{
                id: passEventData.id,
                title: passEventData.title,
                dateObj: passEventData.date,
                location: passEventData.location
              }}
              attendee={{
                name: userData?.name || guestData?.name || "Guest Attendee",
                role: userData?.role || "Citizen/Guest",
                id: userData?.id || guestData?.phone || "Unknown"
              }}
              qrData={`${passEventData.id}::${userData?.id || guestData?.phone || "Unknown"}`}
            />
          </div>
        )}
      </div>

      {/* 3D FLOATING PASS MODAL */}
      <AnimatePresence>
        {isPassModalOpen && passEventData && (
          <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden">
            <div className="flex min-h-full items-center justify-center p-4 py-12">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setIsPassModalOpen(false)}
              />
              
              {/* Perspective Container for 3D effect */}
              <div className="relative z-10 w-full max-w-[340px] mx-auto flex flex-col items-center" style={{ perspective: "1000px" }}>
                <motion.div
                  initial={{ opacity: 0, y: 50, rotateX: 20, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    rotateX: 0, 
                    scale: 1,
                    // subtle continuous floating animation
                    y: [0, -8, 0],
                  }}
                  transition={{
                    duration: 0.6,
                    type: "spring",
                    bounce: 0.4,
                    y: { repeat: Infinity, duration: 4, ease: "easeInOut" }
                  }}
                  className="w-full flex justify-center"
                >
                  <div className="transform scale-95 sm:scale-100 origin-center">
                    <EventPassCard
                      event={{
                        id: passEventData.id,
                        title: passEventData.title,
                        dateObj: passEventData.date,
                        location: passEventData.location
                      }}
                      attendee={{
                        name: userData?.name || guestData?.name || "Guest Attendee",
                        role: userData?.role || "Citizen/Guest",
                        id: userData?.id || guestData?.phone || "Unknown"
                      }}
                      qrData={`${passEventData.id}::${userData?.id || guestData?.phone || "Unknown"}`}
                    />
                  </div>
                </motion.div>

                {/* Download Action Bar */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8 flex flex-col items-center gap-4"
                >
                  <button
                    onClick={() => handleDownloadPass(passEventData.title)}
                    disabled={downloadingPassId === passEventData.title}
                    className="flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-[#007AFF] rounded-full font-black shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 hover:bg-gray-50 transition-all w-full sm:w-auto"
                  >
                    {downloadingPassId === passEventData.title ? (
                      "Preparing Pass..."
                    ) : (
                      <>
                        <Download className="w-5 h-5" /> Save to Device
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => setIsPassModalOpen(false)}
                    className="text-white/70 text-sm font-bold tracking-widest uppercase hover:text-white transition-colors py-2"
                  >
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
