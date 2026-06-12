// app/layout.tsx
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer"; // 🔥 Footer import kiya gaya hai
import { Toaster } from "react-hot-toast";

// Poppins font configure kar rahe hain (Apple-like clean typography)
const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Democratic Social Alliance | Better Lives. Better India.",
  description: "Join the movement for Human Development over statistics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-sans antialiased flex flex-col min-h-screen`}>
        <Navbar />
        {/* Main content Navbar ke niche aayega */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <Footer /> {/* 🔥 Global Footer yahan add kiya hai */}
        <Toaster position="bottom-right" toastOptions={{ duration: 4000, style: { borderRadius: '16px', fontWeight: 'bold' } }} />
      </body>
    </html>
  );
}