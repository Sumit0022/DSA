// app/dashboard/notifications/page.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, writeBatch, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { Bell, CheckCircle2, Info, ShieldAlert, CheckCheck, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "alert" | "info";
  isRead: boolean;
  timestamp: any;
  link?: string; // 🚀 New Link Property
}

export default function NotificationsPage() {
  const { userData, loadingUser } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.id) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userData.id),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: Notification[] = [];
      snapshot.forEach(docSnap => {
        docs.push({ id: docSnap.id, ...docSnap.data() } as Notification);
      });
      setNotifications(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData?.id]);

  const markAllAsRead = async () => {
    if (notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.forEach(notif => {
      if (!notif.isRead) {
        batch.update(doc(db, "notifications", notif.id), { isRead: true });
      }
    });
    try {
      await batch.commit();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const markAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await updateDoc(doc(db, "notifications", id), { isRead: true });
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    if (type === "success") return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    if (type === "alert") return <ShieldAlert className="w-5 h-5 text-red-500" />;
    return <Info className="w-5 h-5 text-blue-500" />;
  };

  if (loadingUser || loading) return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" /></div>;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Bell className="w-5 h-5 md:w-6 md:h-6 text-[#007AFF]" /> Notifications
            </h1>
            <p className="text-xs text-gray-500 font-medium">Your personal command alerts.</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="text-[10px] md:text-xs font-bold text-[#007AFF] hover:underline flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-gray-900 font-bold">You're all caught up!</h3>
            <p className="text-xs text-gray-500 mt-1">No new alerts from the High Command.</p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((notif, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                key={notif.id}
                onClick={() => markAsRead(notif.id, notif.isRead)}
                className={`relative overflow-hidden cursor-pointer transition-all p-4 md:p-5 border rounded-2xl flex gap-4 items-start ${
                  notif.isRead 
                    ? 'bg-white border-gray-200 hover:bg-gray-50' 
                    : 'bg-blue-50/50 border-blue-200 shadow-sm hover:bg-blue-50/80'
                }`}
              >
                {!notif.isRead && (
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-[#007AFF]"></div>
                )}
                
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 ${
                  notif.type === "success" ? "bg-emerald-100" :
                  notif.type === "alert" ? "bg-red-100" : "bg-blue-100"
                }`}>
                  {getIcon(notif.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h4 className={`text-sm md:text-base font-bold ${!notif.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[9px] md:text-[10px] text-gray-400 font-semibold whitespace-nowrap mt-1">
                      {notif.timestamp ? new Date(notif.timestamp.toDate()).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "Just now"}
                    </span>
                  </div>
                  <p className={`text-xs md:text-sm leading-relaxed ${!notif.isRead ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                    {notif.message}
                  </p>
                  
                  {/* 🚀 DYNAMIC ACTION LINK BUTTON 🚀 */}
                  {notif.link && (
                    <Link href={notif.link} className="inline-flex items-center gap-1.5 mt-3 text-[10px] md:text-xs font-black text-[#007AFF] bg-white border border-[#007AFF]/20 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors shadow-sm w-max">
                      View Action Page <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}