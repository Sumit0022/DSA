// app/admin-login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, ShieldAlert, Eye, EyeOff, Sunrise } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Hardcoded Secure Credentials Matching
    if (username === "Sumit" && password === "@DSAsumitParty") {
      // Setting a secure session cookie that expires in 1 day
      const d = new Date();
      d.setTime(d.getTime() + 1 * 24 * 60 * 60 * 1000);
      document.cookie = `dsa_admin_session=authenticated; expires=${d.toUTCString()}; path=/; SameSite=Strict`;
      
      // Redirecting straight to the command center
      router.push("/admin");
    } else {
      setError("Invalid administrative credentials. Access Denied.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-gray-200/80 rounded-3xl shadow-xl p-8 space-y-6 relative overflow-hidden"
      >
        {/* Subtle Decorative Background Blob */}
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-50 rounded-full blur-2xl"></div>

        {/* LOGO & TITLE */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#007AFF] rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
            <Sunrise className="text-white w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">DSA CommandCenter</h1>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Authorized Personnel Only</p>
        </div>

        {/* ERROR DISPLAY */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border border-red-100 p-3.5 rounded-xl flex items-center gap-3 text-red-600 text-xs font-semibold"
          >
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin Identity</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                required
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:border-[#007AFF] focus:bg-white outline-none transition-all placeholder:text-gray-400 text-gray-900"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Secure Passcode</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:border-[#007AFF] focus:bg-white outline-none transition-all placeholder:text-gray-400 text-gray-900"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl text-sm shadow-md hover:bg-black transition-colors disabled:opacity-50 uppercase tracking-wider mt-2 flex items-center justify-center"
          >
            {isLoading ? "Verifying Keys..." : "Establish Secure Session"}
          </button>

        </form>
      </motion.div>
    </div>
  );
}