import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Satelink Network Status",
  description: "Real-time infrastructure health and performance metrics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-[#0A0F1C] text-gray-200 min-h-screen`}
      >
        <header className="border-b border-[#1F2937] bg-[#111827]">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
              <span className="font-bold text-white tracking-widest text-lg">SATELINK STATUS</span>
            </div>
            <a href="https://satelink.network" className="text-sm text-gray-400 hover:text-white transition-colors">
              &larr; Back to Main Site
            </a>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

