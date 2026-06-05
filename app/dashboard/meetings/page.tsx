// app/dashboard/meetings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { Calendar, MapPin, Video, Clock, Loader2, UserCheck, FileText, ExternalLink, ShieldAlert } from "lucide-react";

export default function MemberMeetings() {
  const { userData, loadingUser } = useUser();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Advanced Audience Matcher (Taaki citizen ko wahi meeting dikhe jo uske liye hai)
  const isAudienceMatched = (meetingTarget: string, userRole: string) => {
    if (!meetingTarget || meetingTarget.includes("All")) return true;
    const r = (userRole || "").toLowerCase();
    const t = meetingTarget.toLowerCase();

    if (t.includes("president") && !t.includes("vice")) return r.includes("president") && !r.includes("vice");
    if (t.includes("vice president")) return r.includes("vice president");
    if (t.includes("general secretary")) return r.includes("general secretary");
    if (t.includes("secretary") && !t.includes("general")) return r.includes("secretary") && !r.includes("general");
    if (t.includes("executive")) return r.includes("executive");
    if (t === "active members only") return r === "active_member" || r === "member";
    return true;
  };

  useEffect(() => {
    if (!userData || !userData.state) return;

    const q = query(collection(db, "meetings"), where("jurisdictionState", "in", [userData.state, "National", "All India"]), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      
      const filteredDocs = docs.filter(meet => {
        // Check Audience Strictness
        if (!isAudienceMatched(meet.targetAudience, userData.role)) return false;

        // Check Jurisdiction Strictness
        if (meet.jurisdictionState === "National" || meet.jurisdictionState === "All India") return true;
        if (meet.jurisdictionDistrict === "State Wide") return true;
        if (meet.jurisdictionDistrict === userData.district) return true;
        
        return false;
      });
      
      setMeetings(filteredDocs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData]);

  if (loadingUser || loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#007AFF]"/></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-[#007AFF]" /> Command Center Meetings
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Official schedules and tactical gatherings mapped to your role and jurisdiction.
        </p>
      </div>

      <div className="grid gap-6">
        {meetings.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-3xl p-12 text-center text-gray-400">
            <Calendar className="w-12 h-12 mx-auto opacity-20 mb-3" />
            <p className="font-bold">No active meetings scheduled for your jurisdiction yet.</p>
          </div>
        ) : (
          meetings.map((meet) => {
            const isAttended = meet.attendanceRoster && meet.attendanceRoster[userData.id];
            
            return (
              <div key={meet.id} className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-6 relative overflow-hidden group">
                
                <div className={`absolute top-0 right-0 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-bl-xl ${meet.attendanceStatus === 'Completed' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                  {meet.attendanceStatus === 'Completed' ? 'Concluded' : 'Upcoming'}
                </div>

                <div className="md:w-1/3 border-r border-gray-100 pr-4 space-y-4">
                  <div>
                    <span className={`inline-block px-2.5 py-1 rounded border text-[10px] font-black uppercase tracking-widest mb-3 ${meet.type === 'Digital' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                      {meet.type} Meeting
                    </span>
                    <h3 className="text-xl font-black text-gray-900 leading-tight">{meet.title}</h3>
                  </div>
                  <div className="space-y-2 text-sm font-bold text-gray-600">
                    <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> {meet.date} at {meet.time}</p>
                    
                    {/* 🔥 MODIFIED LOCATION/LINK LOGIC 🔥 */}
                    <div className="pt-2">
                      {meet.type === 'Digital' ? (
                        meet.attendanceStatus !== 'Completed' ? (
                          <a 
                            href={meet.location?.trim()} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#007AFF] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-blue-600 transition-all border border-blue-700"
                          >
                            <Video className="w-4 h-4" /> Join Virtual Meet
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                            <ShieldAlert className="w-3.5 h-3.5" /> Link Expired (Meet Over)
                          </span>
                        )
                      ) : (
                        <p className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" /> 
                          <span className="line-clamp-2">{meet.location}</span>
                        </p>
                      )}
                    </div>

                  </div>
                </div>

                <div className="md:w-2/3 space-y-4">
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2"><FileText className="w-3.5 h-3.5"/> Agenda & Mandate</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap font-medium">{meet.agenda}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <p className="text-xs font-bold text-gray-400">
                      Hosted by: <strong className="text-gray-900">{meet.hostName}</strong> <span className="uppercase text-[9px] ml-1 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{meet.hostRole?.replace(/_/g, ' ') || 'Leader'}</span>
                    </p>
                    {meet.attendanceStatus === 'Completed' && (
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${isAttended ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                        <UserCheck className="w-4 h-4" /> {isAttended ? 'Marked Present' : 'Marked Absent'}
                      </span>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}