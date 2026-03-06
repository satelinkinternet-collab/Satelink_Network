
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
import { AppShell } from "@/components/layout/AppShell";
import { BetaFeedbackButton } from "@/components/beta/BetaFeedbackButton";
import { BackupNudge } from "@/components/auth/BackupNudge";
import { SigningGuard } from "@/components/auth/SigningGuard";

export const metadata: Metadata = {
  title: "Satelink MVP Dashboard",
  description: "Production-grade dashboard for Satelink Network",
};

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
          <AppShell>
            {children}
          </AppShell>
          <BackupNudge />
          <BetaFeedbackButton />
          <SigningGuard />
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
