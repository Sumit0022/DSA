// app/page.tsx
"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Pillars from "@/components/Pillars"; // Yahan component import kiya

export default function Home() {
  const containerVars = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 },
    },
  };

  const itemVars: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <>
      {/* Hero Section */}
      <div className="relative flex flex-col items-center justify-center min-h-[85vh] overflow-hidden text-center px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-dsa-blue)] opacity-[0.03] blur-[100px] rounded-full pointer-events-none" />

        <motion.div 
          variants={containerVars}
          initial="hidden"
          animate="show"
          className="max-w-4xl mx-auto z-10"
        >
          <motion.div variants={itemVars} className="mb-6 inline-block">
            <span className="px-4 py-1.5 rounded-full border border-gray-200 bg-white shadow-sm text-xs font-semibold tracking-wide text-[var(--color-dsa-text)] uppercase">
              People Before Statistics
            </span>
          </motion.div>

          <motion.h1 variants={itemVars} className="text-5xl md:text-7xl font-bold tracking-tight text-[var(--color-dsa-text)] mb-6 leading-tight">
            Better Lives. <br className="hidden md:block" />
            <span className="text-[var(--color-dsa-blue)]">Better India.</span>
          </motion.h1>

          <motion.p variants={itemVars} className="text-lg md:text-xl text-[var(--color-text-muted)] mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            True development is reflected in clean streets, good schools, reliable healthcare, and empowered citizens. Join the movement to make human development the highest policy priority.
          </motion.p>

          <motion.div variants={itemVars} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="w-full sm:w-auto px-8 py-3.5 bg-[var(--color-dsa-text)] text-white font-medium rounded-full hover:scale-105 hover:bg-black transition-all duration-300 shadow-apple flex items-center justify-center gap-2">
              Become a Member
              <ArrowRight size={18} />
            </button>
            
            <button className="w-full sm:w-auto px-8 py-3.5 bg-white text-[var(--color-dsa-text)] font-medium rounded-full hover:scale-105 hover:shadow-apple-hover transition-all duration-300 border border-gray-200">
              Explore the 5 Pillars
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* 5 Pillars Bento Grid */}
      <Pillars />
    </>
  );
}