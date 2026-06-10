// app/gallery/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CheckCircle2, Film, Image as ImageIcon, Filter, ChevronLeft, ChevronRight } from "lucide-react";

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

// ─── SUB-COMPONENT: POST CARD WITH NO-CROP SLIDER & BLURRED BACKDROP ───
const GalleryPost = ({ post }: { post: any }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.clientWidth;
    const slide = Math.round(scrollLeft / width);
    setCurrentSlide(slide);
  };

  // Smooth scroll logic for arrows
  const handlePrev = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -scrollRef.current.clientWidth, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: scrollRef.current.clientWidth, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 md:border md:rounded-2xl md:mb-6 overflow-hidden max-w-[600px] w-full mx-auto shadow-sm">
      
      {/* Post Header */}
      <div className="flex items-center justify-between p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-gray-200 p-0.5 shrink-0 bg-gray-50 flex items-center justify-center">
            <img src="/dsa-logo.png" alt="DSA" className="w-full h-full object-contain" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1">
              <span className="font-bold text-gray-900 text-sm">dsa_official</span>
              <CheckCircle2 className="w-3.5 h-3.5 fill-[#007AFF] text-white" />
            </div>
            {post.eventName && <p className="text-[11px] text-gray-500 font-medium">{post.eventName}</p>}
          </div>
        </div>
        <span className="text-xs text-gray-400 font-medium">{formatTimeAgo(post.createdAt)}</span>
      </div>

      {/* Media Window */}
      <div className="relative w-full h-[450px] sm:h-[520px] bg-black flex items-center justify-center group">
        
        {/* Glassmorphic Arrows (Only visible if multiple media & correct slide) */}
        {post.media?.length > 1 && currentSlide > 0 && (
          <button 
            onClick={handlePrev} 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white flex items-center justify-center z-30 transition-all opacity-0 group-hover:opacity-100 shadow-md border border-white/20"
          >
            <ChevronLeft className="w-5 h-5 -ml-0.5" />
          </button>
        )}
        
        {post.media?.length > 1 && currentSlide < post.media.length - 1 && (
          <button 
            onClick={handleNext} 
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white flex items-center justify-center z-30 transition-all opacity-0 group-hover:opacity-100 shadow-md border border-white/20"
          >
            <ChevronRight className="w-5 h-5 -mr-0.5" />
          </button>
        )}

        {/* Scrollable Container */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="w-full h-full flex overflow-x-auto snap-x snap-mandatory hide-scrollbar relative z-20"
        >
          {post.media?.map((m: any, idx: number) => (
            <div key={idx} className="w-full h-full shrink-0 snap-center flex items-center justify-center relative bg-black overflow-hidden">
              
              {/* 🔥 MAGIC TRICK: Dynamic Blurred Backdrop for Images 🔥 */}
              {m.type !== 'video' && (
                <div 
                  className="absolute inset-0 z-0 bg-cover bg-center blur-3xl opacity-50 scale-110" 
                  style={{ backgroundImage: `url(${m.url})` }} 
                />
              )}

              {/* Main Content (Uncropped) */}
              {m.type === 'video' ? (
                <video src={m.url} controls playsInline controlsList="nodownload" className="w-full h-full object-contain relative z-10 bg-black" />
              ) : (
                <img 
                  src={m.url} 
                  alt={`Media ${idx+1}`} 
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain relative z-10 drop-shadow-2xl" 
                  loading="lazy" 
                />
              )}
            </div>
          ))}
        </div>

        {/* Carousel Indicators */}
        {post.media?.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-30">
            {post.media.map((_: any, idx: number) => (
              <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'bg-[#007AFF] scale-125' : 'bg-white/50'}`} />
            ))}
          </div>
        )}
        
        {/* Media Type Icon */}
        {post.media?.length > 0 && post.media[0].type === 'video' && (
           <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md text-white p-1.5 rounded-full z-30 pointer-events-none border border-white/10">
              <Film className="w-4 h-4" />
           </div>
        )}
      </div>

      {/* Caption Section */}
      <div className="p-4">
        {post.caption && (
          <p className="text-[15px] text-gray-900 leading-relaxed whitespace-pre-wrap">
            <span className="font-bold mr-2">dsa_official</span> 
            {post.caption}
          </p>
        )}
      </div>
    </div>
  );
};

// ─── MAIN PUBLIC WIRE COMPONENT ───
export default function PublicGallery() {
  const [posts, setPosts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState("");

  useEffect(() => {
    // Fetch Published Posts Only
    const qPosts = query(collection(db, "gallery_posts"), where("status", "==", "published"), orderBy("createdAt", "desc"));
    const unsubPosts = onSnapshot(qPosts, (snap) => {
      setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Fetch Events for Dropdown Filter
    const qEvents = query(collection(db, "gallery_events"), orderBy("date", "desc"));
    const unsubEvents = onSnapshot(qEvents, (snap) => {
      setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubPosts(); unsubEvents(); };
  }, []);

  const filteredPosts = posts.filter(p => selectedEventId === "" || p.eventId === selectedEventId);

  return (
    <div className="min-h-screen bg-gray-50 pt-2 pb-20 md:py-8">
      
      {/* Top Filter Bar */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-200 md:rounded-2xl md:border md:max-w-[600px] mx-auto px-4 py-3 mb-6 shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shrink-0">
          <Filter className="w-5 h-5 text-[#007AFF]" />
        </div>
        <div className="flex-1">
          <select 
            value={selectedEventId} 
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full bg-transparent text-sm font-black text-gray-900 outline-none cursor-pointer"
          >
            <option value="">All Official Media Updates</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name} ({ev.date})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Feed */}
      <div className="flex flex-col gap-0 md:gap-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#007AFF] rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold tracking-wide">Syncing Official Gallery...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20 text-gray-400 font-medium px-4">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-bold">No public updates logged yet.</p>
          </div>
        ) : (
          filteredPosts.map(post => <GalleryPost key={post.id} post={post} />)
        )}
      </div>

      {/* Global Style for hiding scrollbars on carousel */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}