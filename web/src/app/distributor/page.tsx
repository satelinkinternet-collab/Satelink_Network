"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Users, Share2, DollarSign, TrendingUp,
    Copy, ArrowUpRight, Globe, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';

const earningsData = [
    { month: 'Jan', earnings: 320 }, { month: 'Feb', earnings: 580 },
    { month: 'Mar', earnings: 710 }, { month: 'Apr', earnings: 620 },
    { month: 'May', earnings: 950 }, { month: 'Jun', earnings: 1130 },
];

export default function DistributorDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const referralLink = `https://satelink.network/ref/${Math.random().toString(36).slice(2, 10)}`;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/dist-api/stats');
                if (res.data.ok) setStats(res.data);
            } catch { toast.error('Failed to fetch distributor data'); }
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const kpis = [
        { label: 'Referrals', value: stats?.referrals || 47, icon: Users, color: 'blue', change: '+18%' },
        { label: 'Conversions', value: stats?.conversions || 23, icon: TrendingUp, color: 'emerald', change: '+12%' },
        { label: 'Earnings', value: `$${stats?.earnings?.toFixed?.(2) || '1,240.00'}`, icon: DollarSign, color: 'violet', change: '+24%' },
        { label: 'Network Reach', value: stats?.reach || '12.4K', icon: Globe, color: 'amber', change: '+31%' },
    ];

    const colorMap: Record<string, { bg: string; icon: string }> = {
        blue: { bg: 'bg-blue-500/10', icon: 'text-blue-400' },
        emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400' },
        violet: { bg: 'bg-violet-500/10', icon: 'text-violet-400' },
        amber: { bg: 'bg-amber-500/10', icon: 'text-amber-400' },
    };

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto fade-in">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">Distributor Hub</h1>
                        <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/30 text-[10px]">PARTNER</Badge>
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">Track referrals, conversions, and earnings</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold w-full sm:w-auto">
                    <Share2 className="mr-2 h-4 w-4" /> Share Link
                </Button>
            </div>

            {/* ── KPI Cards ── */}
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
                                <div className="flex items-center gap-1 mt-2">
                                    <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                                    <span className="text-[11px] font-medium text-emerald-400">{kpi.change}</span>
                                    <span className="text-[11px] text-zinc-600 ml-1">this month</span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* ── Referral Link ── */}
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

            {/* ── Earnings Chart ── */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-zinc-300">Earnings Trend</CardTitle>
                    <CardDescription className="text-xs text-zinc-600">Monthly commission earnings</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[220px] sm:h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={earningsData}>
                                <defs>
                                    <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#27272a' }} />
                                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#27272a' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fafafa', fontSize: '12px' }} />
                                <Area type="monotone" dataKey="earnings" stroke="#8b5cf6" fill="url(#earnGrad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* ── Recent Acquisitions ── */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardHeader className="pb-2 border-b border-zinc-800/40">
                    <CardTitle className="text-sm font-semibold text-zinc-300">Recent Acquisitions</CardTitle>
                    <CardDescription className="text-xs text-zinc-600">Latest referral conversions</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-zinc-800/40">
                        {[
                            { user: '0xab12…f309', plan: 'Enterprise', value: '$280', time: '2h ago' },
                            { user: '0xcd45…a721', plan: 'Builder', value: '$120', time: '5h ago' },
                            { user: '0xef78…b842', plan: 'Node Pro', value: '$85', time: '1d ago' },
                            { user: '0x9a01…c563', plan: 'Enterprise', value: '$280', time: '2d ago' },
                        ].map((acq, i) => (
                            <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-zinc-700/50 flex items-center justify-center">
                                        <span className="text-[10px] font-bold text-violet-400">{acq.user[2]?.toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-zinc-200 font-mono">{acq.user}</p>
                                        <p className="text-[11px] text-zinc-500">{acq.plan} • {acq.time}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-emerald-400">{acq.value}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
