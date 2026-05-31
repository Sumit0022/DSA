// app/dashboard/watchdog/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Eye, Search, AlertCircle, Loader2, ArrowRight, ShieldAlert, Calendar } from "lucide-react";
import Link from "next/link";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function WatchdogFeed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchWatchdogs = async () => {
      try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedPosts: any[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.type === "watchdog" && data.status === "Published") {
            fetchedPosts.push({ id: doc.id, ...data });
          }
        });
        
        setPosts(fetchedPosts);
      } catch (error) {
        console.error("Error fetching watchdog feed:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchWatchdogs();
  }, []);

  // Filter posts based on search query
  const filteredPosts = posts.filter(post => 
    post.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    post.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-4 md:pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 md:w-8 md:h-8 text-red-500" /> Watchdog Feed
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-2 max-w-xl">
            Stay informed about corruption, policy failures, and critical local alerts. Hold the system accountable.
          </p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search alerts by keyword..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm text-sm focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all placeholder:text-gray-400 font-medium"
        />
      </div>

      {/* FEED TIMELINE */}
      <div className="space-y-4 md:space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="text-gray-500 font-medium text-sm">Syncing latest alerts...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm">
            <Eye className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No Alerts Found</h3>
            <p className="text-sm text-gray-500 mt-2">There are currently no watchdog alerts matching your criteria.</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <Link key={post.id} href={`/dashboard/watchdog/${post.id}`} className="block bg-white border border-gray-200 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:border-red-200 transition-all group">
              <div className="flex flex-col sm:flex-row">
                {/* Image Thumbnail (if exists) */}
                {post.coverImage && (
                  <div className="w-full sm:w-48 h-48 sm:h-auto shrink-0 bg-gray-100 overflow-hidden relative">
                    <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded shadow-md">Alert</div>
                  </div>
                )}
                
                <div className="p-5 md:p-6 flex flex-col justify-between flex-1">
                  <div>
                    {!post.coverImage && (
                      <span className="inline-block bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md mb-3 border border-red-100">Official Alert</span>
                    )}
                    <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight mb-2 group-hover:text-red-600 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                      {post.content}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs md:text-sm font-medium text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : "Recently"}
                    </div>
                    <span className="text-red-500 flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform">
                      Read Full <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

    </div>
  );
}