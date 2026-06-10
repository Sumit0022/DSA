// components/Footer.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/hooks/useUser";

export default function Footer() {
  const pathname = usePathname();
  const { userData } = useUser();

  // In routes par footer automatically hide ho jayega
  const hiddenRoutes = ["/admin", "/leader", "/member", "/dashboard"];
  const shouldHide = hiddenRoutes.some(route => pathname.startsWith(route));

  if (shouldHide) return null;

  return (
    <footer className="bg-white border-t border-slate-200 pt-20 pb-10 px-6 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 mb-16">
        
        <div className="md:col-span-5">
          <Link href="/" className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center p-1.5">
              <img src="/dsa-logo.png" alt="DSA" className="w-full h-full object-contain grayscale opacity-80" />
            </div>
            <span className="font-black text-2xl tracking-tight text-slate-900">DSA India</span>
          </Link>
          <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-sm">
            Dedicated to building a stronger, fairer, and more prosperous India through inclusive development, accountable governance, and constitutional values.
          </p>
        </div>

        <div className="md:col-span-2 md:col-start-7">
          <h4 className="font-black text-slate-900 uppercase tracking-widest text-[11px] mb-6">Organization</h4>
          <ul className="space-y-4 text-sm font-bold text-slate-500">
            <li><Link href="/vision" className="hover:text-[#007AFF] transition-colors">Our Vision</Link></li>
            <li><Link href="/press" className="hover:text-[#007AFF] transition-colors">Press Wire</Link></li>
            <li><Link href="/gallery" className="hover:text-[#007AFF] transition-colors">Media Gallery</Link></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-black text-slate-900 uppercase tracking-widest text-[11px] mb-6">Portals</h4>
          <ul className="space-y-4 text-sm font-bold text-slate-500">
            {!userData && <li><Link href="/join" className="hover:text-[#007AFF] transition-colors">Join Movement</Link></li>}
            {!userData && <li><Link href="/login" className="hover:text-[#007AFF] transition-colors">Member Login</Link></li>}
            {userData && <li><Link href={userData.roleLevel ? "/leader/workspace" : "/member/dashboard"} className="hover:text-[#007AFF] transition-colors">Go to Dashboard</Link></li>}
          </ul>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-black text-slate-900 uppercase tracking-widest text-[11px] mb-6">Contact Hub</h4>
          <ul className="space-y-4 text-sm font-bold text-slate-500">
            <li>National Command</li>
            <li>New Delhi, India</li>
            <li><a href="mailto:contact@dsaindia.org" className="text-[#007AFF] hover:underline">contact@dsaindia.org</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-slate-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-400">
        <p>© {new Date().getFullYear()} Democratic Social Alliance. All rights reserved.</p>
        <div className="flex gap-6">
          <Link href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}