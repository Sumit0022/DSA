// app/admin/analytics/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { Loader2, Users, MapPin, Navigation, BarChart3, X, Layers, AlertCircle, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const geoUrl = "/india.json";

// 📍 Coordinates map for visual dot markers over active areas
const districtCoordinates: Record<string, [number, number]> = {
  "Bareilly": [79.4304, 28.3670],
  "Lucknow": [80.9462, 26.8467],
  "New Delhi": [77.2090, 28.6139],
  "Central Delhi": [77.2090, 28.6139],
  "Mumbai City": [72.8777, 19.0760],
  "Pune": [73.8567, 18.5204],
  "Varanasi": [82.9962, 25.3176],
  "Agra": [78.0081, 27.1767],
  "Banda": [80.3311, 25.4764],
  "Dehradun": [78.0322, 30.3165],
  "Bhopal": [77.4126, 23.2599],
};

// 📍 DYNAMIC PROJECTION CONFIGURATION (Tuned for precise state scaling)
const viewConfig: Record<string, { center: [number, number], scale: number }> = {
  "DEFAULT": { center: [80, 22], scale: 1050 }, 
  "Uttar Pradesh": { center: [80.5, 27.0], scale: 3200 },
  "Delhi": { center: [77.1, 28.6], scale: 35000 }, 
  "Maharashtra": { center: [76.0, 19.0], scale: 2200 },
  "Bihar": { center: [85.5, 26.0], scale: 3800 },
  "Uttarakhand": { center: [79.0, 30.0], scale: 4500 },
  "Madhya Pradesh": { center: [78.0, 23.5], scale: 2200 },
  "Gujarat": { center: [71.5, 23.0], scale: 2500 },
  "Rajasthan": { center: [74.0, 26.5], scale: 2200 },
  "West Bengal": { center: [88.0, 24.0], scale: 3000 },
  "Karnataka": { center: [76.0, 14.5], scale: 2500 },
  "Tamil Nadu": { center: [78.5, 11.0], scale: 3000 },
  "Kerala": { center: [76.5, 10.5], scale: 4500 }
};

const stateList = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", 
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Lakshadweep", 
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", 
  "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
  "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

