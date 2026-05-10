"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChartLine, Cpu, Database, Globe2, LayoutDashboard, Menu, Receipt, Rocket, Settings, Key, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/satelink/command-palette";
import { SatelinkRealtimeProvider } from "@/components/satelink/realtime-provider";
import { RuntimeStatusBar } from "@/components/satelink/runtime-status-bar";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

const navGroups = [
  {
    label: "Infrastructure",
    items: [
      { href: "/satelink/os/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/satelink/os/nodes", label: "Nodes", icon: Cpu },
      { href: "/satelink/os/deployments", label: "Deployments", icon: Rocket },
      { href: "/satelink/os/queue", label: "Queue", icon: Database },
      { href: "/satelink/os/network", label: "Network", icon: Globe2 },
    ],
  },
  {
    label: "Revenue",
    items: [
      { href: "/satelink/os/analytics", label: "Analytics", icon: ChartLine },
      { href: "/satelink/os/billing", label: "Billing", icon: Receipt },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/satelink/os/settings", label: "Settings", icon: Settings },
      { href: "/satelink/os/notifications", label: "Notifications", icon: Bell },
      { href: "/satelink/os/api-keys", label: "API Keys", icon: Key },
    ],
  },
];

export function SatelinkOsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [epochCountdown, setEpochCountdown] = useState(60);

  const activeEnvironment = useInfrastructureStore((s) => s.activeEnvironment);
  const setActiveEnvironment = useInfrastructureStore((s) => s.setActiveEnvironment);

  useEffect(() => {
    const timer = setInterval(() => {
      setEpochCountdown((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let awaitingSecond = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const handle = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "k") return;

      if (!awaitingSecond && key === "g") {
        awaitingSecond = true;
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => { awaitingSecond = false; }, 1200);
        return;
      }

      if (!awaitingSecond) return;
      awaitingSecond = false;
      if (timeout) clearTimeout(timeout);

      if (key === "o") router.push("/satelink/os/overview");
      if (key === "n") router.push("/satelink/os/nodes");
      if (key === "d") router.push("/satelink/os/deployments");
      if (key === "a") router.push("/satelink/os/analytics");
      if (key === "s") router.push("/satelink/os/settings");
    };

    window.addEventListener("keydown", handle);
    return () => {
      window.removeEventListener("keydown", handle);
      if (timeout) clearTimeout(timeout);
    };
  }, [router]);

  const NavItem = ({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium transition-all duration-100 rounded-none border-r-2 ${
          isActive
            ? 'bg-[#0f2219] text-[#b0e4cc] border-[#408a71]'
            : 'text-[#408a71] border-transparent hover:bg-[#0f1e17] hover:text-[#b0e4cc]'
        }`}
      >
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-[#408a71]' : 'bg-[#285a48]'}`} />
        {label}
      </Link>
    );
  };

  return (
    <SatelinkRealtimeProvider>
      <CommandPalette />
      <div className="min-h-screen bg-[#0b0e0d] text-[#b0e4cc]">
        {/* Top Nav Bar - 48px */}
        <header className="h-12 border-b border-[#1a2e25] bg-[#0b0e0d] flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/satelink" className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#408a71] dot-pulse" />
              <span className="text-[13px] font-semibold text-[#b0e4cc] tracking-tight">SATELINK</span>
            </Link>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#285a48]/30 text-[#408a71] uppercase tracking-wider">BETA</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-[11px]">
              <span className="text-[#285a48]">Epoch</span>
              <span className="font-mono text-[#00d1ff]">{epochCountdown}s</span>
            </div>
            <select
              aria-label="Environment"
              value={activeEnvironment}
              onChange={(e) => setActiveEnvironment(e.target.value as "dev" | "staging" | "production")}
              className="text-[10px] px-2 py-1 rounded border border-[#1a2e25] bg-[#0d1a14] text-[#408a71] font-medium"
            >
              <option value="production">production</option>
              <option value="staging">staging</option>
              <option value="dev">development</option>
            </select>
            <button className="btn-primary text-[10px] px-3 py-1">
              Claim USDT
            </button>
            <button
              className="lg:hidden p-1.5 text-[#408a71] hover:text-[#b0e4cc]"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <div className="flex" style={{ height: 'calc(100vh - 48px)' }}>
          {/* Sidebar - 200px */}
          <aside className={`
            ${mobileOpen ? 'block' : 'hidden'} lg:block
            w-[200px] flex-shrink-0 border-r border-[#1a2e25] bg-[#0b0e0d] pt-4 overflow-y-auto
          `}>
            {navGroups.map((group) => (
              <div key={group.label} className="mb-4">
                <div className="px-4 mb-2 text-[9px] font-semibold text-[#285a48] uppercase tracking-[0.12em]">
                  {group.label}
                </div>
                <nav className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavItem key={item.href} {...item} />
                  ))}
                </nav>
              </div>
            ))}
            <div className="mt-6 mx-3 p-3 rounded border border-[#1a2e25] bg-[#0d1a14]">
              <div className="text-[9px] text-[#285a48] uppercase tracking-wider mb-1">RPC Endpoint</div>
              <div className="text-[10px] font-mono text-[#408a71] break-all">rpc.satelink.network</div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-5">
            <RuntimeStatusBar />
            <div className="mt-4">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SatelinkRealtimeProvider>
  );
}
