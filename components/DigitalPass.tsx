// components/DigitalPass.tsx
"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Download, CheckCircle2 } from "lucide-react";
import React, { useRef, useState } from "react";
import * as htmlToImage from "html-to-image";

interface PassProps {
  name: string;
  state: string;
  district: string;
  memberId: string;
}

export default function DigitalPass({ name, state, district, memberId }: PassProps) {
  const passRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleDownload = async () => {
    if (passRef.current) {
      setIsDownloading(true);
      try {
        await document.fonts.ready;
        // Chota delay for final render
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Nayi library jo exactly DOM ko clone karti hai HD mein
        const dataUrl = await htmlToImage.toPng(passRef.current, {
          pixelRatio: 3, // 3x High Resolution
          cacheBust: true,
          style: {
            transform: "scale(1)", // Tilt hata kar seedha karega capture ke time
            margin: "0",
          }
        });
        
        const link = document.createElement("a");
        link.download = `DSA_Freedom_Pass_${memberId}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error("Download failed:", err);
        alert("Failed to download the pass.");
      } finally {
        setIsDownloading(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full">
      
      <div style={{ perspective: 1000 }}>
        <motion.div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ rotateY, rotateX, transformStyle: "preserve-3d" }}
          className="relative cursor-pointer group"
        >
          {/* THE ACTUAL PASS */}
          <div 
            ref={passRef}
            className="w-[340px] rounded-[24px] overflow-hidden relative bg-[#ffffff] border-4 border-[#007AFF] flex flex-col shadow-2xl"
            style={{ fontFamily: "var(--font-poppins), sans-serif" }}
          >
            {/* Top Header Section */}
            <div className="bg-[#007AFF] px-6 pt-8 pb-10 relative overflow-hidden text-center flex flex-col items-center">
              
              <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                  <path d="M0,50 C30,80 70,20 100,50 L100,100 L0,100 Z" fill="#ffffff"/>
                </svg>
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/dsa-logo.png" 
                alt="DSA Logo" 
                className="relative z-10 w-24 h-24 rounded-full shadow-xl mb-4 border-2 border-white object-cover bg-white"
              />

              <h2 className="relative z-10 text-2xl font-black text-[#ffffff] tracking-wide uppercase leading-tight">
                DEMOCRATIC<br/>SOCIAL ALLIANCE
              </h2>
              
              {/* CLEAN MODERN TAILWIND - HTML-TO-IMAGE WILL RENDER THIS PERFECTLY */}
              <div className="relative z-10 mt-3 bg-[#ffffff] rounded-full px-4 py-1.5 inline-flex items-center justify-center">
                <span className="text-[10px] font-black text-[#007AFF] tracking-[0.15em] uppercase leading-none mt-0.5">
                  OFFICIAL FREEDOM PASS
                </span>
              </div>
            </div>

            {/* Content Area */}
            <div className="px-6 py-6 bg-[#ffffff] flex flex-col space-y-5 relative">
              
              <div className="absolute right-[-20px] top-4 opacity-[0.03] pointer-events-none transform -rotate-12">
                <span className="text-8xl font-black text-[#000000]">DSA</span>
              </div>

              <div className="border-b border-[#E5E7EB] pb-3">
                <p className="text-[10px] text-[#6B7280] font-bold tracking-widest mb-1 uppercase">CITIZEN NAME</p>
                <p className="text-xl font-black text-[#111827] uppercase tracking-tight">{name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-[#E5E7EB] pb-3">
                <div>
                  <p className="text-[10px] text-[#6B7280] font-bold tracking-widest mb-1 uppercase">STATE</p>
                  <p className="text-sm font-bold text-[#374151] uppercase">{state}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#6B7280] font-bold tracking-widest mb-1 uppercase">DISTRICT</p>
                  <p className="text-sm font-bold text-[#374151] uppercase">{district}</p>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-[#6B7280] font-bold tracking-widest mb-1 uppercase">STATUS</p>
                  
                  <div className="flex items-center gap-1.5 mt-1">
                    <CheckCircle2 className="w-5 h-5 text-[#34C759]" strokeWidth={2.5} />
                    <span className="text-sm font-black text-[#34C759] uppercase tracking-wide leading-none mt-0.5">
                      VERIFIED
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-[2px] h-8 items-end opacity-60">
                  {[24, 16, 32, 12, 28, 8, 32, 20, 12, 28, 16, 24].map((h, i) => (
                    <div key={i} style={{ height: `${h}px` }} className="w-[3px] bg-[#111827]"></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#111827] p-5 text-[#ffffff] flex flex-col items-center">
              <p className="text-[10px] text-[#9CA3AF] font-bold tracking-widest mb-1 uppercase">UNIQUE MEMBER ID</p>
              <p className="font-mono text-xl font-bold tracking-[0.2em] text-[#ffffff] mb-3">
                {memberId}
              </p>
              <p className="text-xs font-semibold tracking-widest text-[#34C759] uppercase">
                "PEOPLE BEFORE STATISTICS."
              </p>
            </div>
            
          </div>
        </motion.div>
      </div>

      <button 
        onClick={handleDownload}
        disabled={isDownloading}
        className="flex items-center gap-2 px-8 py-4 bg-[#111827] text-[#ffffff] rounded-full text-sm font-bold hover:scale-105 transition-transform shadow-xl disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wider mx-auto"
      >
        <Download className="w-5 h-5" /> 
        {isDownloading ? "Generating HQ Pass..." : "Download Official Pass"}
      </button>
    </div>
  );
}