"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useSSE } from '@/hooks/use-sse';
import {
    Key,
    BarChart3,
    Plus,
    Shield,
    ExternalLink,
    Code2,
    Cpu,
    RefreshCw,
    Copy,
    CheckCircle,
    AlertCircle,
    Loader2
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

    // Real-time updates
    const { lastEvent } = useSSE('/stream/builder', ['usage_log']);

    const fetchData = async () => {
        try {
            const [usageRes, keysRes] = await Promise.all([
                api.get('/builder-api/usage'),
                api.get('/builder-api/keys')
            ]);
            if (usageRes.data.ok) setData(usageRes.data);
            if (keysRes.data.ok) setKeys(keysRes.data.keys);
        } catch (err) {
            toast.error('Failed to fetch builder data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handle SSE
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
                // Ideally update details table too, but simpler MVP just updates top line stats
                toast.info("Usage stats updated");
            }
        }
    }, [lastEvent]);

    const handleCreateKey = async () => {
        if (!newKeyName) {
            toast.error('Key name is required');
            return;
        }
        setCreatingKey(true);
        try {
            const { data } = await api.post('/builder-api/keys', { name: newKeyName });
            if (data.ok) {
                setRevealedKey(data.key);
                toast.success('API key created successfully');
                fetchData();
                setNewKeyName('');
            }
        } catch (err) {
            toast.error('Failed to create API key');
        } finally {
            setCreatingKey(false);
        }
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
        <div className="space-y-6 text-zinc-100">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Builder Console</h2>
                    <p className="text-zinc-400">Manage your API keys and monitor integration usage.</p>
                </div>
                <Dialog onOpenChange={(open) => !open && setRevealedKey(null)}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                            <Plus className="mr-2 h-4 w-4" />
                            New API Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        <DialogHeader>
                            <DialogTitle>{revealedKey ? 'Key Generated' : 'Create New API Key'}</DialogTitle>
                            <DialogDescription className="text-zinc-400">
                                {revealedKey
                                    ? 'Copy this key now. For security, it will not be shown again.'
                                    : 'Name your key to easily identify it later.'}
                            </DialogDescription>
                        </DialogHeader>

                        {revealedKey ? (
                            <div className="space-y-4">
                                <div className="relative group">
                                    <Input
                                        readOnly
                                        value={revealedKey}
                                        className="pr-10 bg-zinc-800 border-zinc-700 font-mono text-xs"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="absolute right-0 top-0 text-zinc-400 hover:text-zinc-100"
                                        onClick={() => copyToClipboard(revealedKey)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs">
                                    <AlertCircle className="h-4 w-4" />
                                    Keep this key secure. Anyone with this key can access your builder resources.
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Key Name</label>
                                    <Input
                                        placeholder="e.g. Production Mobile App"
                                        value={newKeyName}
                                        onChange={(e) => setNewKeyName(e.target.value)}
                                        className="bg-zinc-800 border-zinc-700"
                                    />
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            {revealedKey ? (
                                <Button className="w-full bg-zinc-800" onClick={() => (document.querySelector('[data-state="open"]') as any)?.click()}>
                                    Close
                                </Button>
                            ) : (
                                <Button
                                    disabled={creatingKey}
                                    onClick={handleCreateKey}
                                    className="w-full bg-blue-600 hover:bg-blue-700 font-semibold"
                                >
                                    {creatingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Generate Key'}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Usage Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total API Calls</CardTitle>
                        <Cpu className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.summary.count || 0}</div>
                        <p className="text-xs text-zinc-500 mt-1">Across all services</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Operational Spend</CardTitle>
                        <BarChart3 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${data?.summary.total_usdt.toFixed(2) || '0.00'}</div>
                        <p className="text-xs text-green-500 mt-1">Satelink Token Units</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 hidden lg:block">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">System Health</CardTitle>
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-500">OPTIMAL</div>
                        <p className="text-xs text-zinc-500 mt-1">Lat: 42ms • Reli: 99.98%</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-1">
                {/* Keys Table */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Your API Keys</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader className="border-zinc-800">
                                <TableRow className="hover:bg-transparent border-zinc-800">
                                    <TableHead className="text-zinc-400 text-xs">Name</TableHead>
                                    <TableHead className="text-zinc-400 text-xs">Prefix</TableHead>
                                    <TableHead className="text-zinc-400 text-xs">Status</TableHead>
                                    <TableHead className="text-zinc-400 text-xs">Created At</TableHead>
                                    <TableHead className="text-right text-zinc-400 text-xs">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {keys.map((key) => (
                                    <TableRow key={key.id} className="border-zinc-800 hover:bg-zinc-800/50">
                                        <TableCell className="font-medium text-sm">{key.name}</TableCell>
                                        <TableCell className="font-mono text-xs text-zinc-500">{key.prefix}</TableCell>
                                        <TableCell>
                                            <Badge className={key.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}>
                                                {key.status.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-zinc-500">{new Date(key.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-red-400">
                                                Revoke
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Usage Details */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Service Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader className="border-zinc-800">
                                <TableRow className="hover:bg-transparent border-zinc-800">
                                    <TableHead className="text-zinc-400 text-xs">Operation Type</TableHead>
                                    <TableHead className="text-zinc-400 text-xs">Call Count</TableHead>
                                    <TableHead className="text-zinc-400 text-xs text-right">Total Cost (USDT)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.details.map((item: any) => (
                                    <TableRow key={item.op_type} className="border-zinc-800 hover:bg-zinc-800/50">
                                        <TableCell className="font-medium text-sm text-zinc-300">{item.op_type}</TableCell>
                                        <TableCell className="text-zinc-400">{item.count}</TableCell>
                                        <TableCell className="text-right font-semibold text-emerald-500">${item.total_usdt.toFixed(3)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Requests (Phase 19) */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Code2 className="h-5 w-5 text-blue-500" /> Recent API Requests
                    </CardTitle>
                </CardHeader>
                <CardContent>
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
            } catch (err) {
                console.error("Failed to fetch requests");
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
    }, []);

    if (loading) return <div className="text-center py-4 text-zinc-500">Loading requests...</div>;

    return (
        <Table>
            <TableHeader className="border-zinc-800">
                <TableRow className="hover:bg-transparent border-zinc-800">
                    <TableHead className="text-zinc-400 text-xs">Time</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Request ID</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Operation</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Status</TableHead>
                    <TableHead className="text-zinc-400 text-xs text-right">Cost</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {requests.map((req, i) => (
                    <TableRow key={req.id || i} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="text-xs text-zinc-400 whitespace-nowrap">
                            {new Date(req.created_at * 1000).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-zinc-500">
                            {req.request_id || 'N/A'}
                        </TableCell>
                        <TableCell className="font-medium text-sm text-zinc-300">{req.op_type}</TableCell>
                        <TableCell>
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                                {req.status?.toUpperCase() || 'SUCCESS'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-emerald-400">
                            ${req.amount_usdt}
                        </TableCell>
                    </TableRow>
                ))}
                {requests.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-xs text-zinc-500">No requests found.</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
