// components/Navbar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { Menu, X, UserCircle, LogIn, HeartHandshake } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const { userData, loadingUser } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Handle scroll effect for glassmorphism
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => setIsOpen(false), [pathname]);

  // 🔥 Completely hide Navbar on Admin and Dashboard routes 🔥
  const hiddenRoutes = ["/admin", "/dashboard", "/leader", "/member"];
  const shouldHide = hiddenRoutes.some(route => pathname.startsWith(route));

  if (shouldHide) return null;

  const navLinks = [
    { name: "Vision", path: "/vision" },
    { name: "Gallery", path: "/gallery" },
    { name: "Press Wire", path: "/press" },
    { name: "About", path: "/about" },
  ];

  return (
    <>
      <header 
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          // 🔥 Reduced padding on mobile (py-3) to prevent content overlap
          scrolled ? "bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm py-2.5" : "bg-white py-3 md:py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform shrink-0">
              <img src="/dsa-logo.png" alt="DSA" className="w-6 h-6 md:w-8 md:h-8 object-contain" />
            </div>
            {/* 🔥 Removed 'hidden sm:block' so text shows on mobile too */}
            <span className="font-black text-lg md:text-xl tracking-tight text-gray-900">
              DSA <span className="text-[#007AFF]">India</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link.path} 
                href={link.path} 
                className={`text-sm font-bold transition-colors ${pathname === link.path ? "text-[#007AFF]" : "text-gray-500 hover:text-gray-900"}`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Auth/Action Buttons (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {!loadingUser && !userData && (
              <>
                <Link href="/login" className="px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2">
                  <LogIn className="w-4 h-4" /> Login
                </Link>
                <Link href="/join" className="px-6 py-2.5 text-sm font-bold text-white bg-[#007AFF] hover:bg-blue-600 rounded-full shadow-md shadow-blue-500/20 transition-all flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4" /> Join Movement
                </Link>
              </>
            )}

            {!loadingUser && userData && (
              <Link href={userData.roleLevel ? "/dashboard" : "/dashboard"} className="px-5 py-2.5 text-sm font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-[#007AFF]" /> Dashboard
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button onClick={() => setIsOpen(true)} className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Mobile Full-Screen Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, x: "100%" }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: "100%" }} 
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <img src="/dsa-logo.png" alt="DSA" className="w-8 h-8 object-contain" />
                <span className="font-black text-lg text-gray-900">DSA Menu</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-100 text-gray-600 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col p-6 gap-6 flex-1 overflow-y-auto">
              {navLinks.map((link) => (
                <Link key={link.path} href={link.path} className="text-2xl font-black text-gray-800 hover:text-[#007AFF] transition-colors">
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="p-6 border-t border-gray-100 flex flex-col gap-3 pb-10">
              {!loadingUser && !userData && (
                <>
                  <Link href="/login" className="w-full py-4 bg-gray-100 text-center text-gray-900 font-bold rounded-2xl flex items-center justify-center gap-2">
                    <LogIn className="w-5 h-5" /> Member Login
                  </Link>
                  <Link href="/join" className="w-full py-4 bg-[#007AFF] text-center text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2">
                    <HeartHandshake className="w-5 h-5" /> Join The Movement
                  </Link>
                </>
              )}

              {!loadingUser && userData && (
                <Link href={userData.roleLevel ? "/dashboard" : "/dashboard"} className="w-full py-4 bg-gray-900 text-center text-white font-bold rounded-2xl flex items-center justify-center gap-2">
                  <UserCircle className="w-5 h-5" /> Go To Dashboard
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}