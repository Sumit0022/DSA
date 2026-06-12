"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, MapPin, Calendar, Clock, UserCircle } from "lucide-react";

interface EventPassCardProps {
  event: {
    id: string;
    title: string;
    dateObj: any;
    location: string;
  };
  attendee: {
    name: string;
    role: string;
    id: string;
  };
  qrData: string;
  passRef?: React.RefObject<HTMLDivElement | null>;
}

export default function EventPassCard({ event, attendee, qrData, passRef }: EventPassCardProps) {
  const [qrImageUrl, setQrImageUrl] = useState("");

  useEffect(() => {
    if (qrData) {
      QRCode.toDataURL(qrData, {
        width: 300,
        margin: 0,
        color: {
          dark: '#0f172a', // very dark navy
          light: '#ffffff'
        }
      }).then(setQrImageUrl);
    }
  }, [qrData]);

  const safeDate = typeof event.dateObj?.toDate === 'function' 
    ? event.dateObj.toDate() 
    : new Date(event.dateObj);

  return (
    <div 
      ref={passRef}
      className="w-[340px] bg-white overflow-hidden shrink-0 flex flex-col font-sans border border-gray-100 shadow-2xl relative"
      style={{ borderRadius: "24px" }}
    >
      {/* BACKGROUND GRAPHICS */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>

      {/* TICKET HEADER */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-5 flex items-center gap-4 text-white relative z-10">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md p-1.5 shrink-0">
          <img src="/dsa-logo.png" alt="DSA Logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-wide leading-tight uppercase">Democratic<br/>Social Alliance</h2>
          <span className="inline-block mt-1 bg-white/20 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase backdrop-blur-sm">
            Official Event Pass
          </span>
        </div>
      </div>

      {/* TICKET BODY */}
      <div className="p-6 relative z-10 flex-1 flex flex-col">
        {/* Faint Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none">
          <span className="text-[100px] font-black tracking-tighter transform -rotate-12">DSA</span>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
            <UserCircle className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Attendee</p>
            <p className="text-[17px] font-black text-gray-900 uppercase truncate leading-tight">{attendee.name}</p>
            {attendee.role && (
              <p className="text-[10px] font-bold text-[#007AFF] uppercase truncate mt-0.5">{attendee.role}</p>
            )}
          </div>
        </div>

        <div className="w-full h-px bg-gray-100 mb-5"></div>

        {/* Event Info */}
        <div className="space-y-4 mb-5">
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-500" /> Event
            </p>
            <p className="text-[13px] font-bold text-gray-800 leading-tight line-clamp-2 uppercase">
              {event.title}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-purple-500" /> Date
              </p>
              <p className="text-[13px] font-bold text-gray-800 uppercase">
                {safeDate.toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-orange-500" /> Time
              </p>
              <p className="text-[13px] font-bold text-gray-800 uppercase">
                {safeDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-red-500" /> Location
            </p>
            <p className="text-xs font-bold text-gray-700 uppercase line-clamp-2 leading-snug">
              {event.location}
            </p>
          </div>
        </div>

        {/* Status Section */}
        <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between border border-gray-100 mb-2">
           <div>
             <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Status</p>
             <div className="flex items-center gap-1.5 text-green-600">
               <CheckCircle2 className="w-4 h-4" />
               <span className="text-[11px] font-black uppercase tracking-wider">Verified Ticket</span>
             </div>
           </div>
           {/* Mini QR Data ID */}
           <div className="text-right">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Pass ID</p>
              <p className="text-[10px] font-bold text-gray-600 font-mono">
                {attendee.id.substring(0, 8).toUpperCase()}
              </p>
           </div>
        </div>
      </div>

      {/* TICKET BOTTOM - QR CODE & NAVY BAR */}
      <div className="relative">
        {/* Cutouts */}
        <div className="absolute -top-3 -left-3 w-6 h-6 bg-white rounded-full border border-gray-100 z-20"></div>
        <div className="absolute -top-3 -right-3 w-6 h-6 bg-white rounded-full border border-gray-100 z-20"></div>
        <div className="absolute top-0 left-3 right-3 h-px border-t-2 border-dashed border-gray-200 z-20"></div>

        <div className="bg-[#0f172a] p-5 flex items-center justify-between">
          <div className="flex-1 pr-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 leading-tight">
              Present this code<br/>at the entry gate
            </p>
            <p className="text-[9px] font-black text-green-500 uppercase tracking-widest">
              "PEOPLE BEFORE STATISTICS."
            </p>
          </div>
          
          {/* QR Code Container */}
          <div className="bg-white p-2 rounded-xl shadow-lg shrink-0">
            {qrImageUrl ? (
              <img src={qrImageUrl} alt="QR Code" className="w-20 h-20 object-contain" />
            ) : (
              <div className="w-20 h-20 bg-gray-200 animate-pulse rounded-lg" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
