"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    DollarSign, TrendingUp, Zap, Activity,
    Loader2, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';

export default function AdminLedgerPage() {
    const [loading, setLoading] = useState(true);
    const [revenueStats, setRevenueStats] = useState<any>(null);
    const [pricing, setPricing] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, pricingRes] = await Promise.allSettled([
                api.get('/admin/revenue/stats'),
                api.get('/admin/revenue/pricing'),
            ]);

            if (statsRes.status === 'fulfilled' && statsRes.value.data.ok) {
                setRevenueStats(statsRes.value.data);
            }
            if (pricingRes.status === 'fulfilled' && pricingRes.value.data.ok) {
                setPricing(pricingRes.value.data.rules || []);
            }
        } catch {
            toast.error('Failed to load ledger data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const kpis = [
        { label: '24h Revenue', value: `$${(revenueStats?.revenue_24h || 0).toFixed(2)}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: '24h Operations', value: revenueStats?.ops_24h || 0, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Avg Surge', value: `${(revenueStats?.avg_surge || 1.0).toFixed(2)}x`, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { label: 'Surge Ops', value: revenueStats?.surge_ops_24h || 0, icon: Zap, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    ];

    const chartData = pricing.map((r: any) => ({
        op: r.op_type,
        price: r.base_price_usdt,
        surge: r.surge_multiplier || 1.0,
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">Revenue Ledger</h1>
                    <p className="text-sm text-zinc-500 mt-1">24h revenue snapshot and pricing rules</p>
                </div>
                <Button variant="outline" className="border-zinc-700 text-zinc-400" onClick={fetchData}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
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

            {/* Pricing Chart */}
            {chartData.length > 0 && (
                <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-zinc-300">Base Pricing by Op Type</CardTitle>
                        <CardDescription className="text-xs text-zinc-600">USDT per operation</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                    <XAxis dataKey="op" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#27272a' }} />
                                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#27272a' }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fafafa', fontSize: '12px' }} />
                                    <Bar dataKey="price" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Base Price (USDT)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Pricing Rules Table */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardHeader className="pb-2 border-b border-zinc-800/40">
                    <CardTitle className="text-sm font-semibold text-zinc-300">Pricing Rules</CardTitle>
                    <CardDescription className="text-xs text-zinc-600">Current operation pricing configuration</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {pricing.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-800/40">
                                        <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase">Op Type</th>
                                        <th className="text-right px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase">Base Price</th>
                                        <th className="text-right px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase">Surge</th>
                                        <th className="text-right px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase">Threshold</th>
                                        <th className="text-center px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pricing.map((r: any, i: number) => (
                                        <tr key={i} className="border-b border-zinc-800/20 hover:bg-zinc-800/20 transition-colors">
                                            <td className="px-4 py-3 text-zinc-200 font-mono text-xs">{r.op_type}</td>
                                            <td className="px-4 py-3 text-right text-zinc-300">${r.base_price_usdt?.toFixed(4)}</td>
                                            <td className="px-4 py-3 text-right text-zinc-300">{r.surge_multiplier || 1.0}x</td>
                                            <td className="px-4 py-3 text-right text-zinc-400">{r.surge_threshold || '--'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge className={`text-[10px] ${r.surge_enabled ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30'}`}>
                                                    {r.surge_enabled ? 'SURGE ON' : 'FIXED'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-zinc-600 text-sm">No pricing rules configured yet</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
