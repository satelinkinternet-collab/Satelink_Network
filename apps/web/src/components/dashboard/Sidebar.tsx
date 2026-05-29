'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, LayoutDashboard, Wallet, Database, TerminalSquare } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assumingshadcn-like utils exist, else can use basic clsx

const navItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Economic Engine', href: '/dashboard/economics', icon: Wallet },
  { name: 'Queue & Execution', href: '/dashboard/queue', icon: TerminalSquare },
  { name: 'Node Operator', href: '/dashboard/operator', icon: Database },
  { name: 'System Health', href: '/dashboard/health', icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col border-r border-slate-800 bg-slate-950">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Satelink UI</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                isActive
                  ? 'bg-blue-600/10 text-blue-500'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              <item.icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-blue-500' : 'text-slate-500 group-hover:text-slate-300'
                }`}
              />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Area */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-slate-400 font-medium">System Online</span>
        </div>
      </div>
    </aside>
  );
}
