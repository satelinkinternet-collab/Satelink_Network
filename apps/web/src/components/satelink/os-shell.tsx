"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChartLine,
  Cpu,
  Database,
  Globe2,
  LayoutDashboard,
  Menu,
  Receipt,
  Rocket,
  Settings,
  Key,
  X,
  Wallet,
  Command,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CommandPalette } from "@/components/satelink/command-palette";
import { SatelinkRealtimeProvider } from "@/components/satelink/realtime-provider";
import { StatusDot, InfraSkeleton } from "@/components/ui/satelink-ui";

interface NetworkStatus {
  status: string;
  nodes_online: number;
  current_epoch: number;
  total_requests_24h: number;
  avg_latency_ms: number;
}

const navGroups = [
  {
    label: "Infrastructure",
    items: [
      {
        href: "/satelink/os/overview",
        label: "Overview",
        icon: LayoutDashboard,
      },
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
      { href: "/satelink/os/withdraw", label: "Withdraw", icon: Wallet },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/satelink/os/api-keys", label: "API Keys", icon: Key },
      { href: "/satelink/os/settings", label: "Settings", icon: Settings },
      {
        href: "/satelink/os/notifications",
        label: "Notifications",
        icon: Bell,
      },
    ],
  },
];

export function SatelinkOsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [epochCountdown, setEpochCountdown] = useState(60);
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [nodeId, setNodeId] = useState<string | null>(null);

  // Fetch network status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("https://rpc.satelink.network/api/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({
        status: "operational",
        nodes_online: 1,
        current_epoch: 0,
        total_requests_24h: 0,
        avg_latency_ms: 85,
      });
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    const storedNodeId = localStorage.getItem("satelink_node_id");
    if (storedNodeId) setNodeId(storedNodeId);
  }, []);

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
        timeout = setTimeout(() => {
          awaitingSecond = false;
        }, 1200);
        return;
      }

      if (!awaitingSecond) return;
      awaitingSecond = false;
      if (timeout) clearTimeout(timeout);

      const routes: Record<string, string> = {
        o: "/satelink/os/overview",
        n: "/satelink/os/nodes",
        d: "/satelink/os/deployments",
        a: "/satelink/os/analytics",
        s: "/satelink/os/settings",
        q: "/satelink/os/queue",
      };
      if (routes[key]) router.push(routes[key]);
    };

    window.addEventListener("keydown", handle);
    return () => {
      window.removeEventListener("keydown", handle);
      if (timeout) clearTimeout(timeout);
    };
  }, [router]);

  const NavItem = ({
    href,
    label,
  }: {
    href: string;
    label: string;
    icon: React.ElementType;
  }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-2.5 px-4 py-1.5 text-[11px] font-medium transition-all duration-100 border-r-2 ${
          isActive
            ? "bg-[#0f2219] text-[#B0E4CC] border-[#408A71]"
            : "text-[#408A71] border-transparent hover:bg-[#0c1a17] hover:text-[#B0E4CC]"
        }`}
      >
        <StatusDot status={isActive ? "online" : "offline"} />
        {label}
      </Link>
    );
  };

  return (
    <>
      <div className="min-h-screen bg-[#091413] text-[#B0E4CC]">
        {/* Top Nav Bar - 48px */}
        <header className="h-12 border-b border-[#1a3028] bg-[#091413] flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/satelink" className="flex items-center gap-2 group">
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-[#408A71]"
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(64,138,113,0.4)",
                    "0 0 0 6px rgba(64,138,113,0)",
                    "0 0 0 0 rgba(64,138,113,0.4)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-[13px] font-semibold text-[#B0E4CC] tracking-tight group-hover:text-white transition-colors">
                SATELINK
              </span>
            </Link>
            <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-[#0f2219] text-[#408A71] border border-[#285A48] uppercase tracking-[0.1em]">
              BETA
            </span>
            <span className="hidden md:inline-flex text-[8px] font-semibold px-1.5 py-0.5 rounded bg-[#0c1a17] text-[#00D1FF] border border-[#1a3028] uppercase tracking-[0.1em]">
              POLYGON
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#1a3028] bg-[#0c1a17] text-[10px] text-[#408A71] hover:border-[#285A48] transition-colors">
              <Command className="w-3 h-3" />
              <span>K</span>
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#408A71] text-[#091413] text-[10px] font-semibold hover:bg-[#4fa07f] transition-colors"
            >
              <Wallet className="w-3 h-3" />
              Claim USDT
            </motion.button>
            <button
              className="lg:hidden p-1.5 text-[#408A71] hover:text-[#B0E4CC] transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>
        </header>

        {/* Status Bar - 36px */}
        <div className="h-9 border-b border-[#1a3028] bg-[#0c1a17] flex items-center px-4 text-[10px] overflow-x-auto">
          <div className="flex items-center gap-4 min-w-max">
            <div className="flex items-center gap-1.5 pr-4 border-r border-[#1a3028]">
              <StatusDot
                status={status?.status === "operational" ? "online" : "pending"}
              />
              <span className="text-[#B0E4CC] font-medium">
                {status ? (
                  status.status === "operational" ? (
                    "Operational"
                  ) : (
                    status.status
                  )
                ) : (
                  <InfraSkeleton className="w-16 h-3" />
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5 pr-4 border-r border-[#1a3028]">
              <span className="text-[#285A48]">Epoch</span>
              <span className="font-mono text-[#00D1FF]">
                #{status?.current_epoch ?? "—"}
              </span>
              <motion.span
                key={epochCountdown}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                className="font-mono text-[#408A71]"
              >
                ({epochCountdown}s)
              </motion.span>
            </div>
            <div className="flex items-center gap-1.5 pr-4 border-r border-[#1a3028]">
              <span className="text-[#285A48]">Nodes</span>
              <span className="font-mono text-[#B0E4CC]">
                {status?.nodes_online ?? "—"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 pr-4 border-r border-[#1a3028]">
              <span className="text-[#285A48]">Latency</span>
              <span className="font-mono text-[#408A71]">
                {status?.avg_latency_ms ?? "—"}ms
              </span>
            </div>
            <div className="flex items-center gap-1.5 pr-4 border-r border-[#1a3028]">
              <span className="text-[#285A48]">24h</span>
              <span className="font-mono text-[#B0E4CC]">
                {status?.total_requests_24h?.toLocaleString() ?? "—"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#285A48]">Chain</span>
              <span className="font-mono text-[#00D1FF]">Polygon 137</span>
            </div>
          </div>
        </div>

        <div className="flex" style={{ height: "calc(100vh - 84px)" }}>
          {/* Sidebar - 200px */}
          <AnimatePresence>
            {(mobileOpen || true) && (
              <motion.aside
                initial={{ x: -200, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -200, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className={`
                  ${mobileOpen ? "block" : "hidden"} lg:block
                  w-[200px] flex-shrink-0 border-r border-[#1a3028] bg-[#091413] pt-4 overflow-y-auto
                  flex flex-col
                `}
              >
                <div className="flex-1">
                  {navGroups.map((group) => (
                    <div key={group.label} className="mb-5">
                      <div className="px-4 mb-2 text-[9px] font-semibold text-[#285A48] uppercase tracking-[0.12em]">
                        {group.label}
                      </div>
                      <nav className="space-y-0.5">
                        {group.items.map((item) => (
                          <NavItem key={item.href} {...item} />
                        ))}
                      </nav>
                    </div>
                  ))}
                </div>

                {/* Bottom: Node status */}
                <div className="mt-auto mx-3 mb-4 p-3 rounded border border-[#1a3028] bg-[#0c1a17]">
                  {nodeId ? (
                    <>
                      <div className="flex items-center gap-1.5 mb-1">
                        <StatusDot status="online" />
                        <span className="text-[9px] text-[#408A71] uppercase tracking-wider font-medium">
                          Your Node
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-[#B0E4CC] break-all">
                        {nodeId}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[9px] text-[#285A48] uppercase tracking-wider mb-1">
                        RPC Endpoint
                      </div>
                      <div className="text-[10px] font-mono text-[#408A71] break-all">
                        rpc.satelink.network
                      </div>
                    </>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-5 bg-[#091413]">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
