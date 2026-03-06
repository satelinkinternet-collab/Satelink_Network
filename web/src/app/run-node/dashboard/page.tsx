"use client";

import { useState, useEffect } from "react";
import { DollarSign, AlertCircle, ShieldCheck, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import api from "@/lib/api";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";

interface EarningsData {
    nodeId: string;
    lifetimeEarningsUsdt: number;
    currentEpochEarningsUsdt: number;
    claimableUsdt: number;
    totalOpsProcessed: number;
    earningsByEpoch: { epochId: number; earningsUsdt: number }[];
}

export default function NodeEarningsDashboard() {
    const { user, loading: authLoading } = useAuth();
    const [data, setData] = useState<EarningsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;

        const fetchEarnings = async () => {
            try {
                const nodeId = user?.wallet || "node-123";

                const res = await api.get(`/api/node/${nodeId}/earnings`);
                if (res.data) {
                    setData(res.data);
                } else {
                    setError("Invalid response format");
                }
            } catch (err: any) {
                console.error("Failed to load earnings:", err);
                setError(err?.response?.data?.error || "Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };

        fetchEarnings();
    }, [user, authLoading]);

    if (authLoading || loading) {
        return (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 w-full p-4">
                <h1 className="text-2xl font-bold font-mono text-white mb-6">/run-node/dashboard</h1>
                <div className="space-y-4">
                    <div className="h-6 w-48 bg-zinc-800 animate-pulse rounded"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-[#1A1A0A] border border-[#262626] rounded-2xl p-5 h-[100px] animate-pulse"></div>
                        ))}
                    </div>
                </div>
                <div className="bg-[#1A1A0A] border border-[#262626] rounded-2xl h-[300px] animate-pulse mt-8"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-8 max-w-4xl mx-auto mt-12 w-full">
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] p-6 rounded-2xl flex items-center gap-4">
                    <AlertCircle className="h-6 w-6" />
                    <p className="font-medium">{error || "Failed to load earnings data."}</p>
                </div>
            </div>
        );
    }

    const {
        lifetimeEarningsUsdt,
        currentEpochEarningsUsdt,
        claimableUsdt,
        totalOpsProcessed,
        earningsByEpoch
    } = data;

    const hasEarnings = earningsByEpoch && earningsByEpoch.length > 0;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 w-full p-4">
            <h1 className="text-2xl font-bold font-mono text-white mb-6">/run-node/dashboard</h1>

            {/* Section A — Earnings Summary */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-widest">
                    <DollarSign className="h-4 w-4" /> Earnings Summary
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard title="Current Epoch Earnings" value={currentEpochEarningsUsdt} unit="$" />
                    <MetricCard title="Lifetime Earnings" value={lifetimeEarningsUsdt} unit="$" />
                    <MetricCard title="Claimable Balance" value={claimableUsdt} unit="$" color="text-[#22C55E]" />
                    <MetricCard title="Total Ops Processed" value={totalOpsProcessed} isCount />
                </div>
            </div>

            {/* Section B — Earnings Chart */}
            <div className="space-y-4 pt-4 border-t border-[#262626]">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-widest">
                    <Activity className="h-4 w-4" /> Earnings History
                </div>

                <div className="bg-[#1A1A0A] border border-[#262626] rounded-2xl p-6 h-[400px] flex items-center justify-center">
                    {hasEarnings ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={earningsByEpoch} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                <XAxis
                                    dataKey="epochId"
                                    stroke="#52525b"
                                    tick={{ fill: "#a1a1aa" }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `Epoch ${val}`}
                                />
                                <YAxis
                                    stroke="#52525b"
                                    tick={{ fill: "#a1a1aa" }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#0A0A0A", borderColor: "#262626", borderRadius: "8px", color: "#fff" }}
                                    itemStyle={{ color: "#3B82F6" }}
                                    formatter={(value: any) => [`$${Number(value).toFixed(6)}`, "Earnings"]}
                                    labelFormatter={(label) => `Epoch ${label}`}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="earningsUsdt"
                                    stroke="#3B82F6"
                                    strokeWidth={3}
                                    dot={{ fill: "#0A0A0A", stroke: "#3B82F6", strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, fill: "#3B82F6" }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-zinc-500 font-mono">No earnings yet</p>
                    )}
                </div>
            </div>

            {/* Section C — Claim / Withdraw State */}
            <div className="space-y-4 pt-4 border-t border-[#262626]">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-widest">
                    <ShieldCheck className="h-4 w-4" /> Actions
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Claim Panel */}
                    <div className="bg-[#1A1A0A] border border-[#262626] rounded-2xl p-6 flex flex-col justify-between gap-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-medium text-white">Claim Rewards</h3>
                                    <p className="text-sm text-zinc-500 mt-1">Move epoch earnings to claimable balance</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${claimableUsdt > 0 ? "bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]" : "bg-zinc-800 border-[#262626] text-zinc-400"}`}>
                                    {claimableUsdt > 0 ? "Available" : "Ineligible"}
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#262626] flex justify-between items-center">
                                <span className="text-zinc-400 text-sm">Actionable Protocol Value</span>
                                <span className="font-mono text-white text-lg">${Number(claimableUsdt).toFixed(6)}</span>
                            </div>
                        </div>

                        <Button
                            disabled={Number(claimableUsdt) <= 0}
                            className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white rounded-xl border border-[#3B82F6]/50 transition-all font-medium py-6 disabled:opacity-50 disabled:bg-zinc-800 disabled:border-zinc-700 disabled:text-zinc-500"
                        >
                            Claim Earnings
                        </Button>
                    </div>

                    {/* Placeholder for future expansion */}
                    <div className="bg-[#1A1A0A] border border-[#262626] rounded-2xl p-6 flex flex-col justify-between gap-6 opacity-50 pointer-events-none">
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-medium text-white">Withdraw Funds</h3>
                                    <p className="text-sm text-zinc-500 mt-1">Transfer funds to connected wallet</p>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#262626] flex justify-between items-center">
                                <span className="text-zinc-400 text-sm">Network Cooldown</span>
                                <span className="font-mono text-zinc-500 text-sm">Locked</span>
                            </div>
                        </div>
                        <Button disabled className="w-full bg-zinc-800 text-zinc-500 rounded-xl border border-zinc-700 py-6">
                            Withdraw
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({
    title,
    value,
    unit = "",
    color = "text-white",
    isCount = false
}: {
    title: string;
    value: number | undefined;
    unit?: string;
    color?: string;
    isCount?: boolean;
}) {
    const formattedValue = value !== undefined
        ? isCount ? value.toLocaleString() : value.toFixed(6)
        : "0.000000";

    return (
        <div className="bg-[#1A1A0A] border border-[#262626] rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden group">
            <span className="text-sm font-medium text-zinc-500">{title}</span>
            <div className={`text-2xl font-bold font-mono ${color}`}>
                {!isCount && value !== undefined && unit}
                {formattedValue}
            </div>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </div>
    );
}
