"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    Activity, DollarSign, Key, TrendingUp,
    Loader2, RefreshCw, FileText
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';

export default function EnterpriseDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [usage, setUsage] = useState<any>(null);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, histRes] = await Promise.allSettled([
                api.get('/ent-api/stats'),
                api.get('/ent-api/history'),
            ]);

            if (statsRes.status === 'fulfilled' && statsRes.value.data.ok) {
                setUsage(statsRes.value.data.usage);
                setInvoices(statsRes.value.data.invoices || []);
            }
            if (histRes.status === 'fulfilled' && histRes.value.data.ok) {
                setHistory(histRes.value.data.history || []);
            }
        } catch {
            toast.error('Failed to load enterprise data');
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
        { label: 'Current Month Ops', value: usage?.currentMonthOps || 0, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Projected Spend', value: `$${(usage?.projectedSpend || 0).toFixed(2)}`, icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        { label: 'Last Month', value: `$${(usage?.lastMonthSpend || 0).toFixed(2)}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'Active Keys', value: usage?.activeKeys || 0, icon: Key, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    ];

    const chartData = history.map((h: any) => ({
        date: h.date,
        ops: h.ops,
        spend: parseFloat(h.spend) || 0,
    }));

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">Enterprise Dashboard</h1>
                        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">ENTERPRISE</Badge>
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">Usage, billing, and operations overview</p>
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

            {/* Usage Chart */}
            {chartData.length > 0 && (
                <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-zinc-300">14-Day Usage Trend</CardTitle>
                        <CardDescription className="text-xs text-zinc-600">Daily operations and spend</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="opsGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                    <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#27272a' }} />
                                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#27272a' }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fafafa', fontSize: '12px' }} />
                                    <Area type="monotone" dataKey="ops" stroke="#3b82f6" fill="url(#opsGrad)" strokeWidth={2} name="Operations" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Invoices */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardHeader className="pb-2 border-b border-zinc-800/40">
                    <CardTitle className="text-sm font-semibold text-zinc-300">Invoices</CardTitle>
                    <CardDescription className="text-xs text-zinc-600">Billing history</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {invoices.length > 0 ? (
                        <div className="divide-y divide-zinc-800/40">
                            {invoices.map((inv: any, i: number) => (
                                <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                            <FileText className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-zinc-200">{inv.id}</p>
                                            <p className="text-[11px] text-zinc-500">{inv.date}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-zinc-200">${(inv.amount || 0).toFixed(2)}</span>
                                        <Badge className={`text-[10px] ${inv.status === 'PAID' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}>
                                            {inv.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-zinc-600 text-sm">No invoices yet</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
