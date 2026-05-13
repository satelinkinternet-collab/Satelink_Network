"use client";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;


import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { ArrowRight, ExternalLink, Github, Radar, Satellite, Server, Twitter, Wallet, Activity, Clock, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NetworkGlobe } from "@/components/satelink/network-globe";
import { InfrastructureEditor } from "@/components/satelink/infrastructure-editor";
import { StatusDot } from "@/components/ui/satelink-ui";

interface LiveStatus {
  nodes_online: number;
  current_epoch: number;
  total_requests_24h: number;
  status: string;
  avg_latency_ms: number;
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

export default function SatelinkLandingPage() {
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("https://rpc.satelink.network/api/status");
        if (res.ok) {
          setLiveStatus(await res.json());
        }
      } catch {
        setLiveStatus({
          nodes_online: 1,
          current_epoch: 0,
          total_requests_24h: 0,
          status: "operational",
          avg_latency_ms: 85,
        });
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#091413] text-[#B0E4CC] overflow-hidden">
      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-6 pb-16 pt-12">
        {/* Background gradient orbs */}
        <div className="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-[#408A71] opacity-[0.08] blur-[120px]" />
        <div className="pointer-events-none absolute -top-20 right-1/4 h-72 w-72 rounded-full bg-[#00D1FF] opacity-[0.05] blur-[100px]" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="relative mb-16 rounded-2xl border border-[#1a3028] bg-[#0c1a17]/80 p-8 backdrop-blur-xl md:p-12"
        >
          <motion.div variants={fadeUp}  className="mb-4 flex items-center gap-2">
            <StatusDot status="online" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#408A71] font-semibold">
              Satelink Infrastructure OS
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
                        className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-6xl"
          >
            Deploy infrastructure globally with a{" "}
            <span className="text-[#00D1FF] drop-shadow-[0_0_20px_rgba(0,209,255,0.3)]">
              decentralized connectivity layer
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
                        className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[#408A71]"
          >
            Build on the Satelink Network with visual orchestration, realtime telemetry, and global node routing for compute, API, queue, and satellite-grade links.
          </motion.p>

          <motion.div variants={fadeUp}  className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="bg-[#408A71] hover:bg-[#4fa07f] text-[#091413] font-semibold">
              <Link href="/satelink/os">
                Launch Infrastructure OS
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-[#285A48] bg-transparent text-[#B0E4CC] hover:bg-[#0f2219] hover:border-[#408A71]">
              <Link href="/dashboard">Open Dashboard</Link>
            </Button>
          </motion.div>

          {/* Live metrics strip */}
          {liveStatus && (
            <motion.div
              variants={fadeUp}
                            className="mt-8 flex flex-wrap items-center gap-4 border-t border-[#1a3028] pt-6 text-[11px]"
            >
              <div className="flex items-center gap-1.5">
                <StatusDot status="online" />
                <span className="text-[#B0E4CC]">{liveStatus.nodes_online} nodes</span>
              </div>
              <span className="text-[#285A48]">·</span>
              <div className="font-mono text-[#00D1FF]">Epoch #{liveStatus.current_epoch}</div>
              <span className="text-[#285A48]">·</span>
              <div className="text-[#408A71]">{liveStatus.total_requests_24h.toLocaleString()} req/24h</div>
              <span className="text-[#285A48]">·</span>
              <div className="text-[#408A71]">{liveStatus.avg_latency_ms}ms avg</div>
            </motion.div>
          )}
        </motion.div>

        {/* Globe + Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="grid gap-5 lg:grid-cols-2"
        >
          <NetworkGlobe />
          <div className="rounded-2xl border border-[#1a3028] bg-[#0c1a17] p-5">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#285A48]">
              Live Network Metrics
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Nodes Online", value: String(liveStatus?.nodes_online || 1), delta: "ap-south-1, us-west-2" },
                { label: "Current Epoch", value: `#${liveStatus?.current_epoch || 0}`, delta: "60s settlement" },
                { label: "Requests 24h", value: (liveStatus?.total_requests_24h || 0).toLocaleString(), delta: "RPC + API" },
                { label: "Avg Latency", value: `${liveStatus?.avg_latency_ms || 85}ms`, delta: "p95 < 150ms" },
              ].map((metric, i) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="rounded-lg border border-[#1a3028] bg-[#091413] p-4 hover:border-[#285A48] transition-colors"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#285A48]">{metric.label}</p>
                  <p className="mt-1.5 text-xl font-semibold font-mono text-[#B0E4CC]">{metric.value}</p>
                  <p className="mt-0.5 text-[10px] text-[#285A48]">{metric.delta}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Infrastructure Editor */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mb-2 text-xl font-semibold text-[#B0E4CC] md:text-2xl">Visual Infrastructure Orchestration</h2>
          <p className="mb-6 text-[13px] text-[#408A71]">Drag-and-drop deployment graphs with real-time node routing</p>
          <InfrastructureEditor />
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-12 md:grid-cols-3">
        {[
          { icon: Satellite, title: "Decentralized Connectivity", text: "Orbital-aware routing and regional relay balancing for resilient global delivery." },
          { icon: Server, title: "Realtime Deployment Engine", text: "Ship compute graphs with queue, API gateway, storage, and GPU orchestration." },
          { icon: Radar, title: "Enterprise Monitoring", text: "Observe infra health, latency, and node economics with live events." },
        ].map((item, i) => (
          <motion.article
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="group rounded-xl border border-[#1a3028] bg-[#0c1a17] p-5 hover:border-[#285A48] transition-colors"
          >
            <item.icon className="h-5 w-5 text-[#00D1FF]" />
            <h3 className="mt-3 text-[14px] font-medium text-[#B0E4CC]">{item.title}</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[#408A71]">{item.text}</p>
          </motion.article>
        ))}
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h2 className="mb-6 text-center text-xl font-semibold text-[#B0E4CC] md:text-2xl">Core Capabilities</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Wallet, title: "Revenue Intelligence", desc: "Real-time USDT earnings per epoch" },
            { icon: Activity, title: "Node Operations", desc: "Health monitoring & reputation scoring" },
            { icon: Clock, title: "Settlement Protocol", desc: "On-chain USDT claims on Polygon" },
            { icon: Cpu, title: "Autonomous Ops", desc: "Epoch scheduler & revenue sentinel" },
          ].map((cap, i) => (
            <motion.article
              key={cap.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="rounded-xl border border-[#1a3028] bg-[#0c1a17] p-4 hover:border-[#285A48] transition-colors"
            >
              <cap.icon className="h-5 w-5 text-[#00D1FF]" />
              <h3 className="mt-2.5 text-[13px] font-medium text-[#B0E4CC]">{cap.title}</h3>
              <p className="mt-1 text-[11px] text-[#408A71]">{cap.desc}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Status Bar */}
      {liveStatus && (
        <section className="border-y border-[#1a3028] bg-[#0c1a17] py-3">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-5 px-6 text-[11px]">
            <div className="flex items-center gap-1.5">
              <StatusDot status={liveStatus.status === "operational" ? "online" : "pending"} />
              <span className="text-[#B0E4CC]">
                {liveStatus.status === "operational" ? "All Systems Operational" : liveStatus.status}
              </span>
            </div>
            <span className="text-[#1a3028]">|</span>
            <span className="text-[#408A71]">{liveStatus.nodes_online} nodes online</span>
            <span className="text-[#1a3028]">|</span>
            <span className="font-mono text-[#00D1FF]">Epoch #{liveStatus.current_epoch}</span>
            <span className="text-[#1a3028]">|</span>
            <span className="text-[#408A71]">Polygon Network</span>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-[#1a3028] bg-[#091413]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-2.5 h-2.5 rounded-full bg-[#408A71]"
                  animate={{ boxShadow: ["0 0 0 0 rgba(64,138,113,0.4)", "0 0 0 6px rgba(64,138,113,0)", "0 0 0 0 rgba(64,138,113,0.4)"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-[14px] font-semibold text-[#B0E4CC]">SATELINK</span>
              </div>
              <p className="mt-3 text-[11px] text-[#408A71] leading-relaxed">
                Decentralized infrastructure for autonomous machine economies.
              </p>
              <div className="mt-4 flex gap-2">
                <a
                  href="https://github.com/Satelink-Protocol/Satelink_Network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-[#1a3028] p-2 text-[#408A71] hover:border-[#285A48] hover:text-[#B0E4CC] transition-colors"
                >
                  <Github className="h-4 w-4" />
                </a>
                <a
                  href="https://twitter.com/satelinknetwork"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-[#1a3028] p-2 text-[#408A71] hover:border-[#285A48] hover:text-[#B0E4CC] transition-colors"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              </div>
            </div>

            {[
              {
                title: "Product",
                links: [
                  { href: "/satelink/os", label: "Infrastructure OS" },
                  { href: "/dashboard", label: "Dashboard" },
                  { href: "/pricing", label: "Pricing" },
                  { href: "/nodes", label: "Run a Node" },
                ],
              },
              {
                title: "Developers",
                links: [
                  { href: "https://docs.satelink.network", label: "Documentation", external: true },
                  { href: "https://rpc.satelink.network/api/status", label: "API Status", external: true },
                  { href: "/developers", label: "Developer Guide" },
                ],
              },
              {
                title: "Network",
                links: [
                  { href: "/status", label: "System Status" },
                  { href: "/network", label: "Network Map" },
                  { href: "https://polygonscan.com/address/0xE475c53B88190FD2130dB1E37504991EFe283fb0", label: "Smart Contracts", external: true },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#285A48]">{col.title}</p>
                <nav className="mt-3 space-y-2">
                  {col.links.map((link) =>
                    link.external ? (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-[#408A71] hover:text-[#B0E4CC] transition-colors"
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <Link
                        key={link.label}
                        href={link.href}
                        className="block text-[11px] text-[#408A71] hover:text-[#B0E4CC] transition-colors"
                      >
                        {link.label}
                      </Link>
                    )
                  )}
                </nav>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-[#1a3028] pt-6 md:flex-row">
            <p className="text-[10px] text-[#285A48]">
              © {new Date().getFullYear()} Satelink Network. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-[#408A71]">
              <StatusDot status="online" />
              <span>All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
