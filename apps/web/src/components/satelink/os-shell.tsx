"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChartLine, Cpu, Database, FolderKanban, Globe2, LayoutDashboard, Menu, Receipt, Rocket, Settings, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/satelink/command-palette";
import { SatelinkRealtimeProvider } from "@/components/satelink/realtime-provider";
import { RuntimeStatusBar } from "@/components/satelink/runtime-status-bar";
import { Button } from "@/components/ui/button";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

const nav = [
  { href: "/satelink/os/overview", label: "Overview", icon: LayoutDashboard, keyHint: "G O" },
  { href: "/satelink/os/nodes", label: "Nodes", icon: Cpu, keyHint: "G N" },
  { href: "/satelink/os/deployments", label: "Deployments", icon: Rocket, keyHint: "G D" },
  { href: "/satelink/os/network", label: "Network", icon: Globe2, keyHint: "G W" },
  { href: "/satelink/os/analytics", label: "Analytics", icon: ChartLine, keyHint: "G A" },
  { href: "/satelink/os/queue", label: "Queue", icon: Database, keyHint: "G Q" },
  { href: "/satelink/os/projects", label: "Projects", icon: FolderKanban, keyHint: "G P" },
  { href: "/satelink/os/settings", label: "Settings", icon: Settings, keyHint: "G S" },
  { href: "/satelink/os/billing", label: "Billing", icon: Receipt, keyHint: "G B" },
  { href: "/satelink/os/team", label: "Team", icon: Users, keyHint: "G T" },
  { href: "/satelink/os/notifications", label: "Notifications", icon: Bell, keyHint: "G I" },
];

export function SatelinkOsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const activeEnvironment = useInfrastructureStore((s) => s.activeEnvironment);
  const setActiveEnvironment = useInfrastructureStore((s) => s.setActiveEnvironment);
  const activeProjectId = useInfrastructureStore((s) => s.activeProjectId);
  const setActiveProject = useInfrastructureStore((s) => s.setActiveProject);
  const projects = useInfrastructureStore((s) => s.projects);

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

      if (key === "d") router.push("/satelink/os/deployments");
      if (key === "n") router.push("/satelink/os/nodes");
      if (key === "a") router.push("/satelink/os/analytics");
    };

    window.addEventListener("keydown", handle);
    return () => {
      window.removeEventListener("keydown", handle);
      if (timeout) clearTimeout(timeout);
    };
  }, [router]);

  return (
    <SatelinkRealtimeProvider>
      <CommandPalette />
      <main className="min-h-screen bg-[#091413] text-[#B0E4CC]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 lg:hidden">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#408A71]">Satelink OS</p>
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen((v) => !v)} aria-label="Toggle navigation">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid min-h-[calc(100vh-57px)] grid-cols-1 lg:min-h-screen lg:grid-cols-[250px_1fr]">
          <aside className={`${open ? "block" : "hidden"} border-r border-white/10 bg-[#07100f] p-4 lg:block`}>
            <p className="px-2 py-3 text-sm uppercase tracking-[0.2em] text-[#408A71]">Satelink OS</p>
            <nav className="space-y-1">
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-[#285A48] text-white" : "hover:bg-white/5"}`}
                  >
                    <span className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <span className="text-[10px] text-[#B0E4CC]/55">{item.keyHint}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
          <section className="p-4 md:p-6 lg:p-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <select
                  aria-label="Select project"
                  className="rounded-md border border-white/10 bg-[#0b1716] px-2 py-1 text-xs"
                  value={activeProjectId}
                  onChange={(e) => setActiveProject(e.target.value)}
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Select environment"
                  className="rounded-md border border-white/10 bg-[#0b1716] px-2 py-1 text-xs"
                  value={activeEnvironment}
                  onChange={(e) => setActiveEnvironment(e.target.value as "dev" | "staging" | "production")}
                >
                  <option value="dev">development</option>
                  <option value="staging">staging</option>
                  <option value="production">production</option>
                </select>
              </div>
              <p className="text-[11px] text-[#B0E4CC]/55">Scoped to project + environment</p>
            </div>
            <RuntimeStatusBar />
            {children}
          </section>
        </div>
      </main>
    </SatelinkRealtimeProvider>
  );
}
