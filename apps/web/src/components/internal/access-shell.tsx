"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, KeyRound, ScrollText, Bot, ChevronRight } from "lucide-react";

const navItems = [
  { href: "/internal/access", label: "Overview", icon: Shield },
  { href: "/internal/access/tokens", label: "Tokens", icon: KeyRound },
  { href: "/internal/access/audit", label: "Audit", icon: ScrollText },
  { href: "/internal/access/agents", label: "Agents", icon: Bot },
];

export function InternalAccessShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#08110f] text-[#b0e4cc]">
      <div className="border-b border-[#17342a] bg-[radial-gradient(circle_at_top_left,_rgba(0,209,255,0.14),_transparent_36%),linear-gradient(180deg,#0d1b18_0%,#08110f_100%)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#5fb79a]">Internal Only</p>
            <h1 className="mt-1 text-xl font-semibold text-white">Satelink Machine Access</h1>
            <p className="mt-1 max-w-2xl text-sm text-[#8ecfb4]">
              Scoped machine identity, observability access, preview deployment control, and chained audit enforcement.
            </p>
          </div>
          <div className="rounded-full border border-[#244b3d] bg-[#0d1a17]/90 px-3 py-1 text-[11px] font-medium text-[#9fe2c6]">
            Machine Identity + Infrastructure Authorization Layer
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[#17342a] bg-[#0b1714]/80 p-3">
          <div className="mb-3 px-3 text-[10px] uppercase tracking-[0.18em] text-[#4a8b74]">Control Plane</div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                    active
                      ? "border-[#3d7d66] bg-[#10211c] text-white"
                      : "border-transparent text-[#8ecfb4] hover:border-[#1f4337] hover:bg-[#0f1d19]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  <ChevronRight className={`h-4 w-4 ${active ? "text-[#00d1ff]" : "text-[#3d7d66]"}`} />
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 rounded-xl border border-[#1f4337] bg-[#091413] p-3 text-xs text-[#79b89f]">
            <p className="font-semibold text-[#d6fff0]">Security defaults</p>
            <p className="mt-2">Hashed token storage, scoped permissions, replay-protected writes, and production approval gates.</p>
          </div>
        </aside>

        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
