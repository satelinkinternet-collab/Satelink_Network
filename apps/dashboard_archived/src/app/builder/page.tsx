"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useSSE } from '@/hooks/use-sse';
import {
    Key, BarChart3, Plus, Code2, Cpu, Copy,
    CheckCircle, AlertCircle, Loader2, Clock, Zap, MoreHorizontal
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function BuilderDashboard() {
    const { user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [keys, setKeys] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creatingKey, setCreatingKey] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [revealedKey, setRevealedKey] = useState<string | null>(null);

    const { lastEvent } = useSSE('/stream/builder', ['usage_log']);

    const fetchData = async () => {
        try {
            const [usageRes, keysRes] = await Promise.all([
                api.get('/builder-api/usage'), api.get('/builder-api/keys')
            ]);
            if (usageRes.data.ok) setData(usageRes.data);
            if (keysRes.data.ok) setKeys(keysRes.data.keys);
        } catch { toast.error('Failed to fetch builder data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        if (!lastEvent) return;
        if (lastEvent.type === 'usage_log') {
            const newEvents = lastEvent.data || [];
            if (newEvents.length > 0) {
                setData((prev: any) => ({
                    ...prev,
                    summary: {
                        ...prev.summary,
                        count: (prev.summary.count || 0) + newEvents.length,
                        total_usdt: (prev.summary.total_usdt || 0) + newEvents.reduce((acc: number, e: any) => acc + (Number(e.amount_usdt) || 0), 0)
                    }
                }));
                toast.info("Usage stats updated");
            }
        }
    }, [lastEvent]);

    const handleCreateKey = async () => {
        if (!newKeyName) { toast.error('Key name is required'); return; }
        setCreatingKey(true);
        try {
            const { data } = await api.post('/builder-api/keys', { name: newKeyName });
            if (data.ok) {
                setRevealedKey(data.key);
                toast.success('API key created successfully');
                fetchData();
                setNewKeyName('');
            }
        } catch { toast.error('Failed to create API key'); }
        finally { setCreatingKey(false); }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    if (loading && !data) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
    );

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto fade-in">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">Builder Console</h1>
                        <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px]">DEV</Badge>
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">Manage API keys and monitor integration usage</p>
                </div>
                <Dialog onOpenChange={(open) => !open && setRevealedKey(null)}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> New API Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        <DialogHeader>
                            <DialogTitle className="text-zinc-50">{revealedKey ? 'Key Generated' : 'Create New API Key'}</DialogTitle>
                            <DialogDescription className="text-zinc-500">
                                {revealedKey ? 'Copy this key now. It will not be shown again.' : 'Name your key to easily identify it later.'}
                            </DialogDescription>
                        </DialogHeader>
                        {revealedKey ? (
                            <div className="space-y-4">
                                <div className="relative">
                                    <Input readOnly value={revealedKey} className="pr-10 font-mono text-xs bg-zinc-800 border-zinc-700 text-zinc-200" />
                                    <Button size="icon" variant="ghost" className="absolute right-0 top-0 text-zinc-400 hover:text-zinc-100" onClick={() => copyToClipboard(revealedKey)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    Keep this key secure. Anyone with this key can access your builder resources.
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-300">Key Name</label>
                                    <Input placeholder="e.g. Production Mobile App" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)}
                                        className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-600" />
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            {revealedKey ? (
                                <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={() => (document.querySelector('[data-state="open"]') as any)?.click()}>Close</Button>
                            ) : (
                                <Button disabled={creatingKey} onClick={handleCreateKey} className="w-full bg-blue-600 hover:bg-blue-500 font-semibold">
                                    {creatingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Generate Key'}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow hover:border-zinc-700/80 transition-all duration-300">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">API Calls</span>
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Cpu className="w-4 h-4 text-blue-400" />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-zinc-50 tracking-tight">{data?.summary.count || 0}</div>
                        <p className="text-[11px] text-zinc-600 mt-2">Across all services</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow hover:border-zinc-700/80 transition-all duration-300">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Spend</span>
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <BarChart3 className="w-4 h-4 text-emerald-400" />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-zinc-50 tracking-tight">${data?.summary.total_usdt?.toFixed(2) || '0.00'}</div>
                        <p className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Satelink Token Units
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow hover:border-zinc-700/80 transition-all duration-300">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">System Health</span>
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-emerald-400 tracking-tight">OPTIMAL</div>
                        <p className="text-[11px] text-zinc-600 mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Lat: 42ms • Reli: 99.98%
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ── API Keys ── */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardHeader className="pb-2 border-b border-zinc-800/40">
                    <CardTitle className="text-sm font-semibold text-zinc-300">Your API Keys</CardTitle>
                    <CardDescription className="text-xs text-zinc-600">Manage programmatic access tokens</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Mobile Card View */}
                    <div className="block sm:hidden divide-y divide-zinc-800/40">
                        {keys.map((key) => (
                            <div key={key.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${key.status === 'active' ? 'bg-emerald-500/10' : 'bg-zinc-800'}`}>
                                        <Key className={`w-4 h-4 ${key.status === 'active' ? 'text-emerald-400' : 'text-zinc-600'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-zinc-200">{key.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[11px] text-zinc-500 font-mono">{key.prefix}</span>
                                            <Badge className={`text-[9px] ${key.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                {key.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-red-400 text-xs">Revoke</Button>
                            </div>
                        ))}
                    </div>
                    {/* Desktop Table */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-800/30 border-y border-zinc-800/60">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wider">Name</th>
                                    <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wider">Prefix</th>
                                    <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wider">Created</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/40">
                                {keys.map((key) => (
                                    <tr key={key.id} className="hover:bg-zinc-800/20 transition-colors">
                                        <td className="px-4 py-3 font-medium text-zinc-200">{key.name}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-zinc-500">{key.prefix}</td>
                                        <td className="px-4 py-3">
                                            <Badge className={`text-[10px] ${key.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                {key.status.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-zinc-500 text-xs">{new Date(key.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 text-xs">Revoke</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* ── Service Usage ── */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardHeader className="pb-2 border-b border-zinc-800/40">
                    <CardTitle className="text-sm font-semibold text-zinc-300">Service Usage</CardTitle>
                    <CardDescription className="text-xs text-zinc-600">Breakdown by operation type</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Mobile View */}
                    <div className="block sm:hidden divide-y divide-zinc-800/40">
                        {data?.details?.map((item: any, i: number) => (
                            <div key={i} className="p-4 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
                                <div>
                                    <p className="text-sm font-medium text-zinc-200">{item.op_type}</p>
                                    <p className="text-xs text-zinc-500">{item.count} calls</p>
                                </div>
                                <span className="text-sm font-bold text-emerald-400">${item.total_usdt.toFixed(3)}</span>
                            </div>
                        ))}
                    </div>
                    {/* Desktop Table */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-800/30 border-y border-zinc-800/60">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wider">Operation</th>
                                    <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wider">Calls</th>
                                    <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wider text-right">Cost (USDT)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/40">
                                {data?.details?.map((item: any, i: number) => (
                                    <tr key={i} className="hover:bg-zinc-800/20 transition-colors">
                                        <td className="px-4 py-3 font-medium text-zinc-200">{item.op_type}</td>
                                        <td className="px-4 py-3 text-zinc-400">{item.count}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-emerald-400">${item.total_usdt.toFixed(3)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* ── Recent Requests ── */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardHeader className="pb-2 border-b border-zinc-800/40">
                    <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                        <Code2 className="h-4 w-4 text-blue-400" /> Recent API Requests
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <RecentRequestsTable />
                </CardContent>
            </Card>
        </div>
    );
}

function RecentRequestsTable() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const { data } = await api.get('/builder-api/requests?limit=10');
                if (data.ok) setRequests(data.requests);
            } catch { console.error("Failed to fetch requests"); }
            finally { setLoading(false); }
        };
        fetchRequests();
    }, []);

    if (loading) return <div className="text-center py-8 text-zinc-500 text-sm">Loading requests...</div>;

    return (
        <>
            {/* Mobile */}
            <div className="block sm:hidden divide-y divide-zinc-800/40">
                {requests.map((req, i) => (
                    <div key={req.id || i} className="p-4 hover:bg-zinc-800/20 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-zinc-200">{req.op_type}</span>
                            <span className="text-xs font-mono text-emerald-400">${req.amount_usdt}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-zinc-500">{new Date(req.created_at * 1000).toLocaleString()}</span>
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">{req.status?.toUpperCase() || 'SUCCESS'}</Badge>
                        </div>
                    </div>
                ))}
                {requests.length === 0 && <div className="p-8 text-center text-xs text-zinc-500">No requests found.</div>}
            </div>
            {/* Desktop */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-800/30 border-y border-zinc-800/60">
                        <tr>
                            <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wider">Time</th>
                            <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wider">Request ID</th>
                            <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wider">Operation</th>
                            <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wider text-right">Cost</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                        {requests.map((req, i) => (
                            <tr key={req.id || i} className="hover:bg-zinc-800/20 transition-colors">
                                <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{new Date(req.created_at * 1000).toLocaleString()}</td>
                                <td className="px-4 py-3 font-mono text-xs text-zinc-500">{req.request_id || 'N/A'}</td>
                                <td className="px-4 py-3 font-medium text-zinc-200">{req.op_type}</td>
                                <td className="px-4 py-3">
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">{req.status?.toUpperCase() || 'SUCCESS'}</Badge>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-xs text-emerald-400">${req.amount_usdt}</td>
                            </tr>
                        ))}
                        {requests.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-8 text-xs text-zinc-500">No requests found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
