// app/blog/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Search, Calendar, User, ArrowRight, Loader2, BookOpen, Newspaper } from "lucide-react";
import Link from "next/link";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PublicNewspaperBlog() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchPublicBlogs = async () => {
      try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedBlogs: any[] = [];
        
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // Filter out only Published Articles (Not Watchdogs, Not Drafts)
          if (data.type === "blog" && data.status === "Published") {
            fetchedBlogs.push({ id: docSnap.id, ...data });
          }
        });
        
        setPosts(fetchedBlogs);
      } catch (error) {
        console.error("Error fetching public blogs:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPublicBlogs();
  }, []);

  const filteredPosts = posts.filter(post => 
    post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Split data for Newspaper Layout hierarchy
  const heroPost = filteredPosts[0];
  const secondaryPosts = filteredPosts.slice(1, 4);
  const regularPosts = filteredPosts.slice(4);

  return (
    <div className="bg-[#fcfbf7] min-h-screen text-gray-900 selection:bg-yellow-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* NEWSPAPER MAIN MASTHEAD HEADER */}
        <header className="text-center border-b-4 border-double border-gray-900 pb-6 mb-8">
          <p className="text-[10px] sm:text-xs font-serif font-bold uppercase tracking-widest text-gray-500 mb-2">
            The Official Public Journal of the Democratic Social Alliance
          </p>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-black tracking-tight uppercase text-gray-900 border-y border-gray-900 py-3 my-2">
            The Citizen Chronicle
          </h1>
          <div className="flex flex-col sm:flex-row justify-between items-center text-xs font-serif font-bold text-gray-600 px-2 mt-2 gap-2">
            <span className="uppercase">Volume I • Issue IV</span>
            <span className="uppercase">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span className="uppercase">Price: Free Speech</span>
          </div>
        </header>

        {/* SEARCH BAR BAR */}
        <div className="relative max-w-xl mx-auto mb-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search chronicles, essays & opinions..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border-2 border-gray-900 rounded-xl text-sm outline-none font-medium focus:ring-4 focus:ring-gray-900/5 transition-all"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-gray-900" />
            <p className="font-serif font-bold text-sm">Typesetting columns...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-3xl p-12 text-center max-w-md mx-auto">
            <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-serif font-black text-xl">No Articles Found</h3>
            <p className="text-sm text-gray-500 mt-2">The presses haven't rolled out any publications matching this criteria yet.</p>
          </div>
        ) : (
          <div className="space-y-10">
            
            {/* FRONT PAGE: DYNAMIC NEWSPAPER GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 border-b border-gray-300 pb-10">
              
              {/* MAIN HERO HEADLINE COLUMN (Col span 2) */}
              {heroPost && (
                <div className="lg:col-span-2 space-y-4 border-b lg:border-b-0 lg:border-r border-gray-200 pb-8 lg:pb-0 lg:pr-8">
                  {heroPost.coverImage && (
                    <div className="w-full h-64 sm:h-96 bg-gray-100 border border-gray-900 overflow-hidden rounded-xl">
                      <img src={heroPost.coverImage} alt={heroPost.title} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                    </div>
                  )}
                  <div className="space-y-3">
                    <Link href={`/blog/${heroPost.id}`} className="block group">
                      <h2 className="text-2xl sm:text-4xl font-serif font-black text-gray-900 leading-tight group-hover:text-[#007AFF] transition-colors decoration-gray-900 group-hover:underline">
                        {heroPost.title}
                      </h2>
                    </Link>
                    <div className="flex items-center gap-4 text-xs font-serif font-bold text-gray-500">
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5"/> By {heroPost.author}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> {new Date(heroPost.createdAt.toDate()).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-700 text-base leading-relaxed font-serif first-letter:text-5xl first-letter:font-black first-letter:float-left first-letter:mr-2 first-letter:text-gray-900">
                      {heroPost.content.slice(0, 450)}...
                    </p>
                    <Link href={`/blog/${heroPost.id}`} className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#007AFF] hover:underline pt-2">
                      Read Full Front Page Article <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              {/* SECONDARY SIDE COLUMN (Col span 1) */}
              <div className="space-y-6">
                <h3 className="font-serif font-black text-lg uppercase tracking-wide border-b-2 border-gray-900 pb-1.5 mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gray-600" /> Editorial Panels
                </h3>
                
                {secondaryPosts.length === 0 ? (
                  <p className="text-xs font-serif italic text-gray-400">No adjacent columns available.</p>
                ) : (
                  secondaryPosts.map((post) => (
                    <div key={post.id} className="space-y-2 border-b border-gray-200 pb-5 last:border-0 last:pb-0 group">
                      <Link href={`/blog/${post.id}`}>
                        <h4 className="font-serif font-black text-lg text-gray-900 group-hover:text-[#007AFF] leading-snug transition-colors">
                          {post.title}
                        </h4>
                      </Link>
                      <div className="flex items-center gap-3 text-[11px] font-serif text-gray-400">
                        <span>{new Date(post.createdAt.toDate()).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-gray-600 font-serif line-clamp-3 leading-relaxed">
                        {post.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

            </div>

            {/* LOWER COLS: REGULAR ARCHIVE GRID */}
            {regularPosts.length > 0 && (
              <div className="space-y-6">
                <h3 className="font-serif font-black text-xl uppercase border-b-2 border-gray-900 pb-2">More Chronicles</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularPosts.map((post) => (
                    <div key={post.id} className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-gray-400 transition-all group">
                      <div className="space-y-3">
                        <Link href={`/blog/${post.id}`}>
                          <h4 className="font-serif font-black text-lg text-gray-900 group-hover:text-[#007AFF] leading-tight transition-colors line-clamp-2">
                            {post.title}
                          </h4>
                        </Link>
                        <p className="text-xs text-gray-500 font-serif">{new Date(post.createdAt.toDate()).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-600 font-serif line-clamp-3 leading-relaxed">{post.content}</p>
                      </div>
                      <Link href={`/blog/${post.id}`} className="text-xs font-bold text-[#007AFF] hover:underline mt-4 inline-flex items-center gap-1">
                        Read Piece <ArrowRight className="w-3 h-3"/>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}