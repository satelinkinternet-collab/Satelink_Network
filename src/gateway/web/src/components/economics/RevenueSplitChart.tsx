"use client";

import useSWR from "swr";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { Loader2, AlertCircle, Calendar } from "lucide-react";

interface splitRatio {
    nodeOperators: number;
    platform: number;
    distributors: number;
}

interface EconomicsSummary {
    totalRevenueUsdt: number;
    totalNodePoolUsdt: number;
    totalPlatformShareUsdt: number;
    totalDistributorShareUsdt: number;
    splitRatio: splitRatio;
    lastEpochId: number;
    lastEpochRevenueUsdt: number;
    lastEpochClosedAt: string | null;
}

const fetcher = (url: string) => fetch(url).then(res => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
});

export function RevenueSplitChart() {
    const { data, error, isLoading } = useSWR<EconomicsSummary>('/api/economics/summary', fetcher, {
        refreshInterval: 60000,
        revalidateOnFocus: false
    });

    if (error) {
        return (
            <div className="p-6 rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center gap-3 h-64 w-full">
                <AlertCircle className="h-5 w-5" />
                <span>Failed to load economics data.</span>
            </div>
        );
    }

    if (isLoading || !data) {
        return (
            <div className="flex flex-col gap-4 h-64 items-center justify-center bg-[#1A1A0A] rounded-2xl border border-[#262626] w-full pulse">
                <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
                <span className="text-zinc-500 text-sm font-mono">Loading Epoch Aggregations...</span>
            </div>
        );
    }

    const {
        totalRevenueUsdt,
        totalNodePoolUsdt,
        totalPlatformShareUsdt,
        totalDistributorShareUsdt,
        splitRatio,
        lastEpochId,
        lastEpochRevenueUsdt,
        lastEpochClosedAt
    } = data;

    // We pass USDT to `value` so the Pie chart proportions map exactly to real money distributed
    const chartData = [
        { name: "Node Operators", value: totalNodePoolUsdt, percentage: splitRatio.nodeOperators, color: "#22C55E" },
        { name: "Satelink Platform", value: totalPlatformShareUsdt, percentage: splitRatio.platform, color: "#3B82F6" },
        { name: "Distributors", value: totalDistributorShareUsdt, percentage: splitRatio.distributors, color: "#A855F7" }
    ];

    const hasData = totalRevenueUsdt > 0;
    const closedDate = lastEpochClosedAt ? new Date(lastEpochClosedAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '—';

    // Formatter functions
    const formatCurrency = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;

    return (
        <div className="bg-[#1A1A0A] border border-[#262626] rounded-3xl p-8 flex flex-col xl:flex-row gap-12 text-zinc-100 w-full shadow-2xl">
            {/* Left: Chart */}
            <div className="flex-1 flex flex-col items-center justify-center">
                <h3 className="text-xl font-bold mb-6 text-white border-b border-[#262626] pb-3 w-full text-center tracking-wide">Protocol Revenue Split</h3>

                <div className="h-72 w-full relative">
                    {!hasData ? (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-500 font-mono text-sm border border-dashed border-[#262626] rounded-full mx-8 my-4">
                            No Closed Epochs
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #262626', borderRadius: '12px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: any, name: string | undefined, props: any) => [
                                        `${formatCurrency(Number(value))} (${props.payload.percentage}%)`,
                                        "Share"
                                    ]}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: '#A1A1AA', fontSize: '14px', paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="mt-8 text-sm font-mono text-zinc-400 bg-[#0A0A0A] px-6 py-3 border border-[#262626] rounded-xl flex items-center gap-3">
                    Total Revenue: <span className="text-[#3B82F6] font-bold text-lg">{formatCurrency(totalRevenueUsdt)}</span>
                </div>
            </div>

            {/* Right: Specific Breakdown Details */}
            <div className="flex-1 space-y-6 flex flex-col justify-center">
                <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-[#262626]">
                    <h4 className="font-semibold text-white mb-6 flex items-center gap-2 text-lg">
                        Revenue Distribution
                    </h4>

                    <div className="space-y-4">
                        {chartData.map((pool) => (
                            <div key={pool.name} className="flex justify-between items-center p-4 bg-zinc-900 border border-[#262626] rounded-xl hover:border-zinc-700 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: pool.color }} />
                                    <span className="font-medium text-white">{pool.name}</span>
                                    <span className="text-xs font-mono text-zinc-500 bg-black px-2 py-0.5 rounded-full">{pool.percentage}%</span>
                                </div>
                                <span className="font-mono text-zinc-300">
                                    {formatCurrency(pool.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Last Epoch Info Module */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-xl bg-zinc-900 border border-[#262626] col-span-2">
                        <div className="flex justify-between items-center mb-4">
                            <div className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="h-3 w-3" /> Latest Closed Epoch
                            </div>
                            <div className="text-xs font-mono bg-[#3B82F6]/10 text-[#3B82F6] px-2 py-1 rounded">
                                ID #{lastEpochId}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm text-zinc-500 mb-1">Epoch Revenue</div>
                                <div className="font-mono text-white text-lg">{formatCurrency(lastEpochRevenueUsdt)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-zinc-500 mb-1">Closed At</div>
                                <div className="font-mono text-white text-sm">{closedDate}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
