"use client";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { CTAButton } from "@/components/ui/CTAButton";
import { FeatureGrid } from "@/components/sections/FeatureGrid";
import { StepFlow } from "@/components/sections/StepFlow";
import { ArchitectureDiagram } from "@/components/animations/ArchitectureDiagram";
import { MetricCard } from "@/components/metrics/MetricCard";
import { ArrowRight, Server, Shield, Coins, Zap, BarChart, Activity, AlertTriangle } from "lucide-react";
import { useNetworkStats } from "@/hooks/useNetworkStats";
import { useNetworkHealth } from "@/hooks/useNetworkHealth";

export default function Homepage() {
  const { stats, isLoading: statsLoading } = useNetworkStats();
  const { health } = useNetworkHealth();
  return (
    <MarketingLayout>
      {/* Health Alert Banner */}
      {health && health.alerts > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex items-center justify-center gap-3 text-amber-500 text-sm font-medium z-50 relative">
          <AlertTriangle className="w-4 h-4" />
          Network degraded: {health.alerts} active alert{health.alerts > 1 ? 's' : ''}. Check the health dashboard for diagnostics.
        </div>
      )}

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15)_0%,transparent_50%)] -z-10" />
        <div className="container mx-auto px-6 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#111111] border border-[#262626] text-sm text-zinc-300 mb-8 fade-in">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Mainnet Beta is Live
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-8 fade-in" style={{ animationDelay: '0.1s' }}>
            Revenue-backed <br className="hidden md:block" /> verifiable infrastructure.
          </h1>
          <p className="text-xl md:text-2xl text-muted mb-10 max-w-3xl mx-auto leading-relaxed fade-in" style={{ animationDelay: '0.2s' }}>
            Satelink is a decentralized execution environment powered by real sustainable yield, not inflationary emissions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-in" style={{ animationDelay: '0.3s' }}>
            <CTAButton href="/run-node" variant="primary">
              Deploy a Node <ArrowRight className="w-5 h-5 ml-2" />
            </CTAButton>
            <CTAButton href="/developers" variant="secondary">
              Read Documentation
            </CTAButton>
          </div>
        </div>
      </section>

      {/* Problem Section: Emission vs Revenue */}
      <SectionContainer className="border-t border-border bg-[#0A0A0A]">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">The infrastructure model is broken.</h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Traditional decentralized networks rely on infinite token emissions to subsidize nodes. When the emissions stop, the network dies.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="p-8 rounded-3xl border border-red-500/20 bg-red-500/5 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
              <BarChart className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">The Old Way</h3>
            <p className="text-muted">Dependent on inflationary token rewards. Unstainable long-term economic model.</p>
          </div>
          <div className="p-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
              <Coins className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Satelink Way</h3>
            <p className="text-muted">Nodes are backed by real protocol revenue. A sustainable, deflationary economic model.</p>
          </div>
        </div>
      </SectionContainer>

      {/* Solution Section */}
      <SectionContainer className="bg-[#111111]">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Built for production workloads.</h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            A modular network designed to execute, verify, and settle computations with enterprise-grade reliability.
          </p>
        </div>
        <FeatureGrid
          features={[
            {
              title: "Verifiable Execution",
              description: "Every task is cryptographically signed and verified by the settlement engine before state transitions are finalized.",
              icon: <Shield className="w-6 h-6 text-blue-400" />
            },
            {
              title: "Revenue Distribution",
              description: "50% of all protocol revenue is automatically routed to active infrastructure operators algorithmically.",
              icon: <Coins className="w-6 h-6 text-emerald-400" />
            },
            {
              title: "High Performance",
              description: "Optimized Rust-based node execution client capable of handling thousands of requests per second.",
              icon: <Zap className="w-6 h-6 text-amber-400" />
            }
          ]}
        />
      </SectionContainer>

      {/* How It Works Section */}
      <SectionContainer className="border-t border-border">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">How Satelink Works</h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Three simple steps to participate in the decentralized infrastructure layer.
          </p>
        </div>
        <div className="max-w-4xl mx-auto">
          <StepFlow
            steps={[
              {
                number: "1",
                title: "Register Node",
                description: "Deploy the Satelink client and register your node on the network registry with your public wallet."
              },
              {
                number: "2",
                title: "Process Workloads",
                description: "Validate transactions, serve API requests, and execute enterprise workloads assigned to you."
              },
              {
                number: "3",
                title: "Earn Revenue",
                description: "Receive your proportionate share of network revenue directly to your wallet every settlement epoch."
              }
            ]}
          />
        </div>
      </SectionContainer>

      {/* Architecture Preview */}
      <SectionContainer className="bg-[#111111] overflow-hidden">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Network Architecture</h2>
          <p className="text-lg text-muted max-w-2xl mx-auto mb-12">
            A real-time look into the settlement layer and execution clients.
          </p>
        </div>
        <ArchitectureDiagram />
      </SectionContainer>

      {/* Network Metrics Widget */}
      <SectionContainer className="border-t border-border">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Network Status</h2>
            <p className="text-lg text-muted">Live metrics from the Satelink Settlement Engine</p>
          </div>
          <CTAButton href="/network" variant="outline" className="mt-6 md:mt-0">
            View Explorer
          </CTAButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard
            title="Total Nodes"
            value={statsLoading ? "—" : (stats?.totalNodes?.toLocaleString() || 0)}
            icon={<Server className="w-5 h-5" />}
          />
          <MetricCard
            title="Active Nodes"
            value={statsLoading ? "—" : (stats?.activeNodes?.toLocaleString() || 0)}
            icon={<Activity className="w-5 h-5 text-emerald-400" />}
          />
          <MetricCard
            title="Current Epoch"
            value={statsLoading ? "—" : (stats?.currentEpoch?.toLocaleString() || 0)}
            icon={<Zap className="w-5 h-5" />}
          />
          <MetricCard
            title="Total Revenue (USDT)"
            value={statsLoading ? "—" : (stats?.totalRevenueUsdt !== undefined ? `$${stats.totalRevenueUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : "$0")}
            icon={<Coins className="w-5 h-5 text-amber-400" />}
          />
          <MetricCard
            title="Tasks Processed"
            value={statsLoading ? "—" : (stats?.totalOpsProcessed?.toLocaleString() || 0)}
            icon={<BarChart className="w-5 h-5 text-blue-400" />}
          />
        </div>
      </SectionContainer>

      {/* Audience Section */}
      <SectionContainer className="bg-[#111111]">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Who is Satelink for?</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-card border border-border rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Node Operators</h3>
            <p className="text-sm text-muted mb-4">Run decentralized infrastructure and earn real protocol revenue.</p>
            <a href="/run-node" className="text-blue-400 text-sm font-medium hover:text-blue-300">Learn more →</a>
          </div>
          <div className="p-6 bg-card border border-border rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Developers</h3>
            <p className="text-sm text-muted mb-4">Build powerful dApps utilizing verifiable infrastructure.</p>
            <a href="/developers" className="text-blue-400 text-sm font-medium hover:text-blue-300">Learn more →</a>
          </div>
          <div className="p-6 bg-card border border-border rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Enterprises</h3>
            <p className="text-sm text-muted mb-4">White-label infra modules with guaranteed uptime.</p>
            <a href="/enterprise" className="text-blue-400 text-sm font-medium hover:text-blue-300">Learn more →</a>
          </div>
          <div className="p-6 bg-card border border-border rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Investors</h3>
            <p className="text-sm text-muted mb-4">Understand the sustainable tokenomics and yield model.</p>
            <a href="/investors" className="text-blue-400 text-sm font-medium hover:text-blue-300">Learn more →</a>
          </div>
        </div>
      </SectionContainer>

      {/* Final CTA Banner */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-6 max-w-4xl text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight">Ready to join the network?</h2>
          <p className="text-xl text-zinc-300 mb-10 max-w-2xl mx-auto">
            Start running a node today and become part of the fastest growing verifiable infrastructure layer.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <CTAButton href="/run-node" className="px-8 py-4 text-lg">
              Run a Node
            </CTAButton>
            <CTAButton href="/contact" variant="outline" className="px-8 py-4 text-lg">
              Contact Sales
            </CTAButton>
          </div>
        </div>
      </section>

    </MarketingLayout>
  );
}
