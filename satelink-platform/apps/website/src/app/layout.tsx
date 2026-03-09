import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Satelink — Decentralized Infrastructure Network",
  description: "RPC, Compute, Automation and Machine APIs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased bg-[#0F172A] text-[#E5E7EB] min-h-screen flex flex-col`}
      >
        <Navbar />
        <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-12 pt-24">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}


