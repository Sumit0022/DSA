// hooks/useUser.ts
"use client";
import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useUser() {
  const [userData, setUserData] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // 1. Try fetching by user UID
          let docRef = doc(db, "members", user.uid);
          let docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setUserData({ id: docSnap.id, ...docSnap.data() });
          } else if (user.phoneNumber) {
            // 2. Fallback: Try fetching by Phone Number (agar UID se register nahi kiya)
            const phoneRaw = user.phoneNumber.replace("+91", ""); 
            const q = query(collection(db, "members"), where("phone", "==", phoneRaw));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              setUserData({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });
            }
          }
        } catch (error) {
          console.error("Error fetching live user:", error);
        }
      } else {
        setUserData(null);
      }
      setLoadingUser(false);
    });

    return () => unsubscribe();
  }, []);

  return { userData, loadingUser };
}