"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    DollarSign, Users, TrendingUp, AlertTriangle,
    Loader2, RefreshCw, ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function AdminRewardsPage() {
    const [loading, setLoading] = useState(true);
    const [commissions, setCommissions] = useState<any>(null);
    const [fraud, setFraud] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/revenue/commissions');
            if (res.data.ok) {
                setCommissions(res.data.stats);
                setFraud(res.data.fraud || []);
            }
        } catch {
            toast.error('Failed to load rewards data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    const kpis = [
        {
            label: 'Total Commissions',
            value: `$${(commissions?.totalCommissions || 0).toFixed(2)}`,
            icon: DollarSign,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10'
        },
        {
            label: 'Active Distributors',
            value: commissions?.activeDistributors || 0,
            icon: Users,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10'
        },
        {
            label: 'Avg Commission',
            value: `$${(commissions?.avgCommission || 0).toFixed(2)}`,
            icon: TrendingUp,
            color: 'text-violet-400',
            bg: 'bg-violet-500/10'
        },
        {
            label: 'Fraud Flags',
            value: fraud.length,
            icon: AlertTriangle,
            color: fraud.length > 0 ? 'text-red-400' : 'text-zinc-400',
            bg: fraud.length > 0 ? 'bg-red-500/10' : 'bg-zinc-500/10'
        },
    ];

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">Rewards & Commissions</h1>
                    <p className="text-sm text-zinc-500 mt-1">Distribution pool, commissions, and fraud detection</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="border-zinc-700 text-zinc-400 flex-1 sm:flex-none" onClick={fetchData}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                    <Link href="/admin/rewards/simulated">
                        <Button variant="outline" className="border-zinc-700 text-zinc-400">
                            Simulated Payouts <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {kpis.map((kpi, i) => (
                    <Card key={i} className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{kpi.label}</span>
                                <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold text-zinc-50 tracking-tight">{kpi.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Commission Details */}
            {commissions && (
                <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                    <CardHeader className="pb-2 border-b border-zinc-800/40">
                        <CardTitle className="text-sm font-semibold text-zinc-300">Commission Breakdown</CardTitle>
                        <CardDescription className="text-xs text-zinc-600">Revenue distribution by pool</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                                <p className="text-[11px] text-zinc-500 uppercase font-semibold mb-1">Node Pool (50%)</p>
                                <p className="text-xl font-bold text-zinc-100">
                                    ${(commissions?.nodePool || 0).toFixed(2)}
                                </p>
                            </div>
                            <div className="p-4 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                                <p className="text-[11px] text-zinc-500 uppercase font-semibold mb-1">Platform (30%)</p>
                                <p className="text-xl font-bold text-zinc-100">
                                    ${(commissions?.platformPool || 0).toFixed(2)}
                                </p>
                            </div>
                            <div className="p-4 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                                <p className="text-[11px] text-zinc-500 uppercase font-semibold mb-1">Distribution (20%)</p>
                                <p className="text-xl font-bold text-zinc-100">
                                    ${(commissions?.distributionPool || 0).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Fraud Alerts */}
            {fraud.length > 0 && (
                <Card className="bg-zinc-900/80 border-red-800/30 glow-shadow">
                    <CardHeader className="pb-2 border-b border-zinc-800/40">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <CardTitle className="text-sm font-semibold text-red-300">Fraud Alerts</CardTitle>
                        </div>
                        <CardDescription className="text-xs text-zinc-600">Suspicious commission activity detected</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-zinc-800/40">
                            {fraud.map((f: any, i: number) => (
                                <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-red-900/10 transition-colors">
                                    <div>
                                        <p className="text-sm font-medium text-zinc-200">{f.reason || f.type || 'Suspicious activity'}</p>
                                        <p className="text-[11px] text-zinc-500 font-mono">{f.wallet || f.distributor || 'Unknown'}</p>
                                    </div>
                                    <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">
                                        FLAGGED
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
