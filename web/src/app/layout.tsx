import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Satelink MVP Dashboard",
  description: "Production-grade dashboard for Satelink Network",
};

import { LayoutShell } from "@/components/layout-shell";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100`}
      >
        <AuthProvider>
          <LayoutShell>
            {children}
          </LayoutShell>
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
