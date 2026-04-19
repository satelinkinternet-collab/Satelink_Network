"use client";

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

interface SystemStatus {
    ok: boolean;
    epoch_id: number | null;
    epoch_status: string;
    total_revenue: number;
    total_earnings: number;
    total_balances: number;
    active_wallets: number;
    epochs_finalized: number;
    ops_per_min: number;
    revenue_last_5min: { count: number; total_usdt: number };
    scheduler_active: boolean;
    scheduler_last_status: string;
}

export default function NetworkStatsPage() {
    const [stats, setStats] = useState<SystemStatus | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await api.get('/system/status');
            setStats(res.data);
        } catch {
            // keep last known state
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    if (loading) return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
            <div className="text-slate-400">Loading network stats...</div>
        </div>
    );

    const systemStatus = stats?.ok ? (stats.scheduler_active ? 'LIVE' : 'DEGRADED') : 'UNKNOWN';
    const statusColor = systemStatus === 'LIVE' ? 'text-emerald-400' : systemStatus === 'DEGRADED' ? 'text-amber-400' : 'text-red-400';
    const statusDot = systemStatus === 'LIVE' ? 'bg-emerald-400' : systemStatus === 'DEGRADED' ? 'bg-amber-400' : 'bg-red-400';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
            <div className="max-w-3xl mx-auto py-16 px-6">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-2">Satelink Network</h1>
                    <p className="text-slate-400">Real-time DePIN transparency dashboard</p>
                    <div className="mt-4 inline-flex items-center gap-2 bg-slate-800/50 rounded-full px-4 py-2 border border-slate-700">
                        <span className={`w-2.5 h-2.5 rounded-full ${statusDot} animate-pulse`}></span>
                        <span className={`text-sm font-semibold ${statusColor}`}>{systemStatus}</span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <MetricCard
                        label="Active Wallets"
                        value={(stats?.active_wallets || 0).toLocaleString()}
                        icon="🟢"
                    />
                    <MetricCard
                        label="Ops/min"
                        value={(stats?.ops_per_min || 0).toLocaleString()}
                        icon="⚡"
                    />
                    <MetricCard
                        label="Revenue (5min)"
                        value={`$${(stats?.revenue_last_5min?.total_usdt || 0).toFixed(4)}`}
                        icon="💰"
                    />
                    <MetricCard
                        label="Total Revenue"
                        value={`$${(stats?.total_revenue || 0).toFixed(2)}`}
                        icon="📊"
                    />
                    <MetricCard
                        label="Epochs Finalized"
                        value={(stats?.epochs_finalized || 0).toLocaleString()}
                        icon="⏱"
                    />
                    <MetricCard
                        label="Current Epoch"
                        value={stats?.epoch_id?.toString() || '—'}
                        icon="🔖"
                    />
                </div>

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
