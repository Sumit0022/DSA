// app/admin/newsletter/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Send, Users, MapPin, Loader2, Mail, Clock, CheckCircle2, History, Crown, Globe, AlertTriangle, X, Info } from "lucide-react";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";

// COMPLETE INDIA STATES & DISTRICTS JSON DATA
const indiaData: Record<string, string[]> = {
  "Andaman and Nicobar Islands": ["Nicobar", "North and Middle Andaman", "South Andaman"],
  "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Prakasam", "Srikakulam", "Sri Potti Sriramulu Nellore", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR District, Kadapa (Nellore)"],
  "Arunachal Pradesh": ["Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Itanagar", "Kra Daadi", "Kurung Kumey", "Lohit", "Longding", "Lower Dibang Valley", "Lower Subansiri", "Namsai", "Papum Pare", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
  "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup Metropolitan", "Kamrup", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
  "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begu Sarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
  "Chandigarh": ["Chandigarh"],
  "Chhattisgarh": ["Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Gurela Pendra Marwahi", "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker", "Kondagaon", "Korba", "Koriya", "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur", "Surguja"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Dadra", "Daman", "Diu", "Nagar Haveli"],
  "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
  "Goa": ["North Goa", "South Goa"],
  "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
  "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
  "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"],
  "Jammu and Kashmir": ["Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian", "Srinagar", "Udhampur"],
  "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahibganj", "Seraikela-Kharsawan", "Simdega", "West Singhbhum"],
  "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"],
  "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
  "Lakshadweep": ["Lakshadweep"],
  "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Niwari", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
  "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
  "Manipur": ["Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"],
  "Meghalaya": ["East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"],
  "Mizoram": ["Aizawl", "Champhai", "Hnahthial", "Khawzawl", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Saitual", "Serchhip"],
  "Nagaland": ["Chumukedima", "Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Niuland", "Noklak", "Peren", "Phek", "Shamator", "Tseminyu", "Tuensang", "Wokha", "Zunheboto"],
  "Odisha": ["Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"],
  "Puducherry": ["Karaikal", "Mahe", "Puducherry", "Yanam"],
  "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Pathankot", "Patiala", "Rupnagar", "Sahibzada Ajit Singh Nagar", "Sangrur", "Shahid Bhagat Singh Nagar", "Tarn Taran"],
  "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
  "Sikkim": ["East Sikkim", "North Sikkim", "Pakyong", "Soreng", "South Sikkim", "West Sikkim"],
  "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
  "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Komaram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak", "Medchal-Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"],
  "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
  "Uttar Pradesh": ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", "Lakhimpur Kheri", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
  "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"],
  "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"]
};

