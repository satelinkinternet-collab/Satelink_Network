"use client";

import { useState, useEffect } from 'react';

interface NetworkStats {
    status: string;
    incidents: string;
    active_nodes: number;
    uptime_24h_pct: number;
    total_operations_24h: number;
    total_operations_all_time: number;
    total_simulated_rewards_24h: number;
    system_status: string;
    version: string;
}

export default function NetworkStatsPage() {
    const [stats, setStats] = useState<NetworkStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/network-stats')
            .then(r => r.json())
            .then(d => { setStats(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
            <div className="text-slate-400">Loading network stats...</div>
        </div>
    );

    const statusColor = stats?.system_status === 'LIVE' ? 'text-emerald-400' : stats?.system_status === 'DEGRADED' ? 'text-amber-400' : 'text-red-400';
    const statusDot = stats?.system_status === 'LIVE' ? 'bg-emerald-400' : stats?.system_status === 'DEGRADED' ? 'bg-amber-400' : 'bg-red-400';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
            <div className="max-w-3xl mx-auto py-16 px-6">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-2">Satelink Network</h1>
                    <p className="text-slate-400">Real-time DePIN transparency dashboard</p>
                    <div className="mt-4 inline-flex items-center gap-2 bg-slate-800/50 rounded-full px-4 py-2 border border-slate-700">
                        <span className={`w-2.5 h-2.5 rounded-full ${statusDot} animate-pulse`}></span>
                        <span className={`text-sm font-semibold ${statusColor}`}>{stats?.system_status || 'UNKNOWN'}</span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <MetricCard
                        label="Active Nodes"
                        value={stats?.active_nodes?.toLocaleString() || '0'}
                        icon="🟢"
                    />
                    <MetricCard
                        label="24h Uptime"
                        value={`${stats?.uptime_24h_pct || 0}%`}
                        icon="⏱"
                    />
                    <MetricCard
                        label="Operations (24h)"
                        value={stats?.total_operations_24h?.toLocaleString() || '0'}
                        icon="⚡"
                    />
                    <MetricCard
                        label="Operations (All Time)"
                        value={stats?.total_operations_all_time?.toLocaleString() || '0'}
                        icon="📊"
                    />
                    <MetricCard
                        label="Simulated Rewards (24h)"
                        value={`$${(stats?.total_simulated_rewards_24h || 0).toFixed(2)}`}
                        icon="💰"
                    />
                    <MetricCard
                        label="Version"
                        value={stats?.version || '—'}
                        icon="🔖"
                    />
                </div>

                {/* Incidents */}
                {stats?.incidents && stats.incidents !== 'None' && (
                    <div className="mt-6 bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 text-center">
                        <span className="text-amber-400 text-sm">⚠️ System Notice: {stats.incidents}</span>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-12 text-center text-xs text-slate-500">
                    No sensitive data is exposed. All metrics are aggregated network-level stats.
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: string }) {
    return (
        <div className="bg-slate-800/80 backdrop-blur rounded-xl border border-slate-700/50 p-5">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{icon}</span>
                <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
        </div>
    );
}
