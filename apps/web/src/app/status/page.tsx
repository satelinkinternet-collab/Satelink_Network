"use client";



import { useState, useEffect } from 'react';

interface NetworkStats {
    status: string;
    uptime_pct: number;
    nodes_online: number;
    current_epoch: number;
    total_requests_24h: number;
    avg_latency_ms: number;
    chains_supported: string[];
    settlement: string;
}

export default function NetworkStatsPage() {
    const [stats, setStats] = useState<NetworkStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('https://rpc.satelink.network/api/status')
            .then(r => r.json())
            .then(d => { setStats(d); setLoading(false); })
            .catch((e) => { setError(e.message); setLoading(false); });
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
            <div className="text-slate-400">Loading network stats...</div>
        </div>
    );

    const isOperational = stats?.status === 'operational';
    const statusColor = isOperational ? 'text-emerald-400' : 'text-amber-400';
    const statusDot = isOperational ? 'bg-emerald-400' : 'bg-amber-400';
    const statusLabel = isOperational ? 'OPERATIONAL' : (stats?.status?.toUpperCase() || 'UNKNOWN');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
            <div className="max-w-3xl mx-auto py-16 px-6">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-2">Satelink Network Status</h1>
                    <p className="text-slate-400">Real-time DePIN infrastructure dashboard</p>
                    <div className="mt-4 inline-flex items-center gap-2 bg-slate-800/50 rounded-full px-4 py-2 border border-slate-700">
                        <span className={`w-2.5 h-2.5 rounded-full ${statusDot} animate-pulse`}></span>
                        <span className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</span>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 text-center">
                        <span className="text-amber-400 text-sm">⚠️ Could not fetch live status: {error}</span>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <MetricCard
                        label="Nodes Online"
                        value={stats?.nodes_online?.toLocaleString() || '0'}
                        icon="🟢"
                    />
                    <MetricCard
                        label="Uptime"
                        value={`${stats?.uptime_pct || 0}%`}
                        icon="⏱"
                    />
                    <MetricCard
                        label="Requests (24h)"
                        value={stats?.total_requests_24h?.toLocaleString() || '0'}
                        icon="⚡"
                    />
                    <MetricCard
                        label="Current Epoch"
                        value={stats?.current_epoch?.toString() || '0'}
                        icon="📊"
                    />
                    <MetricCard
                        label="Avg Latency"
                        value={`${stats?.avg_latency_ms || 0}ms`}
                        icon="🚀"
                    />
                    <MetricCard
                        label="Settlement"
                        value={stats?.settlement || 'USDT'}
                        icon="💰"
                    />
                </div>

                {/* Chains Supported */}
                {stats?.chains_supported && stats.chains_supported.length > 0 && (
                    <div className="mt-6 bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                        <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Chains Supported</div>
                        <div className="flex flex-wrap gap-2">
                            {stats.chains_supported.map(chain => (
                                <span key={chain} className="px-3 py-1 bg-slate-700/50 rounded-full text-sm text-white capitalize">
                                    {chain}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* RPC Endpoint */}
                <div className="mt-6 bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Public RPC Endpoint</div>
                    <code className="text-emerald-400 text-sm">https://rpc.satelink.network/rpc/polygon</code>
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-xs text-slate-500">
                    Live data from <code className="text-slate-400">rpc.satelink.network/api/status</code> • No sensitive data exposed
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
