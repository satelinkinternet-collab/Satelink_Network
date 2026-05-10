import Link from "next/link";
import { ArrowRight, ExternalLink, Github, Radar, Satellite, Server, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NetworkGlobe } from "@/components/satelink/network-globe";
import { InfrastructureEditor } from "@/components/satelink/infrastructure-editor";
import { landingMetrics } from "@/lib/satelink-data";

export default function SatelinkLandingPage() {
  return (
    <main className="min-h-screen bg-[#091413] text-[#B0E4CC]">
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-12">
        <div className="mb-16 rounded-3xl border border-white/10 bg-black/20 p-8 backdrop-blur-xl md:p-12">
          <p className="mb-4 text-sm uppercase tracking-[0.25em] text-[#408A71]">Satelink Infrastructure OS</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
            Deploy Infrastructure Globally with a decentralized connectivity layer.
          </h1>
          <p className="mt-5 max-w-2xl text-[#B0E4CC]/80">
            Build on the Satelink Network with visual orchestration, realtime telemetry, and global node routing for compute, API, queue, and satellite-grade links.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="bg-[#408A71] hover:bg-[#3b7f68]">
              <Link href="/satelink/os">Launch Infrastructure OS <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="border-[#285A48] bg-transparent">
              <Link href="/dashboard">Open Existing Dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <NetworkGlobe />
          <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
            <p className="mb-4 text-sm uppercase tracking-[0.2em] text-[#408A71]">Live Network Metrics</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {landingMetrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-white/10 bg-[#0b1716] p-4">
                  <p className="text-xs text-[#B0E4CC]/60">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
                  <p className="text-sm text-[#408A71]">{metric.delta}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <h2 className="mb-6 text-2xl font-semibold text-white md:text-3xl">Visual infrastructure orchestration</h2>
        <InfrastructureEditor />
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-12 md:grid-cols-3">
        {[
          { icon: Satellite, title: "Decentralized Connectivity Layer", text: "Orbital-aware routing and regional relay balancing for resilient global delivery." },
          { icon: Server, title: "Realtime Deployment Engine", text: "Ship compute graphs with queue, API gateway, storage, and GPU orchestration in one flow." },
          { icon: Radar, title: "Enterprise Monitoring", text: "Observe infra health, latency, and node economics with live events and intelligent status mapping." },
        ].map((item) => (
          <article key={item.title} className="rounded-2xl border border-white/10 bg-black/20 p-6">
            <item.icon className="h-6 w-6 text-[#00D1FF]" />
            <h3 className="mt-4 text-lg font-medium text-white">{item.title}</h3>
            <p className="mt-2 text-sm text-[#B0E4CC]/75">{item.text}</p>
          </article>
        ))}
      </section>

      <footer className="border-t border-white/10 bg-[#070e0d]">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2">
                <Satellite className="h-6 w-6 text-[#00D1FF]" />
                <span className="text-lg font-semibold text-white">Satelink</span>
              </div>
              <p className="mt-3 text-sm text-[#B0E4CC]/60">
                Decentralized infrastructure for autonomous machine economies.
              </p>
              <div className="mt-4 flex gap-3">
                <a
                  href="https://github.com/Satelink-Protocol/Satelink_Network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-white/10 p-2 text-[#B0E4CC]/60 transition hover:border-[#408A71] hover:text-white"
                  aria-label="GitHub"
                >
                  <Github className="h-4 w-4" />
                </a>
                <a
                  href="https://twitter.com/satelinknetwork"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-white/10 p-2 text-[#B0E4CC]/60 transition hover:border-[#408A71] hover:text-white"
                  aria-label="Twitter"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#408A71]">Product</p>
              <nav className="mt-4 space-y-2">
                <Link href="/satelink/os" className="block text-sm text-[#B0E4CC]/70 hover:text-white">
                  Infrastructure OS
                </Link>
                <Link href="/dashboard" className="block text-sm text-[#B0E4CC]/70 hover:text-white">
                  Dashboard
                </Link>
                <Link href="/pricing" className="block text-sm text-[#B0E4CC]/70 hover:text-white">
                  Pricing
                </Link>
                <Link href="/nodes" className="block text-sm text-[#B0E4CC]/70 hover:text-white">
                  Run a Node
                </Link>
              </nav>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#408A71]">Developers</p>
              <nav className="mt-4 space-y-2">
                <a
                  href="https://docs.satelink.network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-[#B0E4CC]/70 hover:text-white"
                >
                  Documentation <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href="https://rpc.satelink.network/api/status"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-[#B0E4CC]/70 hover:text-white"
                >
                  API Status <ExternalLink className="h-3 w-3" />
                </a>
                <Link href="/developers" className="block text-sm text-[#B0E4CC]/70 hover:text-white">
                  Developer Guide
                </Link>
                <a
                  href="https://github.com/Satelink-Protocol/Satelink_Network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-[#B0E4CC]/70 hover:text-white"
                >
                  GitHub <ExternalLink className="h-3 w-3" />
                </a>
              </nav>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#408A71]">Network</p>
              <nav className="mt-4 space-y-2">
                <Link href="/status" className="block text-sm text-[#B0E4CC]/70 hover:text-white">
                  System Status
                </Link>
                <Link href="/network" className="block text-sm text-[#B0E4CC]/70 hover:text-white">
                  Network Map
                </Link>
                <a
                  href="https://polygonscan.com/address/0xE475c53B88190FD2130dB1E37504991EFe283fb0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-[#B0E4CC]/70 hover:text-white"
                >
                  Smart Contracts <ExternalLink className="h-3 w-3" />
                </a>
                <Link href="/legal/terms" className="block text-sm text-[#B0E4CC]/70 hover:text-white">
                  Terms of Service
                </Link>
              </nav>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 md:flex-row">
            <p className="text-xs text-[#B0E4CC]/50">
              © {new Date().getFullYear()} Satelink Network. All rights reserved.
            </p>
            <div className="flex items-center gap-1 text-xs text-[#B0E4CC]/50">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span>All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
