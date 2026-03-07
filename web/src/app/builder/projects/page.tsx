"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Code2, Key, Activity, DollarSign,
    Loader2, Plus, Copy
} from 'lucide-react';

export default function BuilderProjectsPage() {
    const [loading, setLoading] = useState(true);
    const [usage, setUsage] = useState<any>(null);
    const [keys, setKeys] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [creatingKey, setCreatingKey] = useState(false);
    const [newKey, setNewKey] = useState<string | null>(null);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            const [usageRes, keysRes, reqsRes] = await Promise.allSettled([
                api.get('/builder-api/usage'),
                api.get('/builder-api/keys'),
                api.get('/builder-api/requests?limit=20'),
            ]);

            if (usageRes.status === 'fulfilled' && usageRes.value.data.ok) {
                setUsage(usageRes.value.data);
            }
            if (keysRes.status === 'fulfilled' && keysRes.value.data.ok) {
                setKeys(keysRes.value.data.keys || []);
            }
            if (reqsRes.status === 'fulfilled' && reqsRes.value.data.ok) {
                setRequests(reqsRes.value.data.requests || []);
            }
        } catch {
            toast.error('Failed to load builder data');
        } finally {
            setLoading(false);
        }
    };

    const createKey = async () => {
        setCreatingKey(true);
        try {
            const res = await api.post('/builder-api/keys', { name: `Key ${Date.now()}` });
            if (res.data.ok) {
                setNewKey(res.data.key);
                toast.success('API key created');
                fetchAll();
            }
        } catch {
            toast.error('Failed to create key');
        } finally {
            setCreatingKey(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    const kpis = [
        { label: 'Total Ops', value: usage?.summary?.count || 0, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Total Spend', value: `$${(usage?.summary?.total_usdt || 0).toFixed(2)}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'API Keys', value: keys.length, icon: Key, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    ];

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">Builder Console</h1>
                        <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px]">DEVELOPER</Badge>
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">API keys, usage, and recent requests</p>
                </div>
                <Button onClick={createKey} disabled={creatingKey}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold w-full sm:w-auto">
                    {creatingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Create API Key
                </Button>
            </div>

            {/* New Key Alert */}
            {newKey && (
                <Card className="bg-emerald-900/20 border-emerald-500/30">
                    <CardContent className="p-4">
                        <p className="text-sm text-emerald-300 font-semibold mb-2">New API Key Created (copy now — shown only once)</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 font-mono overflow-hidden text-ellipsis">
                                {newKey}
                            </code>
                            <Button size="sm" variant="outline" className="border-emerald-600 text-emerald-400 shrink-0"
                                onClick={() => { navigator.clipboard.writeText(newKey); toast.success('Copied!'); }}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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

            {/* Usage Breakdown */}
            {usage?.details?.length > 0 && (
                <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                    <CardHeader className="pb-2 border-b border-zinc-800/40">
                        <CardTitle className="text-sm font-semibold text-zinc-300">Usage by Operation Type</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-800/40">
                                        <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase">Op Type</th>
                                        <th className="text-right px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase">Count</th>
                                        <th className="text-right px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase">Total (USDT)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usage.details.map((d: any, i: number) => (
                                        <tr key={i} className="border-b border-zinc-800/20 hover:bg-zinc-800/20 transition-colors">
                                            <td className="px-4 py-3 text-zinc-200 font-mono text-xs">{d.op_type}</td>
                                            <td className="px-4 py-3 text-right text-zinc-300">{d.count}</td>
                                            <td className="px-4 py-3 text-right text-zinc-300">${(d.total_usdt || 0).toFixed(4)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* API Keys */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardHeader className="pb-2 border-b border-zinc-800/40">
                    <CardTitle className="text-sm font-semibold text-zinc-300">API Keys</CardTitle>
                    <CardDescription className="text-xs text-zinc-600">Manage your access credentials</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {keys.length > 0 ? (
                        <div className="divide-y divide-zinc-800/40">
                            {keys.map((k: any, i: number) => (
                                <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.status === 'active' ? 'bg-emerald-500/10' : 'bg-zinc-700/30'}`}>
                                            <Key className={`w-4 h-4 ${k.status === 'active' ? 'text-emerald-400' : 'text-zinc-500'}`} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-zinc-200">{k.name}</p>
                                            <p className="text-[11px] text-zinc-500 font-mono">{k.prefix}</p>
                                        </div>
                                    </div>
                                    <Badge className={`text-[10px] ${k.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}`}>
                                        {k.status?.toUpperCase()}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-zinc-600 text-sm">No API keys yet. Create one to get started.</div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Requests */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardHeader className="pb-2 border-b border-zinc-800/40">
                    <CardTitle className="text-sm font-semibold text-zinc-300">Recent API Requests</CardTitle>
                    <CardDescription className="text-xs text-zinc-600">Latest operations processed</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {requests.length > 0 ? (
                        <div className="divide-y divide-zinc-800/40">
                            {requests.slice(0, 10).map((r: any, i: number) => (
                                <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                            <Code2 className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-zinc-200 font-mono">{r.op_type}</p>
                                            <p className="text-[11px] text-zinc-500">
                                                {r.created_at ? new Date(r.created_at * 1000).toLocaleString() : 'Unknown'} &bull; ${(r.amount_usdt || 0).toFixed(4)}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px]">
                                        {r.node_id || 'processed'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-zinc-600 text-sm">No requests yet. Use the API to submit operations.</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
