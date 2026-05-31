// app/dashboard/watchdog/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, Loader2, Calendar, User, Share2, ShieldAlert } from "lucide-react";

export default function WatchdogArticleReader() {
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
        
        if (docSnap.exists()) {
          setPost({ id: docSnap.id, ...docSnap.data() });
        } else {
          setPost(null);
        }
      } catch (error) {
        console.error("Error fetching post:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-red-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-gray-500 font-medium text-sm">Decrypting secure file...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400">
        <ShieldAlert className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-black text-gray-900 mb-2">Alert Not Found</h2>
        <p className="font-medium text-sm mb-6">The requested file might have been moved or deleted.</p>
        <button onClick={() => router.push("/dashboard/watchdog")} className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-sm hover:bg-black transition-colors">
          Return to Feed
        </button>
      </div>
    );
  }

  // Native share API integration for mobile
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: 'Read this official DSA Watchdog Alert',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <button 
          onClick={handleShare}
          className="flex items-center gap-2 text-sm font-bold text-[#007AFF] hover:bg-blue-50 transition-colors px-3 py-2 bg-white border border-blue-100 rounded-xl shadow-sm"
        >
          <Share2 className="w-4 h-4" /> Share Alert
        </button>
      </div>

      <article className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
        
        {/* Post Cover Image */}
        {post.coverImage && (
          <div className="w-full h-48 sm:h-72 md:h-96 relative bg-gray-100 border-b border-gray-200">
            <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
            <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md shadow-lg">
              Official Alert
            </div>
          </div>
        )}

        <div className="p-6 sm:p-8 md:p-10">
          
          {/* Post Header */}
          <div className="mb-8 border-b border-gray-100 pb-8">
            {!post.coverImage && (
              <span className="inline-block bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md mb-4 border border-red-100">
                Official Alert
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-6">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm font-medium text-gray-500">
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200/60">
                <User className="w-4 h-4 text-gray-400" />
                {post.author || "DSA High Command"}
              </div>
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200/60">
                <Calendar className="w-4 h-4 text-gray-400" />
                {post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : "Recently"}
              </div>
            </div>
          </div>

          {/* Post Content */}
          <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
            {post.content}
          </div>
          
        </div>
      </article>

    </div>
  );
}