// app/dashboard/layout.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Shield, Eye, UserCircle, LogOut, Menu, X, Users, HeartHandshake, Calendar, ClipboardList, CheckSquare, Coins, IdCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAuth, signOut } from "firebase/auth";
import { useUser } from "@/hooks/useUser";

const citizenLinks = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Profile", href: "/dashboard/profile", icon: UserCircle },
  { name: "Membership Card", href: "/dashboard/pass", icon: IdCard },
  { name: "Reward Points", href: "/dashboard/progress", icon: Coins },
  { name: "Meetings", href: "/dashboard/meetings", icon: Calendar },
  { name: "View Leaders", href: "/dashboard/leaders", icon: Users },
  { name: "Voting", href: "/dashboard/voting", icon: CheckSquare },
  { name: "Watchdog Feed", href: "/dashboard/watchdog", icon: Eye },
  { name: "Donate", href: "/dashboard/donate", icon: HeartHandshake },
];

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { userData, loadingUser } = useUser();

  // ✅ Chat page par mobile header aur mt-16 hide karo
  const isChatPage = pathname === "/dashboard/chat";

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="flex h-[100dvh] bg-gray-50 overflow-hidden font-sans">
      
      {/* MOBILE HEADER — chat page par hide */}
      {!isChatPage && (
        <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4 shadow-sm">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              <img src="/dsa-logo.png" alt="DSA Logo" className="w-5 h-5 object-contain" />
            </div>
            <span className="font-black text-gray-900 tracking-tight text-lg uppercase">DASHBOARD</span>
          </Link>
          
          <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="p-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* MOBILE BACKDROP OVERLAY */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* MOBILE SIDEBAR DRAWER */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ x: "-100%" }} 
            animate={{ x: 0 }} 
            exit={{ x: "-100%" }} 
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="fixed top-0 left-0 w-[280px] h-[100dvh] bg-white border-r border-gray-200 z-50 flex flex-col shadow-2xl md:hidden"
          >
            {/* Sidebar Header */}
            <div className="flex h-16 items-center justify-between gap-3 px-6 border-b border-gray-100 shrink-0">
              <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 cursor-pointer">
                <div className="w-9 h-9 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  <img src="/dsa-logo.png" alt="DSA Logo" className="w-6 h-6 object-contain" />
                </div>
                <span className="font-black text-gray-900 tracking-tight text-lg uppercase">DASHBOARD</span>
              </Link>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sidebar Links */}
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
              <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Personal Access</p>
              {citizenLinks.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link 
                    key={link.name} 
                    href={link.href} 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${isActive ? "bg-gray-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-400"}`} />
                    {link.name}
                  </Link>
                );
              })}
              {userData?.role && (
                <Link 
                  href="/dashboard/workspace" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 mt-2 bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/20 rounded-xl font-black transition-all border border-[#007AFF]/20"
                >
                  <ClipboardList className="w-5 h-5" />
                  Leader Workspace
                </Link>
              )}
            </div>

            {/* User Area / Logout */}
            <div className="p-4 border-t border-gray-100 shrink-0">
              <button onClick={handleLogout} className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl transition-colors font-semibold text-sm border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-white border border-gray-200 shadow-sm rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-[#007AFF]">
                      {loadingUser ? "" : userData ? userData.name.charAt(0) : "?"}
                    </span>
                  </div>
                  Sign Out
                </div>
                <LogOut className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DESKTOP SIDEBAR — always visible */}
      <div className="hidden md:flex w-64 h-[100dvh] bg-white border-r border-gray-200 flex-col shadow-none">
        {/* Sidebar Header */}
        <div className="flex h-20 items-center justify-between gap-3 px-6 border-b border-gray-100 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              <img src="/dsa-logo.png" alt="DSA Logo" className="w-7 h-7 object-contain" />
            </div>
            <span className="font-black text-gray-900 tracking-tight text-xl uppercase">DASHBOARD</span>
          </Link>
        </div>

        {/* Sidebar Links */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Personal Access</p>
          {citizenLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link 
                key={link.name} 
                href={link.href} 
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${isActive ? "bg-gray-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-400"}`} />
                {link.name}
              </Link>
            );
          })}
          {userData?.role && (
            <Link 
              href="/dashboard/workspace" 
              className="flex items-center gap-3 px-4 py-3 mt-2 bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/20 rounded-xl font-black transition-all border border-[#007AFF]/20"
            >
              <ClipboardList className="w-5 h-5" />
              Leader Workspace
            </Link>
          )}
        </div>

        {/* User Area / Logout */}
        <div className="p-4 border-t border-gray-100 shrink-0">
          <button onClick={handleLogout} className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl transition-colors font-semibold text-sm border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-white border border-gray-200 shadow-sm rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-[#007AFF]">
                  {loadingUser ? "" : userData ? userData.name.charAt(0) : "?"}
                </span>
              </div>
              Sign Out
            </div>
            <LogOut className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ✅ chat page par mt-16 nahi lagega, baaki sab par lagega */}
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 relative ${!isChatPage ? "md:mt-0 mt-16" : ""}`}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none"></div>
          <div className="relative z-10 h-full">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}