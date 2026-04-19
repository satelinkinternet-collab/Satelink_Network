"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Users, Share2, DollarSign, TrendingUp,
    Copy, ArrowUpRight, Globe, Zap, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';

export default function DistributorDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [conversions, setConversions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [statsRes, historyRes, conversionsRes] = await Promise.allSettled([
                    api.get('/dist-api/stats'),
                    api.get('/dist-api/history'),
                    api.get('/dist-api/conversions'),
                ]);

                if (statsRes.status === 'fulfilled' && statsRes.value.data.ok) {
                    setStats(statsRes.value.data);
                }
                if (historyRes.status === 'fulfilled' && historyRes.value.data.ok) {
                    setHistory(historyRes.value.data.history || []);
                }
                if (conversionsRes.status === 'fulfilled' && conversionsRes.value.data.ok) {
                    setConversions(conversionsRes.value.data.conversions || []);
                }
            } catch {
                toast.error('Failed to fetch distributor data');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const referralLink = stats?.stats?.referralLink || 'https://satelink.network/ref/...';

    const kpis = [
        { label: 'Referrals', value: stats?.stats?.referralCount ?? 0, icon: Users, color: 'blue' },
        { label: 'Conversions', value: stats?.stats?.conversions ?? 0, icon: TrendingUp, color: 'emerald' },
        { label: 'Total Earned', value: `$${stats?.stats?.totalEarned || '0.00'}`, icon: DollarSign, color: 'violet' },
        { label: 'Claimable', value: `$${stats?.stats?.claimable || '0.00'}`, icon: Zap, color: 'amber' },
    ];

    const colorMap: Record<string, { bg: string; icon: string }> = {
        blue: { bg: 'bg-blue-500/10', icon: 'text-blue-400' },
        emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400' },
        violet: { bg: 'bg-violet-500/10', icon: 'text-violet-400' },
        amber: { bg: 'bg-amber-500/10', icon: 'text-amber-400' },
    };

    const chartData = history.map((h: any) => ({
        label: h.date || `E${h.epoch}`,
        earnings: parseFloat(h.amount) || 0,
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">Distributor Hub</h1>
                        <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/30 text-[10px]">PARTNER</Badge>
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">Track referrals, conversions, and earnings</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold w-full sm:w-auto"
                    onClick={() => { navigator.clipboard.writeText(referralLink); toast.success('Link copied!'); }}>
                    <Share2 className="mr-2 h-4 w-4" /> Share Link
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {kpis.map((kpi, i) => {
                    const c = colorMap[kpi.color];
                    return (
                        <Card key={i} className="bg-zinc-900/80 border-zinc-800/60 glow-shadow hover:border-zinc-700/80 transition-all duration-300">
                            <CardContent className="p-4 sm:p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{kpi.label}</span>
                                    <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}>
                                        <kpi.icon className={`w-4 h-4 ${c.icon}`} />
                                    </div>
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-zinc-50 tracking-tight">{kpi.value}</div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Referral Link */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex-1 w-full">
                            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Your Referral Link</span>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 px-3 py-2.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-sm text-zinc-300 font-mono truncate">
                                    {referralLink}
                                </div>
                                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 shrink-0"
                                    onClick={() => { navigator.clipboard.writeText(referralLink); toast.success('Copied!'); }}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Earnings Chart */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-zinc-300">Earnings Trend</CardTitle>
                    <CardDescription className="text-xs text-zinc-600">Earnings per epoch</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[220px] sm:h-[280px]">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                    <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#27272a' }} />
                                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#27272a' }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fafafa', fontSize: '12px' }} />
                                    <Area type="monotone" dataKey="earnings" stroke="#8b5cf6" fill="url(#earnGrad)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-zinc-600 text-sm">No earnings history yet</div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Conversions */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardHeader className="pb-2 border-b border-zinc-800/40">
                    <CardTitle className="text-sm font-semibold text-zinc-300">Recent Conversions</CardTitle>
                    <CardDescription className="text-xs text-zinc-600">Latest referral sign-ups</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {conversions.length > 0 ? (
                        <div className="divide-y divide-zinc-800/40">
                            {conversions.map((c: any, i: number) => (
                                <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-zinc-700/50 flex items-center justify-center">
                                            <span className="text-[10px] font-bold text-violet-400">
                                                {c.referee_wallet?.[2]?.toUpperCase() || '?'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-zinc-200 font-mono">
                                                {c.referee_wallet ? `${c.referee_wallet.slice(0, 6)}...${c.referee_wallet.slice(-4)}` : 'Unknown'}
                                            </p>
                                            <p className="text-[11px] text-zinc-500">
                                                {c.role || 'user'} &bull; {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Unknown'}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                                        Converted
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-zinc-600 text-sm">No conversions yet. Share your referral link to get started.</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
