// components/Pillars.tsx
"use client";

import { motion } from "framer-motion";
import { Leaf, Heart, BookOpen, TrainFront, Lightbulb } from "lucide-react";

const pillars = [
  {
    title: "Clean India",
    desc: "Universal sanitation, modern sewers, and scientific waste management for healthy urban environments.",
    icon: Leaf,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50",
    colSpan: "col-span-1 md:col-span-1",
  },
  {
    title: "Healthy India",
    desc: "Universal healthcare access. No citizen should avoid treatment due to financial constraints.",
    icon: Heart,
    color: "text-rose-500",
    bgColor: "bg-rose-50",
    colSpan: "col-span-1 md:col-span-1",
  },
  {
    title: "Educated India",
    desc: "World-class government schools, digital classrooms, and equal educational opportunities for all.",
    icon: BookOpen,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    colSpan: "col-span-1 md:col-span-1",
  },
  {
    title: "Mobile India (Freedom Pass)",
    desc: "Every enrolled student receives free city bus and metro travel. Transportation costs should never limit educational opportunities.",
    icon: TrainFront,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    colSpan: "col-span-1 md:col-span-2", // Bento grid magic: This card is wider!
  },
  {
    title: "Future India",
    desc: "Increasing national R&D spending to 3% of GDP. Focusing on AI, Robotics, and Green energy.",
    icon: Lightbulb,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    colSpan: "col-span-1 md:col-span-1",
  },
];

export default function Pillars() {
  return (
    <section id="pillars" className="py-24 bg-[var(--color-dsa-bg)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} // Animation sirf pehli baar chalegi
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--color-dsa-text)] mb-4 tracking-tight">
            The Five Pillars
          </h2>
          <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto font-light">
            Building an India where human development becomes the primary national objective.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((pillar, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className={`p-8 rounded-3xl bg-white shadow-apple hover:shadow-apple-hover hover:-translate-y-1 transition-all duration-300 ${pillar.colSpan} border border-gray-100/50 flex flex-col justify-between group cursor-default`}
            >
              <div>
                <div className={`w-14 h-14 rounded-2xl ${pillar.bgColor} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <pillar.icon className={`w-7 h-7 ${pillar.color}`} strokeWidth={2} />
                </div>
                <h3 className="text-xl font-semibold text-[var(--color-dsa-text)] mb-3">
                  {pillar.title}
                </h3>
                <p className="text-[var(--color-text-muted)] leading-relaxed text-sm">
                  {pillar.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
        
      </div>
    </section>
  );
}