export default function NewsletterBroadcast() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  
  const [targetGroup, setTargetGroup] = useState("Citizens"); 
  const [targetScope, setTargetScope] = useState("National"); 
  
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  
  const [isSending, setIsSending] = useState(false);
  const [sentLogs, setSentLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // MODERN NOTIFICATION STATE
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | null }>({ message: "", type: null });
  const [confirmModal, setConfirmModal] = useState<any>(null); // Holds data when modal is open

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: null }), 5000); // Auto-dismiss after 5s
  };

  useEffect(() => {
    const q = query(collection(db, "newsletters"), orderBy("sentAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs: any[] = [];
      snapshot.forEach((docSnap) => {
        logs.push({ id: docSnap.id, ...docSnap.data() });
      });
      setSentLogs(logs);
      setLoadingLogs(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setSelectedState("");
    setSelectedDistrict("");
  }, [targetScope]);

  // PHASE 1: INITIATE & VALIDATE (Opens Modern Modal)
  const initiateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      return showToast("Subject and message are required.", "error");
    }

    let finalLocation = "Pan-India";

    if (targetScope === "State") {
      if (!selectedState) return showToast("Please select a target State.", "error");
      finalLocation = selectedState;
    } else if (targetScope === "District") {
      if (!selectedState || !selectedDistrict) return showToast("Please select both State and District.", "error");
      finalLocation = `${selectedDistrict}, ${selectedState}`;
    }

    setIsSending(true);

    try {
      // Fetch target members safely
      const membersRef = collection(db, "members");
      const q = query(membersRef, where("status", "==", "active_member"));
      const querySnapshot = await getDocs(q);
      
      const recipientEmails: string[] = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let isValidRecipient = true;

        if (targetScope === "State" && data.state !== selectedState) isValidRecipient = false;
        if (targetScope === "District" && (data.state !== selectedState || data.district !== selectedDistrict)) isValidRecipient = false;
        if (targetGroup === "Leaders" && !data.role) isValidRecipient = false;

        if (isValidRecipient && data.email) {
          recipientEmails.push(data.email);
        }
      });

      if (recipientEmails.length === 0) {
        setIsSending(false);
        return showToast(`No active ${targetGroup} found in ${finalLocation} with registered emails.`, "info");
      }

      // Open Confirmation Modal with actual counts
      setConfirmModal({
        targetGroup,
        finalLocation,
        recipientEmails,
        count: recipientEmails.length
      });

    } catch (error) {
      console.error(error);
      showToast("Database sync error while finding members.", "error");
    } finally {
      setIsSending(false);
    }
  };

  // PHASE 2: EXECUTE API & LOGS (After Modal Confirmation)
  const executeBroadcast = async () => {
    const { finalLocation, recipientEmails } = confirmModal;
    setConfirmModal(null); // Close modal
    setIsSending(true);

    try {
      // API Route Hit
      const apiResponse = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, emails: recipientEmails })
      });

      let apiResult;
      try {
        apiResult = await apiResponse.json();
      } catch (e) {
        throw new Error("API Route (/api/broadcast) is missing or returned invalid data. Have you created it?");
      }

      if (!apiResponse.ok || apiResult.error) {
        const errMessage = apiResult.error?.message || apiResult.error || "Resend configuration error.";
        throw new Error(errMessage);
      }

      // Success: Log to Firebase
      await addDoc(collection(db, "newsletters"), {
        subject,
        message,
        targetGroup: targetGroup, 
        targetScope: targetScope, 
        targetLocation: finalLocation,
        recipientCount: recipientEmails.length,
        sentBy: "Admin Team",
        status: "Sent",
        sentAt: serverTimestamp(),
      });
      
      setSubject("");
      setMessage("");
      setSelectedState("");
      setSelectedDistrict("");
      showToast(`Broadcast successfully delivered to ${recipientEmails.length} recipients!`, "success");
      
    } catch (error: any) {
      console.error("Broadcast failed:", error);
      // Detailed error shown cleanly in toast, no crashes
      showToast(`Email Delivery Failed: ${error.message}`, "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 relative">
      
      {/* MODERN FLOATING TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast.type && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[500] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm max-w-sm border ${
              toast.type === "success" ? "bg-gray-900 text-white border-gray-800" : 
              toast.type === "info" ? "bg-blue-50 text-blue-700 border-blue-200" :
              "bg-red-50 text-red-600 border-red-200"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />}
            {toast.type === "error" && <AlertTriangle className="w-5 h-5 shrink-0" />}
            {toast.type === "info" && <Info className="w-5 h-5 shrink-0" />}
            <p className="leading-snug">{toast.message}</p>
            <button onClick={() => setToast({ message: "", type: null })} className="ml-auto opacity-50 hover:opacity-100 transition-opacity">
              <X className="w-4 h-4 shrink-0" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODERN CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 md:p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-blue-50 text-[#007AFF] rounded-full flex items-center justify-center mx-auto border-4 border-blue-100">
                  <Send className="w-7 h-7 ml-1" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">Confirm Dispatch</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  You are about to securely broadcast this message to <strong className="text-gray-900">{confirmModal.count} active {confirmModal.targetGroup}</strong> in <strong className="text-gray-900">{confirmModal.finalLocation}</strong>.
                </p>
              </div>
              <div className="p-4 bg-gray-50 flex items-center gap-3 border-t border-gray-100">
                <button onClick={() => setConfirmModal(null)} className="flex-1 py-3 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button onClick={executeBroadcast} className="flex-1 py-3 text-sm font-bold bg-[#007AFF] text-white hover:bg-blue-600 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Send Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Mail className="w-6 h-6 text-[#007AFF]" /> Broadcast Center
          </h1>
          <p className="text-sm text-gray-500 mt-1">Dispatch official newsletters and updates to alliance members.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT PANE: COMPOSER */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-gray-400" /> Compose Dispatch
            </h3>
          </div>

          <form onSubmit={initiateBroadcast} className="p-6 space-y-6 flex-1 flex flex-col">
            
            {/* AUDIENCE SELECTION ENGINE */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 space-y-5">
              <div className="flex items-center gap-2 border-b border-blue-100 pb-3">
                <Users className="w-4 h-4 text-[#007AFF]" />
                <label className="text-xs font-bold text-blue-900 uppercase tracking-widest">Targeting Engine</label>
              </div>

              {/* 1. Recipient Category */}
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">1. Recipient Category</p>
                <div className="flex flex-wrap gap-3">
                  <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${targetGroup === "Citizens" ? 'bg-white border-[#007AFF] shadow-sm ring-2 ring-[#007AFF]/10' : 'bg-transparent border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="targetGroup" value="Citizens" checked={targetGroup === "Citizens"} onChange={(e) => setTargetGroup(e.target.value)} className="hidden" />
                    <Users className={`w-4 h-4 ${targetGroup === "Citizens" ? 'text-[#007AFF]' : 'text-gray-400'}`} />
                    <span className={`text-sm font-bold ${targetGroup === "Citizens" ? 'text-[#007AFF]' : 'text-gray-600'}`}>All Citizens</span>
                  </label>
                  
                  <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${targetGroup === "Leaders" ? 'bg-white border-amber-500 shadow-sm ring-2 ring-amber-500/10' : 'bg-transparent border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="targetGroup" value="Leaders" checked={targetGroup === "Leaders"} onChange={(e) => setTargetGroup(e.target.value)} className="hidden" />
                    <Crown className={`w-4 h-4 ${targetGroup === "Leaders" ? 'text-amber-500' : 'text-gray-400'}`} />
                    <span className={`text-sm font-bold ${targetGroup === "Leaders" ? 'text-amber-600' : 'text-gray-600'}`}>Leaders Only</span>
                  </label>
                </div>
              </div>

              {/* 2. Geographical Scope */}
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">2. Geographical Scope</p>
                <div className="flex flex-wrap gap-3">
                  {["National", "State", "District"].map((type) => (
                    <label key={type} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${targetScope === type ? 'bg-white border-gray-900 shadow-sm ring-2 ring-gray-900/10' : 'bg-transparent border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="targetScope" value={type} checked={targetScope === type} onChange={(e) => setTargetScope(e.target.value)} className="hidden" />
                      {type === "National" ? <Globe className={`w-4 h-4 ${targetScope === type ? 'text-gray-900' : 'text-gray-400'}`} /> : <MapPin className={`w-4 h-4 ${targetScope === type ? 'text-gray-900' : 'text-gray-400'}`} />}
                      <span className={`text-sm font-bold ${targetScope === type ? 'text-gray-900' : 'text-gray-600'}`}>
                        {type === "National" ? "National (Pan-India)" : `${type} Level`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Dynamic Dropdowns based on Scope */}
              <AnimatePresence>
                {targetScope !== "National" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-4 pt-2">
                    
                    {/* State Dropdown */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Target State</label>
                      <select 
                        value={selectedState}
                        onChange={(e) => {
                          setSelectedState(e.target.value);
                          setSelectedDistrict(""); 
                        }}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#007AFF] shadow-sm font-medium text-gray-900"
                      >
                        <option value="">-- Select Target State --</option>
                        {Object.keys(indiaData).map((state) => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>

                    {/* District Dropdown */}
                    {targetScope === "District" && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Target District</label>
                        <select 
                          value={selectedDistrict}
                          onChange={(e) => setSelectedDistrict(e.target.value)}
                          disabled={!selectedState}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#007AFF] shadow-sm font-medium text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                        >
                          <option value="">{selectedState ? "-- Select Target District --" : "-- Select a State First --"}</option>
                          {selectedState && indiaData[selectedState]?.map((district, index) => (
                            <option key={`${district}-${index}`} value={district}>{district}</option>
                          ))}
                        </select>
                      </motion.div>
                    )}

                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Email Composer */}
            <div className="space-y-4 flex-1 flex flex-col">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 ml-1">Subject Line</label>
                <input 
                  type="text" 
                  placeholder="e.g., Important Update on the Upcoming Rally..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold outline-none focus:bg-white focus:border-[#007AFF] transition-colors shadow-sm"
                />
              </div>
              
              <div className="flex-1 flex flex-col min-h-[250px]">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 ml-1">Broadcast Message</label>
                <textarea 
                  placeholder="Draft your official communication here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm md:text-base leading-relaxed outline-none focus:bg-white focus:border-[#007AFF] transition-colors resize-none shadow-sm"
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button 
                type="submit" 
                disabled={isSending}
                className="flex items-center gap-2 px-8 py-3.5 bg-[#007AFF] text-white font-bold rounded-xl shadow-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:bg-gray-400"
              >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {isSending ? "Validating & Dispatching..." : "Send Broadcast"}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT PANE: SENT LOGS */}
        <div className="bg-white border border-gray-200 rounded-3xl shadow-sm flex flex-col h-[600px] overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <History className="w-4 h-4 text-gray-400" /> Dispatch Logs
            </h3>
            <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-widest">
              History
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loadingLogs ? (
              <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" /></div>
            ) : sentLogs.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <Mail className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No broadcasts dispatched yet.</p>
              </div>
            ) : (
              sentLogs.map((log) => (
                <div key={log.id} className="p-5 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-[#007AFF] transition-colors">
                      {log.subject}
                    </h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 border text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${log.targetGroup === 'Leaders' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-[#007AFF] border-blue-100'}`}>
                      {log.targetGroup === 'Leaders' ? <Crown className="w-3 h-3" /> : <Users className="w-3 h-3" />} 
                      {log.targetGroup}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 border border-gray-200 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      <MapPin className="w-3 h-3" /> {log.targetLocation}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 border border-green-100 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      <CheckCircle2 className="w-3 h-3" /> {log.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 
                    {log.sentAt ? new Date(log.sentAt.toDate()).toLocaleString() : "Recently"} by {log.sentBy}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}