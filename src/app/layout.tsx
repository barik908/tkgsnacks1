import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "TKG Snacks - ঠাকুরগাঁওয়ের সেরা ফুড ডেলিভারি",
  description: "ঠাকুরগাঁও শহরে সেরা রেস্টুরেন্ট থেকে ঘরে বসে খাবার অর্ডার করুন।",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
