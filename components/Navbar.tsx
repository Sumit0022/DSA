// components/Navbar.tsx
"use client"; 

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  
  // THE FIX: Agar user in routes par hai, toh public Navbar bilkul hide kar do
  if (
    pathname.startsWith("/admin") || 
    pathname.startsWith("/admin-login") || 
    pathname.startsWith("/dashboard")
  ) {
    return null; 
  }

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 z-50 relative">
      <Link href="/" className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src="/dsa-logo.png" 
          alt="DSA Logo" 
          className="w-10 h-10 object-contain rounded-full border border-gray-100 shadow-sm bg-white"
        />
        <span className="font-bold text-xl tracking-tight text-gray-900">Democratic Social Alliance</span>
      </Link>

      <div className="hidden md:flex items-center space-x-6 text-sm text-gray-500 font-medium">
        <Link href="#pillars" className="hover:text-black transition-colors">5 Pillars</Link>
        <Link href="#watchdog" className="hover:text-black transition-colors">Watchdog</Link>
        <Link href="#insights" className="hover:text-black transition-colors">Insights</Link>
      </div>

      <div>
        <Link href="/join">
          <button className="bg-[#007AFF] text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-blue-600 transition-colors shadow-sm">
            Join the Movement
          </button>
        </Link>
      </div>
    </nav>
  );
}