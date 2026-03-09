import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Satelink Documentation",
  description: "Developer guides and API references for Satelink.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-[#0A0F1C] text-gray-200 h-screen flex overflow-hidden`}
      >
        {/* Sidebar */}
        <aside className="w-64 border-r border-[#1F2937] bg-[#111827] flex flex-col h-full overflow-y-auto hidden md:flex">
          <div className="p-6 border-b border-[#1F2937]">
            <Link href="/" className="text-xl font-bold text-white tracking-widest">
              DOCS
            </Link>
          </div>
          <nav className="p-4 space-y-8 flex-grow">
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">Introduction</h3>
              <ul className="space-y-1">
                <li><Link href="#" className="block px-2 py-1.5 text-sm text-blue-400 font-medium">Getting Started</Link></li>
                <li><Link href="#" className="block px-2 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">Core Concepts</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">API Reference</h3>
              <ul className="space-y-1">
                <li><Link href="#" className="block px-2 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">RPC API</Link></li>
                <li><Link href="#" className="block px-2 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">Automation API</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">Development</h3>
              <ul className="space-y-1">
                <li><Link href="#" className="block px-2 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">SDKs</Link></li>
                <li><Link href="#" className="block px-2 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">Testnet Guide</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">Infrastructure</h3>
              <ul className="space-y-1">
                <li><Link href="#" className="block px-2 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">Node Operator Guide</Link></li>
              </ul>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 h-full overflow-y-auto bg-[#0A0F1C]">
          <div className="max-w-4xl mx-auto px-8 py-12">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}

