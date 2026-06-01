// app/blog/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, Loader2, Calendar, User, Share2, Newspaper } from "lucide-react";
import Link from "next/link";

export default function PublicArticleReader() {
  const { id } = useParams();
  const router = useRouter();
  
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "posts", id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().status === "Published") {
          setPost({ id: docSnap.id, ...docSnap.data() });
        } else {
          setPost(null);
        }
      } catch (error) {
        console.error("Error fetching article:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div className="bg-[#fcfbf7] min-h-screen flex flex-col items-center justify-center text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-gray-900" />
        <p className="font-serif font-bold text-sm">Fetching journal data...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-[#fcfbf7] min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <Newspaper className="w-16 h-16 mb-4 text-gray-300" />
        <h2 className="text-2xl font-serif font-black text-gray-900 mb-2">Chronicle Entry Absent</h2>
        <p className="text-sm text-gray-500 mb-6 font-serif max-w-xs">This publication may have been archived or removed from public circulation.</p>
        <Link href="/blog" className="px-5 py-2.5 bg-gray-900 text-white font-bold rounded-xl text-sm hover:bg-black transition-colors">
          Return to Press Feed
        </Link>
      </div>
    );
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url: window.location.href });
      } catch (err) { console.log(err); }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to typewriter clipboard!");
    }
  };

  return (
    <div className="bg-[#fcfbf7] min-h-screen text-gray-900 selection:bg-yellow-200 pb-20">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        
        {/* TOP COMPACT NAVIGATION */}
        <div className="flex items-center justify-between border-b border-gray-300 pb-4 mb-8">
          <Link 
            href="/blog" 
            className="flex items-center gap-2 text-xs font-serif font-black uppercase tracking-wider text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Chronicle
          </Link>
          <button 
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-serif font-black uppercase tracking-wider text-[#007AFF] hover:underline"
          >
            <Share2 className="w-4 h-4" /> Dispatch Article
          </button>
        </div>

        {/* MAIN JOURNAL LEAFLET */}
        <article className="space-y-6">
          
          <div className="space-y-4 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight text-gray-900 leading-tight">
              {post.title}
            </h1>
            
            {/* Meta tags styled in classic print fashion */}
            <div className="flex items-center justify-center gap-4 text-xs font-serif font-bold text-gray-500 border-y border-gray-200 py-2.5 max-w-max mx-auto px-6">
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5"/> BY {post.author.toUpperCase()}</span>
              <span className="text-gray-300">•</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> {new Date(post.createdAt.toDate()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          {post.coverImage && (
            <div className="w-full h-64 sm:h-96 border border-gray-900 overflow-hidden rounded-2xl my-6">
              <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover grayscale" />
            </div>
          )}

          {/* Newspaper Column Spaced Typography */}
          <div className="font-serif text-gray-800 text-lg leading-relaxed whitespace-pre-wrap pt-4 md:px-2 tracking-normal drop-cap-enabled">
            {post.content}
          </div>

        </article>
      </div>
    </div>
  );
}