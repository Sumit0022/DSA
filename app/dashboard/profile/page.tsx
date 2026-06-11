// app/dashboard/profile/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { User, MapPin, Mail, Phone, Camera, Save, Loader2, ShieldCheck, CheckCircle2, AlertTriangle, X, Star, Crown, Award } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { motion, AnimatePresence } from "framer-motion";

// CONSTANT FOR DROPDOWNS
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

export default function CitizenProfile() {
  const { userData, loadingUser } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [stateName, setStateName] = useState("");
  const [districtName, setDistrictName] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // 🔥 New Variables Extraction
  const userPoints = userData?.points || 0;
  const isLeader = userData?.role && userData?.role !== "member" && userData?.role !== "active_member";
  const userRoleTitle = userData?.roleTitle || userData?.role?.replace(/_/g, " ");
  const userRoleLevel = userData?.roleLevel || "";

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | null }>({ message: "", type: null });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: null }), 4000);
  };

  // Pre-fill data when user loads
  useEffect(() => {
    if (userData) {
      setName(userData.name || "");
      setEmail(userData.email || "");
      setPhone(userData.phone || "");
      setStateName(userData.state || "");
      setDistrictName(userData.district || "");
      setProfileImage(userData.profileImage || null);
    }
  }, [userData]);

  // Handle Image Upload (Base64 conversion)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Limit to 2MB
        showToast("Image size must be less than 2MB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Form Submission
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.id) return;
    if (!name || !stateName || !districtName) {
      return showToast("Name and Location details are mandatory.", "error");
    }

    setIsSaving(true);
    try {
      const userRef = doc(db, "members", userData.id);
      await updateDoc(userRef, {
        name,
        email,
        phone,
        state: stateName,
        district: districtName,
        profileImage: profileImage, // Save the base64 string
      });
      showToast("Profile updated successfully. Information synced system-wide.", "success");
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("Failed to save profile. Try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#007AFF]" />
        <p className="font-medium text-sm md:text-base">Loading secure profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-12 relative">
      
      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast.type && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[500] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm max-w-sm border ${
              toast.type === "success" ? "bg-gray-900 text-white border-gray-800" : "bg-red-50 text-red-600 border-red-200"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            <p className="leading-snug">{toast.message}</p>
            <button onClick={() => setToast({ message: "", type: null })} className="ml-auto opacity-50 hover:opacity-100 transition-opacity">
              <X className="w-4 h-4 shrink-0" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-4 md:pb-6">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <User className="w-6 h-6 text-[#007AFF]" /> My Profile
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1 max-w-xl">
            Update your identity details. These details will reflect on your official Digital Pass and local jurisdiction.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
        
        {/* TOP BANNER */}
        <div className="h-32 md:h-40 bg-gray-900 w-full relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#007AFF]/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          {isLeader && (
            <div className="absolute top-4 right-4 bg-amber-500/20 text-amber-400 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-amber-500/30 flex items-center gap-1.5 uppercase tracking-widest backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5" /> Official Leader
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="p-6 md:p-10 pt-0 relative">
          
          {/* AVATAR UPLOAD SECTION */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-end -mt-16 md:-mt-20 mb-8 md:mb-12">
            <div className="relative group">
              <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-full p-1.5 shadow-xl relative z-10">
                <div className="w-full h-full bg-gray-100 rounded-full overflow-hidden flex items-center justify-center relative">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-16 h-16 text-gray-300" />
                  )}
                  {/* Upload Overlay */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                  >
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                  </div>
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              
              {/* 🔥 Floating Points Badge overlaying profile image 🔥 */}
              <div className="absolute bottom-1 -right-2 md:right-0 bg-amber-400 text-amber-950 font-black text-sm px-3 py-1 rounded-full border-2 border-white shadow-lg flex items-center gap-1 z-20">
                 <Star className="w-4 h-4 fill-amber-950" /> {userPoints}
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight capitalize">{name || "Citizen"}</h2>
              
              {/* 🔥 Dynamic Leadership Title Display 🔥 */}
              {isLeader ? (
                 <p className="text-sm font-black text-amber-600 flex items-center gap-1.5 mt-1 uppercase tracking-widest bg-amber-50 inline-block px-2 py-0.5 rounded border border-amber-100">
                   <Crown className="w-4 h-4 text-amber-500" /> {userRoleTitle} ({userRoleLevel})
                 </p>
              ) : (
                 <p className="text-sm font-bold text-gray-500 flex items-center gap-1.5">
                   <MapPin className="w-4 h-4 text-[#007AFF]" /> {districtName || "District"}, {stateName || "State"}
                 </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            
            {/* PERSONAL INFO */}
            <div className="space-y-5">
              <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" /> Personal Details
              </h3>
              
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your legal name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#007AFF] shadow-sm font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#007AFF] shadow-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter valid email"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#007AFF] shadow-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* LOCATION DETAILS */}
            <div className="space-y-5">
              <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" /> Operating Jurisdiction
              </h3>
              
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">State</label>
                <select 
                  value={stateName}
                  onChange={(e) => {
                    setStateName(e.target.value);
                    setDistrictName(""); // Reset district if state changes
                  }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#007AFF] shadow-sm font-medium"
                >
                  <option value="">-- Select State --</option>
                  {Object.keys(indiaData).map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">District</label>
                <select 
                  value={districtName}
                  onChange={(e) => setDistrictName(e.target.value)}
                  disabled={!stateName}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#007AFF] shadow-sm font-medium disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <option value="">{stateName ? "-- Select District --" : "Select State First"}</option>
                  {stateName && indiaData[stateName]?.map((district, idx) => (
                    <option key={`${district}-${idx}`} value={district}>{district}</option>
                  ))}
                </select>
              </div>
              
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl mt-4">
                <p className="text-[11px] leading-relaxed text-blue-800 font-medium">
                  <strong>Note:</strong> Your official ID card and local alliance assignments will be based on the location details provided here. Ensure they are correct.
                </p>
              </div>
            </div>

          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end">
            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-gray-900 text-white font-bold rounded-xl shadow-md hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isSaving ? "Saving Updates..." : "Save Profile Details"}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}