"use client";

import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { useNetworkStats } from "@/hooks/useNetworkStats";
import { useSettlementMode } from "@/hooks/useSettlementMode";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { MetricCard } from "@/components/metrics/MetricCard";
import { AnimatedNodeCard } from "@/components/animations/AnimatedNodeCard";
import { Server, Activity, Coins, ArrowRightLeft } from "lucide-react";

export default function NetworkPage() {
    const { stats, isLoading: statsLoading } = useNetworkStats();
    const { modeData } = useSettlementMode();

    return (
        <MarketingLayout>
            <SectionContainer className="pt-32">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 flex items-center gap-4">
                    <span className="relative flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500"></span>
                    </span>
                    Live Network Stats
                </h1>
                <p className="text-xl text-muted mb-12 max-w-3xl">
                    Real-time diagnostics and node tracking directly from the primary execution gateway.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    <MetricCard title="Active Nodes" value={statsLoading ? "—" : (stats?.activeNodes || 0)} trend="Live" icon={<Server className="w-5 h-5" />} />
                    <MetricCard title="Total Revenue (USDT)" value={statsLoading ? "—" : (stats?.totalRevenueUsdt !== undefined ? `$${stats.totalRevenueUsdt.toLocaleString()}` : "$0")} trend="Yield Aggregating" icon={<Coins className="w-5 h-5" />} />
                    <MetricCard title="Current Epoch" value={statsLoading ? "—" : (stats?.currentEpoch || 0)} icon={<Activity className="w-5 h-5" />} />
                    <MetricCard title="Tasks Processed" value={statsLoading ? "—" : (stats?.totalOpsProcessed?.toLocaleString() || 0)} icon={<ArrowRightLeft className="w-5 h-5" />} />
                </div>

                <div className="mb-20">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Active Node Registry (Beta)</h2>
                        <div className="px-3 py-1 bg-surface border border-border rounded-full text-xs font-mono text-zinc-400">
                            Mode: {modeData ? modeData.mode : 'Syncing...'}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {/* Displaying some mock registered nodes */}
                        {Array.from({ length: 18 }).map((_, i) => (
                            <AnimatedNodeCard
                                key={i}
                                id={`STL-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`}
                                status={Math.random() > 0.1 ? 'active' : 'syncing'}
                                delay={i * 0.05}
                            />
                        ))}
                    </div>
                </div>
            </SectionContainer>
        </MarketingLayout>
    );
}
