// app/dashboard/layout.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Shield, Eye, UserCircle, LogOut, Menu, X, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAuth, signOut } from "firebase/auth";
import { useUser } from "@/hooks/useUser";

const citizenLinks = [
  { name: "My HQ", href: "/dashboard", icon: LayoutDashboard },
  { name: "Freedom Pass", href: "/dashboard/pass", icon: Shield },
  { name: "Watchdog Feed", href: "/dashboard/watchdog", icon: Eye },
  { name: "Local Leaders", href: "/dashboard/leaders", icon: Users },
  { name: "My Profile", href: "/dashboard/profile", icon: UserCircle },
];

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { userData, loadingUser } = useUser();

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
      
      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4 shadow-sm">
        {/* 🔥 FIX: CLICKABLE LOGO TO MY HQ */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#007AFF] rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-gray-900 tracking-tight text-lg">CITIZEN HQ</span>
        </Link>
        
        <button 
          onClick={() => setIsMobileMenuOpen(true)} 
          className="p-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

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

      {/* SIDEBAR */}
      <AnimatePresence>
        {(isMobileMenuOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <motion.div 
            initial={{ x: "-100%" }} 
            animate={{ x: 0 }} 
            exit={{ x: "-100%" }} 
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="fixed md:static top-0 left-0 w-[280px] md:w-64 h-[100dvh] bg-white border-r border-gray-200 z-50 flex flex-col shadow-2xl md:shadow-none"
          >
            {/* Sidebar Header */}
            <div className="flex h-16 md:h-20 items-center justify-between gap-3 px-6 border-b border-gray-100 shrink-0">
              {/* 🔥 FIX: CLICKABLE LOGO TO MY HQ */}
              <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 cursor-pointer">
                <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-[#007AFF] to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="font-black text-gray-900 tracking-tight text-lg md:text-xl">CITIZEN HQ</span>
              </Link>
              <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full">
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

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 md:mt-0 mt-16 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none"></div>
          <div className="relative z-10 h-full">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}