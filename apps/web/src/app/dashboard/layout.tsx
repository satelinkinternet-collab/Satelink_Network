import { ReactNode } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopStatusBar from '@/components/dashboard/TopStatusBar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Status Bar */}
        <TopStatusBar />

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-950/50">
          {children}
        </main>
      </div>
    </div>
  );
}
