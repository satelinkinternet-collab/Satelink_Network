'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle, Activity, Zap } from 'lucide-react';

interface PartnerSLA {
    partner_id: string;
    name: string;
    plan: string;
    circuit_state: string;
    target_success_rate: number;
    window_30d: { total_ops: number; failed_ops: number; success_rate: number; budget_remaining_pct: number };
    window_7d: { total_ops: number; failed_ops: number; success_rate: number; budget_remaining_pct: number };
}

export default function AdminSLAPage() {
    const [partners, setPartners] = useState<PartnerSLA[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/partners/sla')
            .then(r => r.json())
            .then(d => { if (d.ok) setPartners(d.partners || []); })
            .finally(() => setLoading(false));
    }, []);

    const budgetColor = (pct: number) => {
        if (pct >= 50) return 'bg-emerald-500';
        if (pct >= 20) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const circuitBadge = (state: string) => {
        if (state === 'open') return <Badge variant="destructive">OPEN</Badge>;
        if (state === 'half_open') return <Badge className="bg-amber-600">HALF-OPEN</Badge>;
        return <Badge className="bg-emerald-600">CLOSED</Badge>;
    };

    if (loading) return <div className="p-8 text-zinc-400">Loading SLA data...</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <ShieldCheck className="w-7 h-7 text-blue-400" />
                <h1 className="text-2xl font-bold text-white">Partner SLA Dashboard</h1>
            </div>

            {partners.length === 0 && (
                <p className="text-zinc-500">No partners with SLA plans configured.</p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {partners.map(p => (
                    <Card key={p.partner_id} className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg text-white">{p.name || p.partner_id}</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">{p.plan}</Badge>
                                    {circuitBadge(p.circuit_state)}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* 30-day Budget Bar */}
                            <div>
                                <div className="flex justify-between text-sm text-zinc-400 mb-1">
                                    <span>30-Day Error Budget</span>
                                    <span className="font-mono">{p.window_30d.budget_remaining_pct.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${budgetColor(p.window_30d.budget_remaining_pct)}`}
                                        style={{ width: `${Math.min(100, p.window_30d.budget_remaining_pct)}%` }}
                                    />
                                </div>
                            </div>

                            {/* 7-day Budget Bar */}
                            <div>
                                <div className="flex justify-between text-sm text-zinc-400 mb-1">
                                    <span>7-Day Error Budget</span>
                                    <span className="font-mono">{p.window_7d.budget_remaining_pct.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${budgetColor(p.window_7d.budget_remaining_pct)}`}
                                        style={{ width: `${Math.min(100, p.window_7d.budget_remaining_pct)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="grid grid-cols-3 gap-3 pt-2">
                                <div className="text-center">
                                    <Activity className="w-4 h-4 mx-auto text-zinc-500" />
                                    <p className="text-lg font-bold text-white">{p.window_30d.total_ops.toLocaleString()}</p>
                                    <p className="text-xs text-zinc-500">Total Ops</p>
                                </div>
                                <div className="text-center">
                                    <Zap className="w-4 h-4 mx-auto text-zinc-500" />
                                    <p className="text-lg font-bold text-white">{(p.window_30d.success_rate * 100).toFixed(2)}%</p>
                                    <p className="text-xs text-zinc-500">Success Rate</p>
                                </div>
                                <div className="text-center">
                                    <AlertTriangle className="w-4 h-4 mx-auto text-zinc-500" />
                                    <p className="text-lg font-bold text-white">{p.window_30d.failed_ops}</p>
                                    <p className="text-xs text-zinc-500">Failures</p>
                                </div>
                            </div>

                            <p className="text-xs text-zinc-600 text-right">
                                Target: {(p.target_success_rate * 100).toFixed(1)}%
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
