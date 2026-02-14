
"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Activity, Cpu, Zap, TrendingUp, Shield, Clock, AlertTriangle,
    Pause, Play, Lock, Unlock, RefreshCw
} from 'lucide-react';
import api from '@/lib/api';
import { useSSE } from '@/hooks/use-sse';
import {
    PageHeader, ErrorBanner, KpiSkeleton, LivePill, ConfirmDialog,
    useIsReadonly, formatTs, timeAgo, DataTable
} from '@/components/admin/admin-shared';
import { DebugToolbox } from '@/components/admin/DebugToolbox';

interface SystemState {
    withdrawals_paused: boolean;
    security_freeze: boolean;
    revenue_mode: string;
    beta_gate_enabled?: boolean;
}

interface KPIs {
    active_nodes_5m: number;
    ops_5m: number;
    success_rate_5m: number;
    p95_latency_ms_5m: number;
    revenue_24h_usdt: string;
}

interface FeedItem {
    type: string;
    id: number;
    value: any;
    ts: number;
    label: string;
}

export default function CommandCenterPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [system, setSystem] = useState<SystemState>({ withdrawals_paused: false, security_freeze: false, revenue_mode: 'ACTIVE', beta_gate_enabled: false });
    const [kpis, setKpis] = useState<KPIs>({ active_nodes_5m: 0, ops_5m: 0, success_rate_5m: 99.9, p95_latency_ms_5m: 0, revenue_24h_usdt: '0.00' });
    const [alertsCount, setAlertsCount] = useState(0);
    const [errorsCount, setErrorsCount] = useState(0);
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [confirmAction, setConfirmAction] = useState<{ type: string; val: boolean } | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const readonly = useIsReadonly();

    const { status: sseStatus, lastEvent } = useSSE('/stream/admin', ['snapshot', 'revenue_batch', 'error_batch']);

    const fetchData = useCallback(async () => {
        try {
            setError('');
            const [summaryRes, feedRes] = await Promise.all([
                api.get('/admin/command/summary'),
                api.get('/admin/command/live-feed?limit=50'),
            ]);
            if (summaryRes.data.ok) {
                setSystem(summaryRes.data.system);
                setKpis(summaryRes.data.kpis);
                setAlertsCount(summaryRes.data.alerts_open_count);
                setErrorsCount(summaryRes.data.errors_1h_count);
            }
            if (feedRes.data.ok) setFeed(feedRes.data.feed);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Update from SSE
    useEffect(() => {
        if (lastEvent?.type === 'snapshot' && lastEvent.data) {
            const d = lastEvent.data;
            if (d.system) setSystem(d.system);
            if (d.kpis) setKpis(d.kpis);
            if (d.alerts_open_count != null) setAlertsCount(d.alerts_open_count);
            if (d.errors_1h_count != null) setErrorsCount(d.errors_1h_count);
        }
    }, [lastEvent]);

    const executeControl = async (type: string, val: boolean) => {
        setActionLoading(true);
        try {
            if (type === 'pause') {
                await api.post('/admin/controls/pause-withdrawals', { paused: val });
            } else if (type === 'beta_gate') {
                await api.post('/admin/controls/beta-gate', { enabled: val });
            } else if (type === 'exit_safe_mode') {
                await api.post('/admin/controls/exit-safe-mode', {});
            } else {
                await api.post('/admin/controls/security-freeze', { frozen: val });
            }
            await fetchData();
        } catch (e: any) {
            setError(e.response?.data?.error || 'Action failed');
        } finally {
            setActionLoading(false);
            setConfirmAction(null);
        }
    };

    const kpiCards = [
        { label: 'Active Nodes (5m)', value: kpis.active_nodes_5m, icon: Cpu, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-emerald-500/5' },
        { label: 'Ops / 5min', value: kpis.ops_5m, icon: Zap, color: 'text-blue-400', bg: 'from-blue-500/10 to-blue-500/5' },
        { label: 'Success Rate', value: `${kpis.success_rate_5m}%`, icon: Activity, color: 'text-purple-400', bg: 'from-purple-500/10 to-purple-500/5' },
        { label: 'p95 Latency', value: `${kpis.p95_latency_ms_5m}ms`, icon: Clock, color: 'text-amber-400', bg: 'from-amber-500/10 to-amber-500/5' },
        { label: 'Revenue (24h)', value: `$${kpis.revenue_24h_usdt}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-emerald-500/5' },
        { label: 'Open Alerts', value: alertsCount, icon: Shield, color: alertsCount > 0 ? 'text-red-400' : 'text-emerald-400', bg: alertsCount > 0 ? 'from-red-500/10 to-red-500/5' : 'from-emerald-500/10 to-emerald-500/5' },
        { label: 'Errors (1h)', value: errorsCount, icon: AlertTriangle, color: errorsCount > 0 ? 'text-amber-400' : 'text-emerald-400', bg: errorsCount > 0 ? 'from-amber-500/10 to-amber-500/5' : 'from-emerald-500/10 to-emerald-500/5' },
    ];

    const feedTypeColors: Record<string, string> = {
        revenue: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        error: 'bg-red-500/10 text-red-400 border-red-500/20',
        audit: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        alert: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <PageHeader
                title="Command Center"
                subtitle="Real-time system monitoring and controls"
                sseStatus={sseStatus}
                actions={
                    <Button variant="ghost" size="sm" onClick={fetchData} className="text-zinc-400 hover:text-zinc-200">
                        <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                    </Button>
                }
            />

            {error && <ErrorBanner message={error} onRetry={fetchData} />}

            {/* SAFE MODE BANNER (Phase 22) */}
            {system.beta_gate_enabled && ( // Wait, beta_gate_enabled is not safe mode. I need to check system.revenue_mode or new flag
                // System state is not in 'system' object yet?
                // FetchData gets 'summary'.
                // Let's check 'system.revenue_mode === 'READONLY' or 'system.security_freeze'
                // Actually, I should add 'system_state' to the system object in backend.
                // For now, I'll use revenue_mode === 'READONLY' as proxy or fetch 'system_state'.
                // Let's assume 'system.revenue_mode === 'READONLY' AND system.security_freeze might overlap.
                // The plan said 'set system_state=DEGRADED'.
                // I'll rely on a specific check.
                null
            )}

            {/* SAFE MODE BANNER */}
            {(system as any).system_state === 'DEGRADED' && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                        <ShieldAlert className="h-6 w-6 text-red-500" />
                        <div>
                            <h3 className="text-lg font-bold text-red-400">SAFE MODE ACTIVE</h3>
                            <p className="text-sm text-red-300">System functionality is degraded due to high load or errors.</p>
                        </div>
                    </div>
                    {!readonly && (
                        <Button variant="destructive" size="sm" onClick={() => setConfirmAction({ type: 'exit_safe_mode', val: true })}>
                            Exit Safe Mode
                        </Button>
                    )}
                </div>
            )}

            {/* System Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
                <Card className="bg-zinc-900/80 border-zinc-800/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {system.withdrawals_paused ? <Pause className="h-5 w-5 text-red-400" /> : <Play className="h-5 w-5 text-emerald-400" />}
                            <div>
                                <p className="text-sm font-semibold text-zinc-200">Withdrawals</p>
                                <p className="text-xs text-zinc-500">{system.withdrawals_paused ? 'PAUSED' : 'Active'}</p>
                            </div>
                        </div>
                        {!readonly && (
                            <Button
                                size="sm"
                                variant={system.withdrawals_paused ? 'default' : 'destructive'}
                                onClick={() => setConfirmAction({ type: 'pause', val: !system.withdrawals_paused })}
                                className="text-xs"
                            >
                                {system.withdrawals_paused ? 'Resume' : 'Pause'}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/80 border-zinc-800/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {system.security_freeze ? <Lock className="h-5 w-5 text-red-400" /> : <Unlock className="h-5 w-5 text-emerald-400" />}
                            <div>
                                <p className="text-sm font-semibold text-zinc-200">Security</p>
                                <p className="text-xs text-zinc-500">{system.security_freeze ? 'FROZEN' : 'Normal'}</p>
                            </div>
                        </div>
                        {!readonly && (
                            <Button
                                size="sm"
                                variant={system.security_freeze ? 'default' : 'destructive'}
                                onClick={() => setConfirmAction({ type: 'freeze', val: !system.security_freeze })}
                                className="text-xs"
                            >
                                {system.security_freeze ? 'Unfreeze' : 'Freeze'}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/80 border-zinc-800/60">
                    <CardContent className="p-4 flex items-center gap-3">
                        <Activity className="h-5 w-5 text-blue-400" />
                        <div>
                            <p className="text-sm font-semibold text-zinc-200">Revenue Mode</p>
                            <p className="text-xs text-zinc-500">{system.revenue_mode}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/80 border-zinc-800/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {system.beta_gate_enabled ? <Lock className="h-5 w-5 text-emerald-400" /> : <Unlock className="h-5 w-5 text-zinc-500" />}
                            <div>
                                <p className="text-sm font-semibold text-zinc-200">Beta Gate</p>
                                <p className="text-xs text-zinc-500">{system.beta_gate_enabled ? 'Active' : 'Open (Public)'}</p>
                            </div>
                        </div>
                        {!readonly && (
                            <Button
                                size="sm"
                                variant={system.beta_gate_enabled ? 'default' : 'outline'}
                                onClick={() => setConfirmAction({ type: 'beta_gate', val: !system.beta_gate_enabled })}
                                className="text-xs"
                            >
                                {system.beta_gate_enabled ? 'Open' : 'Enforce'}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Ops Tools & Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                    <CardContent className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/admin/rewards/simulated'}>
                        <div className="p-2 bg-yellow-500/10 rounded-full text-yellow-500"><TrendingUp size={16} /></div>
                        <div>
                            <div className="text-sm font-semibold text-zinc-200">Simulated Payouts</div>
                            <div className="text-xs text-zinc-500">View Queue</div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                    <CardContent className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/admin/reports/daily'}>
                        <div className="p-2 bg-purple-500/10 rounded-full text-purple-500"><Activity size={16} /></div>
                        <div>
                            <div className="text-sm font-semibold text-zinc-200">Daily Ops Reports</div>
                            <div className="text-xs text-zinc-500">System Health</div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                    <CardContent className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/admin/beta/invites'}>
                        <div className="p-2 bg-pink-500/10 rounded-full text-pink-500"><Zap size={16} /></div>
                        <div>
                            <div className="text-sm font-semibold text-zinc-200">Beta Invites</div>
                            <div className="text-xs text-zinc-500">Manage Keys</div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                    <CardContent className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/admin/beta/feedback'}>
                        <div className="p-2 bg-blue-500/10 rounded-full text-blue-500"><Shield size={16} /></div>
                        <div>
                            <div className="text-sm font-semibold text-zinc-200">Feedback Triage</div>
                            <div className="text-xs text-zinc-500">Beta Issues</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* KPIs */}
            {loading ? <KpiSkeleton count={7} /> : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
                    {kpiCards.map((kpi, i) => (
                        <Card key={i} className={`bg-gradient-to-br ${kpi.bg} border-zinc-800/40 hover:border-zinc-700/50 transition-colors`}>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                                    <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">{kpi.label}</span>
                                </div>
                                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Live Feed */}
            <Card className="bg-zinc-900/60 border-zinc-800/60">
                <div className="px-4 sm:px-6 py-4 border-b border-zinc-800/60 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-zinc-100">Live Feed</h2>
                    <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">{feed.length} events</Badge>
                </div>
                <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                    {feed.length === 0 && (
                        <div className="py-8 text-center text-zinc-500 text-sm">No events yet</div>
                    )}
                    {feed.map((item, i) => (
                        <div key={i} className="px-4 sm:px-6 py-3 flex items-center gap-3 border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                            <Badge className={`text-[10px] uppercase w-16 justify-center ${feedTypeColors[item.type] || 'bg-zinc-800 text-zinc-400'}`}>
                                {item.type}
                            </Badge>
                            <span className="text-sm text-zinc-300 flex-1 truncate">{item.label}</span>
                            <span className="text-xs text-zinc-600 shrink-0">{timeAgo(item.ts)}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={!!confirmAction}
                title={confirmAction?.type === 'pause' ? (confirmAction.val ? 'Pause Withdrawals?' : 'Resume Withdrawals?') : confirmAction?.type === 'beta_gate' ? (confirmAction.val ? 'Enforce Beta Gate?' : 'Open Beta Gate?') : (confirmAction?.val ? 'Security Freeze?' : 'Remove Security Freeze?')}
                description={confirmAction?.type === 'pause'
                    ? 'This will immediately affect all pending and future withdrawals.'
                    : confirmAction?.type === 'beta_gate' ? 'Enforcing beta gate will verify invite codes for new users.' : 'This will toggle the global security freeze state.'}
                variant={confirmAction?.type === 'beta_gate' ? 'default' : 'danger'}
                confirmLabel={confirmAction?.type === 'pause' ? (confirmAction.val ? 'Pause Now' : 'Resume') : confirmAction?.type === 'beta_gate' ? (confirmAction.val ? 'Enforce' : 'Open') : (confirmAction?.val ? 'Freeze Now' : 'Unfreeze')}
                onConfirm={() => confirmAction && executeControl(confirmAction.type, confirmAction.val)}
                onCancel={() => setConfirmAction(null)}
                loading={actionLoading}
            />

            <DebugToolbox
                viewContext={{ page: 'command-center', kpis, alertsCount, errorsCount }}
                lastSsePayload={lastEvent}
                sseConnected={sseStatus === 'connected'}
            />
        </div>
    );
}