export default function AnalyticsMap() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Interactive Controls
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

  // Dynamic Floating Tooltip State
  const [tooltip, setTooltip] = useState({ content: "", stateName: "", x: 0, y: 0, visible: false });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "members"), (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => data.push(doc.data()));
      setMembers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStateSelection = (stateName: string) => {
    setSelectedState(stateName);
    setSelectedDistrict(null);
  };

  const districtCounts = members.reduce((acc, member) => {
    const key = member.district;
    if (key) acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const stateCounts = members.reduce((acc, member) => {
    const key = member.state;
    if (key) acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // 🔥 FORMAL ELECTORAL INTELLIGENCE ENGINE
  const getStateStatusMessage = (count: number) => {
    if (count >= 5000000) return { 
      tag: "Dominant Electoral Force", 
      desc: "Massive grassroots penetration indicating a strong probability of forming a majority government. Cadre density exceeds operational requirements for polling booth dominance.",
      color: "border-emerald-500 bg-emerald-50 text-emerald-800" 
    };
    if (count >= 1000000) return { 
      tag: "Major Political Contender", 
      desc: "Substantial operational base capable of heavily influencing state assembly elections. Strategic alliances are recommended to secure an absolute majority.",
      color: "border-green-500 bg-green-50 text-green-800" 
    };
    if (count >= 100000) return { 
      tag: "Established Regional Base", 
      desc: "Sufficient cadre strength to contest and secure municipal corporations and local administrative bodies. Requires further aggressive expansion for state-level impact.",
      color: "border-blue-500 bg-blue-50 text-blue-800" 
    };
    if (count >= 10000) return { 
      tag: "Emerging Organizational Cadre", 
      desc: "Formative stage of political mobilization. Capable of executing state-wide demonstrations, but lacks the necessary polling station infrastructure for electoral victories.",
      color: "border-amber-500 bg-amber-50 text-amber-800" 
    };
    if (count > 0) return { 
      tag: "Micro-Level Presence", 
      desc: "Negligible operational footprint. Immediate recruitment initiatives and structural deployment are required to establish meaningful political relevance.",
      color: "border-orange-500 bg-orange-50 text-orange-800" 
    };
    return { 
      tag: "Zero Operational Footprint", 
      desc: "No verified cadre presence. The alliance currently holds no political or operational influence within this jurisdiction.",
      color: "border-red-500 bg-red-50 text-red-800" 
    };
  };

  const getDistrictStatusMessage = (count: number) => {
    if (count >= 10000) return { text: "Electoral Stronghold", color: "bg-red-600 text-white" };
    if (count >= 1000) return { text: "Active Cadre Base", color: "bg-red-500 text-white" };
    if (count >= 100) return { text: "Growing Deployment", color: "bg-amber-500 text-white" };
    if (count > 0) return { text: "Initial Footprint", color: "bg-[#007AFF] text-white" };
    return { text: "Zero Cadre Present", color: "bg-gray-400 text-white" };
  };

  const activeStateCount = selectedState ? (stateCounts[selectedState] || 0) : 0;
  const stateStatus = getStateStatusMessage(activeStateCount);
  
  // Apply Map Coordinates based on selection
  const currentMapConfig = selectedState && viewConfig[selectedState] 
    ? viewConfig[selectedState] 
    : (selectedState ? { center: [80, 22] as [number, number], scale: 2500 } : viewConfig["DEFAULT"]);

  if (loading) return <div className="flex justify-center items-center h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#007AFF]"/></div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 relative">
      
      {/* 🚀 DYNAMIC MOUSE HOVER TOOLTIP */}
      {tooltip.visible && (
        <div 
          className="fixed z-50 bg-gray-900/95 backdrop-blur-sm text-white px-3 py-2 rounded-xl pointer-events-none shadow-2xl border border-gray-700/50 transform -translate-x-1/2 -translate-y-full mt-[-10px]"
          style={{ top: tooltip.y, left: tooltip.x }}
        >
          <p className="font-black text-sm tracking-tight">{tooltip.content}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{tooltip.stateName}</p>
        </div>
      )}

      {/* TOP HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 bg-white border border-gray-200 p-6 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-[#007AFF]" /> Ground Intelligence Radar
          </h1>
          <p className="text-sm text-gray-500">Analyze real-time voter and cadre density for strategic electoral planning.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Layers className="w-4 h-4 text-gray-400" />
            <select
              value={selectedState}
              onChange={(e) => handleStateSelection(e.target.value)}
              className="bg-transparent text-sm font-bold text-gray-800 outline-none pr-4 cursor-pointer"
            >
              <option value="">-- National Overview (All India) --</option>
              {stateList.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 bg-gray-900 text-white px-5 py-2.5 rounded-xl shadow-md">
            <Users className="w-4 h-4 text-blue-400"/>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total National Cadre</p>
              <p className="font-black text-base leading-none mt-0.5">{members.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* DYNAMIC FORMAL STATE ASSESSMENT ALERT */}
      <AnimatePresence>
        {selectedState && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`border-2 p-5 rounded-3xl shadow-sm ${stateStatus.color}`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <BarChart3 className="w-5 h-5 shrink-0 opacity-80" />
                  <span className="font-black text-lg uppercase tracking-tight">{selectedState} ANALYTICS</span>
                  <span className="ml-2 px-3 py-1 bg-white/80 border rounded-lg text-xs font-bold shadow-sm uppercase tracking-wider">
                    {stateStatus.tag}
                  </span>
                </div>
                <p className="text-sm font-medium leading-relaxed opacity-90 max-w-3xl">
                  {stateStatus.desc}
                </p>
              </div>
              <div className="bg-white/60 p-3 rounded-2xl border text-center shrink-0 min-w-[120px]">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-0.5">Active Force</p>
                <p className="text-3xl font-black">{activeStateCount}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* INTERACTIVE GEOGRAPHY MAP BOX (FILTERED VIEW) */}
        <div className="lg:col-span-3 bg-[#f8fafc] border border-gray-200 rounded-3xl overflow-hidden shadow-sm relative flex items-center justify-center">
          <ComposableMap 
            projection="geoMercator" 
            projectionConfig={{ scale: currentMapConfig.scale, center: currentMapConfig.center }}
            className="w-full h-[500px] md:h-[650px] outline-none transition-all duration-700"
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies
                  // ISOLATION FILTER: Accurately grabs "st_nm" from Indian TopoJSONs
                  .filter((geo) => {
                    if (!selectedState) return true;
                    // 🔥 FIX: Added 'st_nm' which is standard in Udit's India TopoJSON
                    const stateName = geo.properties.st_nm || geo.properties.state || geo.properties.NAME_1 || geo.properties.state_name || "";
                    return stateName.toLowerCase() === selectedState.toLowerCase();
                  })
                  .map((geo) => {
                    const districtName = geo.properties.district || geo.properties.dt_name || geo.properties.NAME_2 || geo.properties.district_name || "Unknown District";
                    const stateName = geo.properties.st_nm || geo.properties.state || geo.properties.NAME_1 || "";
                    
                    const count = districtCounts[districtName] || 0;
                    const isDistrictSelected = selectedDistrict?.name === districtName;

                    let shapeFill = "#F1F5F9"; // Default Empty
                    if (count >= 1000) shapeFill = "#FCA5A5"; 
                    else if (count >= 100) shapeFill = "#FCD34D"; 
                    else if (count > 0) shapeFill = "#BFDBFE"; 

                    return (
                      <Geography 
                        key={geo.rsmKey} 
                        geography={geo} 
                        fill={isDistrictSelected ? "#93C5FD" : shapeFill}
                        stroke={isDistrictSelected ? "#007AFF" : "#CBD5E1"}
                        strokeWidth={isDistrictSelected ? (selectedState ? 0.8 : 1.5) : (selectedState ? 0.4 : 0.8)}
                        onClick={() => {
                          setSelectedDistrict({ name: districtName, state: stateName, count: count });
                        }}
                        onMouseEnter={(e) => {
                          setHoveredDistrict(districtName);
                          setTooltip({ content: districtName, stateName: stateName, x: e.clientX, y: e.clientY, visible: true });
                        }}
                        onMouseMove={(e) => {
                          if (tooltip.visible) setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
                        }}
                        onMouseLeave={() => {
                          setHoveredDistrict(null);
                          setTooltip(prev => ({ ...prev, visible: false }));
                        }}
                        style={{
                          default: { outline: "none", transition: "all 0.3s" },
                          hover: { outline: "none", fill: "#94A3B8", cursor: "pointer" },
                          pressed: { outline: "none" },
                        }}
                      />
                    );
                  })
              }
            </Geographies>
            
            {/* FORCE GRAPH MARKER OVERLAY */}
            {Object.entries(districtCounts).map(([district, count]: any, index) => {
               const coordinates = districtCoordinates[district];
               if (!coordinates) return null;

               const stateName = members.find(m => m.district === district)?.state || "";
               if (selectedState && stateName.toLowerCase() !== selectedState.toLowerCase()) return null;

               const isHovered = hoveredDistrict === district;
               const baseRadius = selectedState ? 1.5 : 5;
               const dotRadius = Math.max(baseRadius, Math.min(count * (selectedState ? 0.02 : 0.1), selectedState ? 6 : 15));

               return (
                 <Marker key={index} coordinates={coordinates}>
                   <circle 
                      r={dotRadius} 
                      fill={count >= 1000 ? "#DC2626" : count > 100 ? "#D97706" : "#2563EB"} 
                      opacity={isHovered ? 1 : 0.8}
                      stroke="#FFFFFF"
                      strokeWidth={selectedState ? 0.2 : 1}
                      className="pointer-events-none"
                   />
                 </Marker>
               )
            })}
          </ComposableMap>

          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-widest shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Geospatial Engine Online
          </div>
        </div>

        {/* DATA RADAR SIDEBAR */}
        <div className="lg:col-span-1 space-y-4">
          
          <div className="bg-gray-900 rounded-3xl p-5 shadow-xl text-white">
            <h3 className="font-black text-sm mb-2 flex items-center gap-2 uppercase tracking-wider text-gray-400">
               Density Map Index
            </h3>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs font-bold text-gray-200">
                <span className="w-3.5 h-3.5 rounded-md bg-[#EF4444] border border-white shrink-0"></span> Electoral Stronghold (10,000+)
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-gray-200">
                <span className="w-3.5 h-3.5 rounded-md bg-[#F59E0B] border border-white shrink-0"></span> Active Deployment (100+)
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-gray-200">
                <span className="w-3.5 h-3.5 rounded-md bg-[#007AFF] border border-white shrink-0"></span> Initial Footprint (1+)
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-gray-200">
                <span className="w-3.5 h-3.5 rounded-md bg-[#F1F5F9] border border-gray-300 shrink-0"></span> Zero Activity Zone (0)
              </div>
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {selectedDistrict ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-white border border-gray-200 rounded-3xl p-6 shadow-md relative space-y-4"
              >
                <button 
                  onClick={() => setSelectedDistrict(null)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div>
                  <span className="text-[9px] bg-blue-50 text-[#007AFF] px-2 py-1 rounded-md border border-blue-100 font-bold uppercase tracking-widest">
                    Jurisdiction Details
                  </span>
                  <h2 className="text-2xl font-black text-gray-900 mt-2 tracking-tight">{selectedDistrict.name}</h2>
                  <p className="text-xs text-gray-400 font-bold flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" /> {selectedDistrict.state || "India"}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Registered Cadre Force</p>
                  <p className="text-4xl font-black text-gray-900">{selectedDistrict.count} <span className="text-xs font-bold text-gray-400 uppercase tracking-normal">Personnel</span></p>
                </div>

                <div className={`w-full py-3 rounded-xl font-bold text-xs text-center border uppercase tracking-wider ${getDistrictStatusMessage(selectedDistrict.count).color}`}>
                  {getDistrictStatusMessage(selectedDistrict.count).text}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center text-gray-400 h-[240px]"
              >
                <AlertCircle className="w-8 h-8 mb-2 opacity-30 text-[#007AFF]" />
                <p className="font-bold text-xs text-gray-500 leading-relaxed">
                  Select any district sector on the map to extract ground presence logs and operational metrics.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}