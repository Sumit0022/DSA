"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, Loader2, Calendar, User, Share2, Newspaper, Clock, BookOpen, Check } from "lucide-react";
import Link from "next/link";

function useReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0);
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return progress;
}

function useReadingTime(content: string) {
  const words = content?.trim().split(/\s+/).length || 0;
  return Math.max(1, Math.ceil(words / 200));
}

const STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .article-root {
    background: #f5f3ee;
    min-height: 100svh;
    font-family: 'Georgia', serif;
    color: #1a1814;
  }

  /* Progress bar */
  .progress-bar-wrap {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    height: 2px; background: transparent;
  }
  .progress-bar-fill {
    height: 100%; background: #c0392b;
    transition: width 0.1s linear;
  }

  /* Nav */
  .top-nav {
    position: sticky; top: 0; z-index: 50;
    background: rgba(245,243,238,0.92);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 0.5px solid #c9c3b5;
    padding: 0.85rem 0;
  }
  .nav-inner {
    max-width: 780px; margin: 0 auto; padding: 0 1.5rem;
    display: flex; align-items: center; justify-content: space-between;
  }
  .nav-back {
    display: flex; align-items: center; gap: 0.5rem;
    font-family: 'Courier New', monospace; font-size: 10px;
    letter-spacing: 0.2em; text-transform: uppercase;
    color: #8a7e6a; text-decoration: none;
    transition: color 0.2s;
  }
  .nav-back:hover { color: #1a1814; }
  .nav-title {
    font-family: 'Courier New', monospace; font-size: 10px;
    letter-spacing: 0.15em; text-transform: uppercase; color: #c9c3b5;
    max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .nav-share {
    display: flex; align-items: center; gap: 0.45rem;
    font-family: 'Courier New', monospace; font-size: 10px;
    letter-spacing: 0.2em; text-transform: uppercase;
    color: #8a7e6a; background: none; border: none; cursor: pointer;
    transition: color 0.2s; padding: 0;
  }
  .nav-share:hover { color: #c0392b; }
  .nav-share.copied { color: #3a9e6a; }

  /* Page wrap */
  .page-wrap {
    max-width: 780px; margin: 0 auto; padding: 0 1.5rem 8rem;
  }

  /* Article header */
  .article-header {
    padding: 4rem 0 3rem;
    text-align: center;
    border-bottom: 0.5px solid #c9c3b5;
    margin-bottom: 3rem;
    opacity: 0; transform: translateY(24px);
    animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s forwards;
  }
  .article-kicker {
    font-family: 'Courier New', monospace; font-size: 9px;
    letter-spacing: 0.3em; text-transform: uppercase; color: #c0392b;
    margin-bottom: 1.25rem; display: flex; align-items: center;
    justify-content: center; gap: 0.75rem;
  }
  .kicker-line { width: 32px; height: 0.5px; background: #c0392b; }
  .article-title {
    font-family: 'Georgia', serif; font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 700; line-height: 1.12; letter-spacing: -0.025em;
    color: #1a1814; margin-bottom: 2rem;
  }
  .article-title em { font-style: italic; color: #c0392b; }
  .article-meta-row {
    display: flex; align-items: center; justify-content: center;
    gap: 0; flex-wrap: wrap;
    border-top: 0.5px solid #c9c3b5; border-bottom: 0.5px solid #c9c3b5;
    max-width: 480px; margin: 0 auto;
    overflow: hidden; border-radius: 8px;
  }
  .meta-item {
    display: flex; align-items: center; gap: 0.35rem;
    font-family: 'Courier New', monospace; font-size: 9px;
    letter-spacing: 0.18em; text-transform: uppercase; color: #8a7e6a;
    padding: 0.65rem 1.1rem;
    border-right: 0.5px solid #c9c3b5;
    flex-shrink: 0;
  }
  .meta-item:last-child { border-right: none; }

  /* Cover image */
  .cover-wrap {
    margin-bottom: 3rem; border-radius: 20px; overflow: hidden;
    border: 0.5px solid #ddd8ce;
    opacity: 0; transform: translateY(24px);
    animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.25s forwards;
  }
  .cover-img {
    width: 100%; height: clamp(240px, 45vw, 480px);
    object-fit: cover; display: block;
    transition: transform 0.8s cubic-bezier(0.22,1,0.36,1);
  }
  .cover-wrap:hover .cover-img { transform: scale(1.02); }

  /* Drop cap + article body */
  .article-body {
    font-family: 'Georgia', serif; font-size: 1.1rem; line-height: 1.85;
    color: #2c2720;
    opacity: 0; transform: translateY(24px);
    animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.38s forwards;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .article-body::first-letter {
    float: left; font-size: 4.5rem; font-weight: 700; line-height: 0.78;
    margin: 0.06em 0.12em 0 0; color: #1a1814; font-family: 'Georgia', serif;
  }

  /* Pull quote decoration */
  .pull-divider {
    display: flex; align-items: center; gap: 1rem;
    margin: 3rem 0;
  }
  .pull-divider-line { flex: 1; height: 0.5px; background: #c9c3b5; }
  .pull-divider-mark {
    font-family: 'Courier New', monospace; font-size: 9px;
    letter-spacing: 0.25em; text-transform: uppercase; color: #c9c3b5;
  }

  /* Footer tag */
  .article-footer {
    margin-top: 4rem; padding-top: 2rem;
    border-top: 1.5px solid #1a1814;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 1rem;
  }
  .footer-brand {
    font-family: 'Georgia', serif; font-size: 1.1rem; font-weight: 700;
    letter-spacing: -0.02em; color: #1a1814;
  }
  .footer-brand em { font-style: italic; color: #c0392b; }
  .footer-note {
    font-family: 'Courier New', monospace; font-size: 9px;
    letter-spacing: 0.2em; text-transform: uppercase; color: #b0a898;
  }
  .back-btn {
    display: inline-flex; align-items: center; gap: 0.5rem;
    background: #1a1814; color: white; text-decoration: none;
    font-family: 'Courier New', monospace; font-size: 10px;
    letter-spacing: 0.18em; text-transform: uppercase;
    padding: 0.65rem 1.25rem; border-radius: 100px;
    transition: background 0.2s, transform 0.2s; margin-top: 1.5rem;
  }
  .back-btn:hover { background: #c0392b; transform: scale(1.03); }

  /* Loading & empty */
  .center-state {
    min-height: 100svh; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 1rem; background: #f5f3ee; text-align: center; padding: 2rem;
  }
  .state-icon { color: #c9c3b5; }
  .state-title { font-family: 'Georgia', serif; font-size: 1.6rem; font-weight: 700; color: #1a1814; margin-bottom: 0.35rem; }
  .state-title em { font-style: italic; color: #c0392b; }
  .state-sub { font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #b0a898; max-width: 280px; line-height: 1.8; }
  .state-loader { font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #8a7e6a; }

  @keyframes fadeUp {
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .spin { animation: spin 1s linear infinite; }
`;

export default function PublicArticleReader() {
  const { id } = useParams();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const progress = useReadingProgress();
  const readingTime = useReadingTime(post?.content || "");

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

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: post.title, url: window.location.href }); }
      catch (err) { console.log(err); }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  if (loading) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        <div className="center-state">
          <Loader2 size={28} className="spin" style={{ color: "#1a1814" }} />
          <p className="state-loader">Typesetting article…</p>
        </div>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        <div className="center-state">
          <Newspaper size={48} className="state-icon" />
          <div>
            <h2 className="state-title">Chronicle Entry <em>Absent</em></h2>
            <p className="state-sub">This publication may have been archived or removed from public circulation.</p>
          </div>
          <Link href="/blog" className="back-btn">
            <ArrowLeft size={13} /> Return to Press Feed
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Reading progress */}
      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="article-root">

        {/* Sticky nav */}
        <nav className="top-nav">
          <div className="nav-inner">
            <Link href="/blog" className="nav-back">
              <ArrowLeft size={13} /> The Chronicle
            </Link>
            <span className="nav-title">{post.title}</span>
            <button onClick={handleShare} className={`nav-share ${copied ? "copied" : ""}`}>
              {copied ? <><Check size={12} /> Copied</> : <><Share2 size={12} /> Share</>}
            </button>
          </div>
        </nav>

        <div className="page-wrap">

          {/* Article header */}
          <header className="article-header">
            <p className="article-kicker">
              <span className="kicker-line" />
              The Citizen Chronicle
              <span className="kicker-line" />
            </p>
            <h1 className="article-title">{post.title}</h1>
            <div className="article-meta-row">
              <span className="meta-item"><User size={10} /> By {post.author}</span>
              <span className="meta-item">
                <Calendar size={10} />
                {new Date(post.createdAt.toDate()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              <span className="meta-item"><Clock size={10} /> {readingTime} min read</span>
            </div>
          </header>

          {/* Cover image */}
          {post.coverImage && (
            <div className="cover-wrap">
              <img src={post.coverImage} alt={post.title} className="cover-img" />
            </div>
          )}

          {/* Body */}
          <p className="article-body">{post.content}</p>

          {/* Divider */}
          <div className="pull-divider">
            <div className="pull-divider-line" />
            <span className="pull-divider-mark">End of Article</span>
            <div className="pull-divider-line" />
          </div>

          {/* Footer */}
          <footer className="article-footer">
            <div>
              <p className="footer-brand">The Citizen <em>Chronicle</em></p>
              <p className="footer-note">Democratic Social Alliance · Vol. I</p>
            </div>
            <Link href="/blog" className="back-btn">
              <ArrowLeft size={13} /> Back to Press Feed
            </Link>
          </footer>

        </div>
      </div>
    </>
  );
}