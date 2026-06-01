"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search, Calendar, User, ArrowRight, Loader2,
  BookOpen, Newspaper, ArrowUpRight,
  Clock, TrendingUp, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Counter({ to, label }: { to: number; label: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useInView();
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(to / 40);
    const id = setInterval(() => {
      start += step;
      if (start >= to) { setCount(to); clearInterval(id); }
      else setCount(start);
    }, 30);
    return () => clearInterval(id);
  }, [visible, to]);
  return (
    <div ref={ref} className="stat-pill">
      <span className="stat-number">{count}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function HeroCard({ post }: { post: any }) {
  const { ref, visible } = useInView(0.1);
  return (
    <div ref={ref} className={`hero-card ${visible ? "fade-up" : "pre-anim"}`}>
      <div className="hero-inner">
        {post.coverImage && (
          <div className="hero-img-wrap">
            <img src={post.coverImage} alt={post.title} className="hero-img" />
            <div className="hero-img-overlay" />
            <span className="hero-badge">
              <TrendingUp size={11} /> Lead Story
            </span>
          </div>
        )}
        <div className="hero-body">
          <div className="hero-meta">
            <span className="meta-chip"><User size={11} /> {post.author}</span>
            <span className="meta-chip"><Clock size={11} /> {new Date(post.createdAt.toDate()).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
          <Link href={`/blog/${post.id}`} className="hero-title-link">
            <h2 className="hero-title">{post.title}</h2>
          </Link>
          <p className="hero-excerpt">{post.content.slice(0, 380)}…</p>
          <Link href={`/blog/${post.id}`} className="cta-btn">
            Read Full Article <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function SecCard({ post, delay = 0 }: { post: any; delay?: number }) {
  const { ref, visible } = useInView(0.1);
  return (
    <div ref={ref} className={`sec-card ${visible ? "fade-up" : "pre-anim"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="sec-num">{String(delay / 80 + 1).padStart(2, "0")}</div>
      <div className="sec-body">
        <div className="sec-date"><Calendar size={10} /> {new Date(post.createdAt.toDate()).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
        <Link href={`/blog/${post.id}`}>
          <h4 className="sec-title">{post.title}</h4>
        </Link>
        <p className="sec-excerpt">{post.content.slice(0, 100)}…</p>
        <Link href={`/blog/${post.id}`} className="sec-link">
          Read <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}

function RegCard({ post, delay = 0 }: { post: any; delay?: number }) {
  const { ref, visible } = useInView(0.05);
  return (
    <div ref={ref} className={`reg-card ${visible ? "fade-up" : "pre-anim"}`} style={{ transitionDelay: `${delay}ms` }}>
      {post.coverImage && (
        <div className="reg-img-wrap">
          <img src={post.coverImage} alt={post.title} className="reg-img" />
        </div>
      )}
      <div className="reg-body">
        <p className="reg-date"><Clock size={10} /> {new Date(post.createdAt.toDate()).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
        <Link href={`/blog/${post.id}`}>
          <h4 className="reg-title">{post.title}</h4>
        </Link>
        <p className="reg-excerpt">{post.content.slice(0, 120)}…</p>
        <Link href={`/blog/${post.id}`} className="reg-cta">
          Read Piece <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

const STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .chronicle-root {
    background: #f5f3ee;
    min-height: 100svh;
    font-family: 'Georgia', serif;
    color: #1a1814;
  }
  .page-wrap {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem 6rem;
  }

  /* Masthead */
  .masthead { padding: 3.5rem 0 2rem; text-align: center; position: relative; }
  .masthead::before {
    content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
    width: 1px; height: 40px; background: linear-gradient(to bottom, transparent, #1a1814);
  }
  .masthead-kicker {
    font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.25em;
    text-transform: uppercase; color: #8a7e6a; margin-bottom: 1.25rem;
  }
  .masthead-title {
    font-family: 'Georgia', serif; font-size: clamp(2.8rem, 7vw, 5.5rem);
    font-weight: 700; line-height: 0.92; letter-spacing: -0.03em;
    color: #1a1814; margin-bottom: 1.5rem;
  }
  .masthead-title em { font-style: italic; color: #c0392b; }
  .masthead-rule {
    display: flex; align-items: center; gap: 1rem; margin: 0 auto 1.25rem; max-width: 640px;
  }
  .masthead-rule-line { flex: 1; height: 1px; background: #1a1814; }
  .masthead-rule-thick { height: 3px; background: #1a1814; width: 60px; }
  .masthead-rule-dot { width: 5px; height: 5px; border-radius: 50%; background: #c0392b; flex-shrink: 0; }
  .masthead-meta {
    display: flex; justify-content: space-between; align-items: center;
    font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.18em;
    text-transform: uppercase; color: #8a7e6a;
    padding: 0.75rem 0;
    border-top: 0.5px solid #c9c3b5; border-bottom: 0.5px solid #c9c3b5;
    flex-wrap: wrap; gap: 0.5rem;
  }

  /* Stats */
  .stats-bar { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; margin: 2rem 0; }
  .stat-pill {
    display: flex; align-items: baseline; gap: 0.4rem;
    background: white; border: 0.5px solid #ddd8ce; border-radius: 100px;
    padding: 0.45rem 1.1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .stat-number { font-family: 'Courier New', monospace; font-size: 1rem; font-weight: 700; color: #1a1814; }
  .stat-label { font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #8a7e6a; }

  /* Ticker */
  .ticker-wrap {
    overflow: hidden; border-top: 0.5px solid #c9c3b5; border-bottom: 0.5px solid #c9c3b5;
    padding: 0.55rem 0; margin-bottom: 2.5rem; background: white;
  }
  .ticker-inner {
    display: flex; gap: 3rem; animation: ticker-scroll 28s linear infinite;
    white-space: nowrap; width: max-content;
  }
  .ticker-wrap:hover .ticker-inner { animation-play-state: paused; }
  @keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  .ticker-item {
    font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.15em;
    text-transform: uppercase; color: #8a7e6a; display: flex; align-items: center; gap: 0.6rem;
  }
  .ticker-dot { width: 4px; height: 4px; background: #c0392b; border-radius: 50%; }

  /* Search */
  .search-wrap { position: relative; max-width: 520px; margin: 0 auto 3rem; }
  .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #8a7e6a; pointer-events: none; transition: color 0.2s; }
  .search-wrap.focused .search-icon { color: #c0392b; }
  .search-input {
    width: 100%; padding: 0.85rem 1rem 0.85rem 2.75rem;
    background: white; border: 1px solid #ddd8ce; border-radius: 12px;
    font-family: 'Courier New', monospace; font-size: 13px; color: #1a1814; outline: none;
    transition: border-color 0.25s, box-shadow 0.25s; letter-spacing: 0.05em;
  }
  .search-input::placeholder { color: #b0a898; }
  .search-input:focus { border-color: #1a1814; box-shadow: 0 0 0 3px rgba(26,24,20,0.07); }

  /* Section label */
  .section-label { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.75rem; }
  .section-label-text {
    font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.25em;
    text-transform: uppercase; color: #8a7e6a; white-space: nowrap;
  }
  .section-label-line { flex: 1; height: 0.5px; background: #c9c3b5; }

  /* Main grid */
  .main-grid { display: grid; grid-template-columns: 1fr 340px; gap: 2.5rem; margin-bottom: 4rem; align-items: start; }
  @media (max-width: 900px) { .main-grid { grid-template-columns: 1fr; } }

  /* Hero */
  .hero-card { background: white; border-radius: 20px; border: 0.5px solid #ddd8ce; overflow: hidden; transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s; }
  .hero-card:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.1); }
  .hero-inner { display: flex; flex-direction: column; }
  .hero-img-wrap { position: relative; width: 100%; height: 340px; overflow: hidden; }
  .hero-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.7s cubic-bezier(0.22,1,0.36,1); }
  .hero-card:hover .hero-img { transform: scale(1.04); }
  .hero-img-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 40%, rgba(26,24,20,0.35)); }
  .hero-badge {
    position: absolute; top: 1rem; left: 1rem; background: #c0392b; color: white;
    font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.18em;
    text-transform: uppercase; padding: 0.3rem 0.75rem; border-radius: 100px;
    display: flex; align-items: center; gap: 0.35rem;
  }
  .hero-body { padding: 2rem 2.25rem 2.25rem; }
  .hero-meta { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .meta-chip { display: flex; align-items: center; gap: 0.3rem; font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #8a7e6a; }
  .hero-title-link { text-decoration: none; }
  .hero-title { font-family: 'Georgia', serif; font-size: clamp(1.5rem, 3.5vw, 2.2rem); font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; color: #1a1814; margin-bottom: 1rem; transition: color 0.2s; }
  .hero-title-link:hover .hero-title { color: #c0392b; }
  .hero-excerpt { font-size: 0.95rem; line-height: 1.75; color: #5a5245; margin-bottom: 1.5rem; }
  .cta-btn { display: inline-flex; align-items: center; gap: 0.4rem; background: #1a1814; color: white; text-decoration: none; font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; padding: 0.7rem 1.35rem; border-radius: 100px; transition: background 0.2s, transform 0.2s; }
  .cta-btn:hover { background: #c0392b; transform: scale(1.03); }

  /* Sidebar */
  .sidebar { display: flex; flex-direction: column; gap: 0; }
  .sidebar-head { font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: #8a7e6a; padding-bottom: 0.75rem; border-bottom: 1.5px solid #1a1814; margin-bottom: 0; }
  .sec-card { display: flex; gap: 1.1rem; padding: 1.25rem 0; border-bottom: 0.5px solid #ddd8ce; }
  .sec-card:last-child { border-bottom: none; }
  .sec-num { font-family: 'Courier New', monospace; font-size: 1.4rem; font-weight: 700; color: #ddd8ce; line-height: 1; flex-shrink: 0; padding-top: 2px; min-width: 32px; transition: color 0.2s; }
  .sec-card:hover .sec-num { color: #c0392b; }
  .sec-body { flex: 1; }
  .sec-date { display: flex; align-items: center; gap: 0.3rem; font-family: 'Courier New', monospace; font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: #b0a898; margin-bottom: 0.4rem; }
  .sec-title { font-family: 'Georgia', serif; font-size: 1rem; font-weight: 700; line-height: 1.35; color: #1a1814; margin-bottom: 0.45rem; text-decoration: none; transition: color 0.2s; display: block; }
  a:hover .sec-title { color: #c0392b; }
  .sec-excerpt { font-size: 0.78rem; line-height: 1.6; color: #7a6e5e; margin-bottom: 0.6rem; }
  .sec-link { display: inline-flex; align-items: center; gap: 0.2rem; font-family: 'Courier New', monospace; font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #c0392b; text-decoration: none; font-weight: 700; transition: gap 0.2s; }
  .sec-link:hover { gap: 0.4rem; }

  /* Regular grid */
  .reg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
  .reg-card { background: white; border-radius: 16px; border: 0.5px solid #ddd8ce; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s; }
  .reg-card:hover { transform: translateY(-3px); box-shadow: 0 12px 36px rgba(0,0,0,0.08); }
  .reg-img-wrap { height: 160px; overflow: hidden; }
  .reg-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s cubic-bezier(0.22,1,0.36,1); }
  .reg-card:hover .reg-img { transform: scale(1.05); }
  .reg-body { padding: 1.25rem 1.35rem 1.4rem; flex: 1; display: flex; flex-direction: column; }
  .reg-date { display: flex; align-items: center; gap: 0.3rem; font-family: 'Courier New', monospace; font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: #b0a898; margin-bottom: 0.55rem; }
  .reg-title { font-family: 'Georgia', serif; font-size: 1.05rem; font-weight: 700; line-height: 1.35; color: #1a1814; margin-bottom: 0.6rem; transition: color 0.2s; text-decoration: none; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  a:hover .reg-title { color: #c0392b; }
  .reg-excerpt { font-size: 0.8rem; line-height: 1.65; color: #7a6e5e; flex: 1; margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .reg-cta { display: inline-flex; align-items: center; gap: 0.3rem; font-family: 'Courier New', monospace; font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #c0392b; text-decoration: none; font-weight: 700; transition: gap 0.2s; }
  .reg-cta:hover { gap: 0.5rem; }

  /* States */
  .loader-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8rem 0; gap: 1rem; color: #8a7e6a; }
  .loader-text { font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; }
  .empty-state { text-align: center; padding: 6rem 2rem; border: 1px dashed #c9c3b5; border-radius: 20px; background: white; }
  .empty-icon { color: #c9c3b5; margin: 0 auto 1.25rem; display: block; }
  .empty-title { font-family: 'Georgia', serif; font-size: 1.4rem; font-weight: 700; color: #1a1814; margin-bottom: 0.5rem; }
  .empty-sub { font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 0.1em; color: #b0a898; }

  /* Animations */
  .pre-anim { opacity: 0; transform: translateY(28px); }
  .fade-up { opacity: 1; transform: translateY(0); transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1); }
`;

export default function PublicNewspaperBlog() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const fetchPublicBlogs = async () => {
      try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const arr: any[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.type === "blog" && data.status === "Published") arr.push({ id: d.id, ...data });
        });
        setPosts(arr);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchPublicBlogs();
  }, []);

  const filtered = posts.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const hero = filtered[0];
  const secondary = filtered.slice(1, 4);
  const regular = filtered.slice(4);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="chronicle-root">
        <div className="page-wrap">

          <header className="masthead">
            <p className="masthead-kicker">The Official Public Journal of the Democratic Social Alliance</p>
            <h1 className="masthead-title">The Citizen <em>Chronicle</em></h1>
            <div className="masthead-rule">
              <div className="masthead-rule-line" />
              <div className="masthead-rule-dot" />
              <div className="masthead-rule-thick" />
              <div className="masthead-rule-dot" />
              <div className="masthead-rule-line" />
            </div>
            <div className="masthead-meta">
              <span>Volume I · Issue IV</span>
              <span>{new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
              <span>Price: Free Speech</span>
            </div>
          </header>

          {!loading && (
            <div className="stats-bar">
              <Counter to={posts.length} label="Published" />
              <Counter to={Math.max(secondary.length + 1, 1)} label="This Week" />
              <Counter to={Math.max(1, Math.ceil(posts.length / 3))} label="Editions" />
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="ticker-wrap">
              <div className="ticker-inner">
                {[...filtered, ...filtered].map((p, i) => (
                  <span key={i} className="ticker-item">
                    <span className="ticker-dot" /> {p.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className={`search-wrap ${focused ? "focused" : ""}`}>
            <Search className="search-icon" size={15} />
            <input
              type="text"
              placeholder="Search chronicles, essays & opinions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="search-input"
            />
          </div>

          {loading ? (
            <div className="loader-wrap">
              <Loader2 size={28} style={{ color: "#1a1814", animation: "spin 1s linear infinite" }} />
              <p className="loader-text">Typesetting columns…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Newspaper className="empty-icon" size={40} />
              <h3 className="empty-title">No Articles Found</h3>
              <p className="empty-sub">The presses haven't rolled out any matching publications yet.</p>
            </div>
          ) : (
            <>
              <div className="section-label">
                <span className="section-label-text">Front Page</span>
                <div className="section-label-line" />
              </div>

              <div className="main-grid">
                {hero && <HeroCard post={hero} />}
                <aside className="sidebar">
                  <p className="sidebar-head">
                    <BookOpen size={11} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />
                    Editorial Panels
                  </p>
                  {secondary.length === 0
                    ? <p style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: "#b0a898", paddingTop: "1rem", letterSpacing: "0.1em" }}>No adjacent columns available.</p>
                    : secondary.map((p, i) => <SecCard key={p.id} post={p} delay={i * 80} />)
                  }
                </aside>
              </div>

              {regular.length > 0 && (
                <div>
                  <div className="section-label">
                    <span className="section-label-text">More Chronicles</span>
                    <div className="section-label-line" />
                  </div>
                  <div className="reg-grid">
                    {regular.map((p, i) => <RegCard key={p.id} post={p} delay={i * 60} />)}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </>
  );
}