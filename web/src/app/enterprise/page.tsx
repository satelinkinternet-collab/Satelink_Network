"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    CreditCard, Key, Shield, Server, Download, Plus,
    Check, ArrowUpRight, Clock, FileText
} from 'lucide-react';
import {
    BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid
} from 'recharts';

const usageData = [
    { name: 'API Gateway', value: 4200, color: '#3b82f6' },
    { name: 'Compute', value: 3100, color: '#8b5cf6' },
    { name: 'Storage', value: 1800, color: '#10b981' },
    { name: 'CDN', value: 2400, color: '#f59e0b' },
];

export default function EnterpriseDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/enterprise-api/billing');
                if (res.data.ok) setData(res.data);
            } catch { /* Enterprise data may not exist */ }
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const kpis = [
        { label: 'Monthly Spend', value: `$${data?.spend?.toFixed(2) || '8,420.00'}`, icon: CreditCard, color: 'blue', change: '+5.2%' },
        { label: 'Active Keys', value: data?.keys || 8, icon: Key, color: 'violet', change: '+2' },
        { label: 'SLA Uptime', value: '99.99%', icon: Shield, color: 'emerald', change: 'On target' },
        { label: 'Instances', value: data?.instances || 24, icon: Server, color: 'amber', change: '+3' },
    ];

    const colorMap: Record<string, { bg: string; icon: string }> = {
        blue: { bg: 'bg-blue-500/10', icon: 'text-blue-400' },
        violet: { bg: 'bg-violet-500/10', icon: 'text-violet-400' },
        emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400' },
        amber: { bg: 'bg-amber-500/10', icon: 'text-amber-400' },
    };

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto fade-in">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">Enterprise Portal</h1>
                        <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px]">ENTERPRISE</Badge>
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">Billing, resources, and service management</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold w-full sm:w-auto">
                    <Download className="mr-2 h-4 w-4" /> Export Invoice
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
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* ── Resource Usage Chart ── */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-zinc-300">Resource Usage</CardTitle>
                    <CardDescription className="text-xs text-zinc-600">Cost breakdown by service</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[220px] sm:h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={usageData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                                <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#27272a' }} />
                                <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={{ stroke: '#27272a' }} width={90} />
                                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fafafa', fontSize: '12px' }}
                                    formatter={(v: any) => [`$${v.toLocaleString()}`, 'Cost']} />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* ── API Keys ── */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardHeader className="pb-2 border-b border-zinc-800/40">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-semibold text-zinc-300">API Keys</CardTitle>
                            <CardDescription className="text-xs text-zinc-600">Manage programmatic access</CardDescription>
                        </div>
                        <Button size="sm" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700">
                            <Plus className="mr-1 h-3.5 w-3.5" /> New Key
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-zinc-800/40">
                        {[
                            { name: 'Production', prefix: 'sl_live_...', status: 'active', created: '2026-01-15' },
                            { name: 'Staging', prefix: 'sl_test_...', status: 'active', created: '2026-01-20' },
                            { name: 'Legacy v1', prefix: 'sl_old_...', status: 'revoked', created: '2025-11-01' },
                        ].map((key, i) => (
                            <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${key.status === 'active' ? 'bg-emerald-500/10' : 'bg-zinc-800'}`}>
                                        <Key className={`w-4 h-4 ${key.status === 'active' ? 'text-emerald-400' : 'text-zinc-600'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-zinc-200">{key.name}</p>
                                        <p className="text-[11px] text-zinc-500 font-mono">{key.prefix}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge className={`text-[10px] ${key.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                        {key.status.toUpperCase()}
                                    </Badge>
                                    <span className="text-[11px] text-zinc-600 hidden sm:inline">{key.created}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ── SLA Compliance ── */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" /> SLA Compliance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { metric: 'Availability', target: '99.95%', actual: '99.99%', ok: true },
                            { metric: 'Response Time', target: '<200ms', actual: '42ms', ok: true },
                            { metric: 'Error Rate', target: '<0.1%', actual: '0.02%', ok: true },
                        ].map((sla, i) => (
                            <div key={i} className="p-4 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-zinc-400">{sla.metric}</span>
                                    <Check className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div className="text-xl font-bold text-zinc-100">{sla.actual}</div>
                                <div className="text-[11px] text-zinc-600 mt-1">Target: {sla.target}</div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
