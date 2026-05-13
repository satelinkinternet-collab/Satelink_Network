export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { ReactNode } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopStatusBar from '@/components/dashboard/TopStatusBar';
import { BetaFeedbackButton } from "@/components/beta/BetaFeedbackButton";
import { BackupNudge } from "@/components/auth/BackupNudge";
import { SigningGuard } from "@/components/auth/SigningGuard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopStatusBar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-950/50">
            {children}
          </main>
        </div>
      </div>
      <BackupNudge />
      <BetaFeedbackButton />
      <SigningGuard />
    </>
  );
}
