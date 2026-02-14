'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Activity, Zap, Download, AlertTriangle } from 'lucide-react';

interface SLAData {
    plan: string;
    target_success_rate: number;
    window_30d: { total_ops: number; failed_ops: number; success_rate: number; budget_remaining_pct: number };
    window_7d: { total_ops: number; failed_ops: number; success_rate: number; budget_remaining_pct: number };
    circuit: { state: string; reason: string | null; ops_today: number; spend_today_usdt: number } | null;
}

interface OpSLO {
    op_type: string;
    total_ops: number;
    avg_success_rate: number;
    max_p95_latency_ms: number;
}

export default function PartnerSLAPage() {
    const [sla, setSla] = useState<SLAData | null>(null);
    const [slo, setSlo] = useState<OpSLO[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/partner/sla').then(r => r.json()),
            fetch('/api/partner/slo?days=30').then(r => r.json()),
        ]).then(([slaRes, sloRes]) => {
            if (slaRes.ok) setSla(slaRes);
            if (sloRes.ok) setSlo(sloRes.slo || []);
        }).finally(() => setLoading(false));
    }, []);

    const budgetColor = (pct: number) => {
        if (pct >= 50) return 'bg-emerald-500';
        if (pct >= 20) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const now = new Date();
    const currentMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (loading) return <div className="p-8 text-zinc-400">Loading SLA data...</div>;
    if (!sla) return <div className="p-8 text-zinc-400">SLA data not available. Contact your admin.</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="w-7 h-7 text-blue-400" />
                    <h1 className="text-2xl font-bold text-white">SLA Health</h1>
                    <Badge variant="outline">{sla.plan} Plan</Badge>
                </div>
                <a
                    href={`/api/partner/sla/report?month=${currentMonth}`}
                    target="_blank"
                    className="flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition"
                >
                    <Download className="w-4 h-4" />
                    Export Report
                </a>
            </div>

            {/* Circuit Breaker Warning */}
            {sla.circuit?.state === 'open' && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <div>
                        <p className="text-red-300 font-semibold">Circuit Breaker Tripped</p>
                        <p className="text-red-400 text-sm">{sla.circuit.reason || 'Rate limits exceeded'}</p>
                    </div>
                </div>
            )}

            {/* Budget Gauges */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-zinc-400">30-Day Error Budget</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-white mb-2">
                            {sla.window_30d.budget_remaining_pct.toFixed(1)}%
                        </p>
                        <div className="w-full h-4 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${budgetColor(sla.window_30d.budget_remaining_pct)}`}
                                style={{ width: `${Math.min(100, sla.window_30d.budget_remaining_pct)}%` }}
                            />
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                            {sla.window_30d.total_ops.toLocaleString()} ops • {(sla.window_30d.success_rate * 100).toFixed(3)}% success
                            • Target: {(sla.target_success_rate * 100).toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-zinc-400">7-Day Error Budget</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-white mb-2">
                            {sla.window_7d.budget_remaining_pct.toFixed(1)}%
                        </p>
                        <div className="w-full h-4 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${budgetColor(sla.window_7d.budget_remaining_pct)}`}
                                style={{ width: `${Math.min(100, sla.window_7d.budget_remaining_pct)}%` }}
                            />
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                            {sla.window_7d.total_ops.toLocaleString()} ops • {sla.window_7d.failed_ops} failures
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Today's Usage */}
            {sla.circuit && (
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-zinc-400">Today&rsquo;s Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-2xl font-bold text-white">{sla.circuit.ops_today}</p>
                                <p className="text-xs text-zinc-500">Operations</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">${sla.circuit.spend_today_usdt?.toFixed(2)}</p>
                                <p className="text-xs text-zinc-500">Spend</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Per-Op-Type SLO Table */}
            {slo.length > 0 && (
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-400" />
                            SLO by Operation Type (30d)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-800 text-zinc-400">
                                        <th className="text-left py-2 pr-4">Op Type</th>
                                        <th className="text-right py-2 px-4">Total Ops</th>
                                        <th className="text-right py-2 px-4">Success Rate</th>
                                        <th className="text-right py-2 pl-4">P95 Latency</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {slo.map(s => (
                                        <tr key={s.op_type} className="border-b border-zinc-800/50 text-zinc-300">
                                            <td className="py-2 pr-4 font-mono text-xs">{s.op_type}</td>
                                            <td className="text-right py-2 px-4">{s.total_ops.toLocaleString()}</td>
                                            <td className="text-right py-2 px-4">
                                                <span className={s.avg_success_rate >= 0.99 ? 'text-emerald-400' : s.avg_success_rate >= 0.95 ? 'text-amber-400' : 'text-red-400'}>
                                                    {(s.avg_success_rate * 100).toFixed(2)}%
                                                </span>
                                            </td>
                                            <td className="text-right py-2 pl-4 font-mono">{s.max_p95_latency_ms.toFixed(0)}ms</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
