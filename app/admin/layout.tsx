// app/admin/layout.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Mail, FileText, Settings, LogOut, Menu, X, Sunrise, Search, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const sidebarLinks = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Citizens Ledger", href: "/admin/members", icon: Users },
  { name: "Newsletter", href: "/admin/newsletter", icon: Mail },
  { name: "Publishing Hub", href: "/admin/blog", icon: FileText },
  { name: "Screening Inbox", href: "/admin/applications", icon: MessageSquare },
  { name: "System Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // SEARCH LOGIC - Seedha Ledger page par filter karta hai
  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/admin/members?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  // LOGOUT LOGIC - Secure Session Delete
  const handleLogout = () => {
    document.cookie = "dsa_admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/admin-login");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      
      {/* DESKTOP SIDEBAR - LOCKED TO VIEWPORT */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-50">
        <div className="h-20 flex items-center px-6 border-b border-gray-100 shrink-0">
          <div className="w-8 h-8 bg-[#007AFF] rounded-lg flex items-center justify-center mr-3 shadow-md">
            <Sunrise className="text-white w-5 h-5" />
          </div>
          <span className="font-black text-lg tracking-tight text-gray-900">DSA ADMIN</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <p className="px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Command Center</p>
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link key={link.name} href={link.href}>
                <div className={`flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer ${isActive ? 'bg-[#007AFF] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}>
                  <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-900'}`} />
                  <span className="font-medium text-sm">{link.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* LOGOUT BUTTON - PINNED TO BOTTOM */}
        <div className="p-4 border-t border-gray-100 bg-white shrink-0 pb-6">
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-3 py-3 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-all shadow-md"
          >
            <LogOut className="w-5 h-5 mr-2" />
            End Secure Session
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 md:pl-64 flex flex-col min-h-screen relative">
        
        {/* TOP COMMAND BAR */}
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-30 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center md:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-600 rounded-lg hover:bg-gray-100">
              <Menu className="w-6 h-6" />
            </button>
            <Sunrise className="text-[#007AFF] w-6 h-6 ml-2" />
          </div>

          {/* FUNCTIONAL SEARCH PALETTE */}
          <form 
            onSubmit={handleGlobalSearch} 
            className="hidden md:flex items-center bg-gray-100/80 hover:bg-gray-200/80 transition-colors px-4 py-2.5 rounded-full w-96 border border-transparent focus-within:border-[#007AFF]/30 focus-within:bg-white focus-within:shadow-sm"
          >
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search citizens, districts... (Hit Enter)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-400 text-gray-900" 
            />
          </form>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900">Super Admin</p>
              <p className="text-[10px] font-semibold text-[#34C759] uppercase tracking-widest">System Online</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#007AFF] to-[#34C759] shadow-md border-2 border-white"></div>
          </div>
        </header>

        {/* DYNAMIC PAGE CONTENT */}
        <div className="p-4 md:p-8 flex-1">
          {children}
        </div>
      </main>
      
      {/* MOBILE MENU */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", bounce: 0, duration: 0.3 }} className="fixed inset-y-0 left-0 w-64 bg-white shadow-2xl z-50 flex flex-col md:hidden">
              <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100 shrink-0">
                <div className="flex items-center">
                  <Sunrise className="text-[#007AFF] w-6 h-6 mr-2" />
                  <span className="font-black tracking-tight text-gray-900">DSA ADMIN</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {sidebarLinks.map((link) => {
                  const isActive = pathname === link.href;
                  const Icon = link.icon;
                  return (
                    <Link key={link.name} href={link.href} onClick={() => setIsMobileMenuOpen(false)}>
                      <div className={`flex items-center px-4 py-3 rounded-xl mb-1 ${isActive ? 'bg-[#007AFF] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                        <span className="font-medium">{link.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                <button 
                  onClick={handleLogout}
                  className="flex items-center justify-center w-full px-3 py-3 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors shadow-md"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  End Secure Session
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}