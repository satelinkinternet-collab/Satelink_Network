"use client";

import useSWR from "swr";
import { Activity, Server, LayoutDashboard, DollarSign, CheckCircle2, Zap, Clock } from "lucide-react";

interface NetworkStats {
    active_nodes?: number;
    managed_nodes?: number;
    router_nodes?: number;
    total_revenue_usdt?: number;
    tasks_processed?: number;
    uptime_percent?: number;
    current_epoch?: number;
    settlement_mode?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
});

export function NetworkOverview() {
    const { data: stats, error, isLoading } = useSWR<NetworkStats>('/api/network/stats', fetcher, {
        refreshInterval: 30000,
        revalidateOnFocus: false
    });

    if (error) {
        return (
            <div className="p-6 rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444] flex items-center gap-3">
                <Activity className="h-5 w-5" />
                <span>Failed to load network statistics. Check your connection or the backend status.</span>
            </div>
        );
    }

    const metrics = [
        {
            title: "Active Nodes",
            value: stats?.active_nodes?.toLocaleString() ?? "---",
            icon: Server,
            color: "text-[#3B82F6]",
            bg: "bg-[#3B82F6]/10"
        },
        {
            title: "Managed Nodes",
            value: stats?.managed_nodes?.toLocaleString() ?? "---",
            icon: LayoutDashboard,
            color: "text-[#22C55E]",
            bg: "bg-[#22C55E]/10"
        },
        {
            title: "Router Nodes",
            value: stats?.router_nodes?.toLocaleString() ?? "---",
            icon: Activity,
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        },
        {
            title: "Total Revenue (USDT)",
            value: stats?.total_revenue_usdt !== undefined ? `$${stats.total_revenue_usdt.toLocaleString()}` : "---",
            icon: DollarSign,
            color: "text-yellow-500",
            bg: "bg-yellow-500/10"
        },
        {
            title: "Tasks Processed",
            value: stats?.tasks_processed?.toLocaleString() ?? "---",
            icon: Zap,
            color: "text-[#3B82F6]",
            bg: "bg-[#3B82F6]/10"
        },
        {
            title: "Uptime %",
            value: stats?.uptime_percent !== undefined ? `${stats.uptime_percent}%` : "---",
            icon: CheckCircle2,
            color: "text-[#22C55E]",
            bg: "bg-[#22C55E]/10"
        },
        {
            title: "Current Epoch",
            value: stats?.current_epoch?.toLocaleString() ?? "---",
            icon: Clock,
            color: "text-zinc-400",
            bg: "bg-zinc-800"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {metrics.map((metric, idx) => {
                const Icon = metric.icon;
                return (
                    <div key={idx} className="p-5 rounded-2xl border border-[#262626] bg-[#1A1A0A] flex flex-col gap-3 relative overflow-hidden group">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-zinc-400">{metric.title}</span>
                            <div className={`p-2 rounded-xl ${metric.bg} ${metric.color}`}>
                                <Icon className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-white font-mono flex items-center gap-2">
                            {isLoading ? (
                                <div className="h-8 w-24 bg-zinc-800 animate-pulse rounded-lg" />
                            ) : (
                                metric.value
                            )}
                        </div>
                        {/* Interactive subtle hover effect representing "live" status */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    </div>
                );
            })}
        </div>
    );
}
