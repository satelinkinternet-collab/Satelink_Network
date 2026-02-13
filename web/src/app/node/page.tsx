"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useSSE } from '@/hooks/use-sse';
import {
    Activity,
    Wallet,
    CheckCircle2,
    XCircle,
    ArrowUpRight,
    Download,
    Loader2,
    Zap,
    DollarSign
} from 'lucide-react';
import { StatCard } from '@/components/ui-custom/stat-card';
import { DataTable } from '@/components/ui-custom/data-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function NodeDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Real-time updates
    const { lastEvent } = useSSE('/stream/node', ['node_status', 'earnings']);

    // Initial fetch
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/node-api/stats');
                setStats(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchStats();
    }, [user]);

    // Update state from SSE
    useEffect(() => {
        if (!lastEvent) return;
        if (lastEvent.type === 'node_status') {
            setStats((prev: any) => ({
                ...prev,
                stats: { ...prev.stats, active: lastEvent.data.online, lastHeartbeat: lastEvent.data.last_seen }
            }));
        } else if (lastEvent.type === 'earnings') {
            setStats((prev: any) => ({
                ...prev,
                stats: { ...prev.stats, claimable: lastEvent.data.unpaid_balance, totalEarned: prev.stats.totalEarned }, // Update valid fields
                earnings: lastEvent.data.recent_epochs?.map((e: any) => ({
                    epoch_id: e.epoch_id,
                    amount_usdt: e.amount_usdt || 0,
                    status: e.status || 'PENDING'
                })) || prev.earnings
            }));
        }
    }, [lastEvent]);

    const handleClaim = async () => {
        try {
            toast.loading("Claiming rewards...");
            const signature = `0x_mock_signature_${Date.now()}`;
            const { data: result } = await api.post('/node-api/claim', { signature });
            toast.dismiss();

            if (result.ok) {
                toast.success(`Successfully claimed $${result.claimed} USDT`);
                const res = await api.get('/node-api/stats');
                setStats(res.data);
            }
        } catch (err: any) {
            toast.dismiss();
            toast.error(err.response?.data?.error || "Claim failed");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const nodeStats = stats?.stats || {};

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-zinc-100">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Node Operations</h2>
                    <p className="text-zinc-400">Manage your node and track performance.</p>
                </div>
                <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2">
                    <span className="text-xs font-semibold text-zinc-400">STATUS:</span>
                    {nodeStats.active ? (
                        <div className="flex items-center gap-2 text-green-500 text-xs font-bold">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            ONLINE
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-red-500 text-xs font-bold">
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            OFFLINE
                        </div>
                    )}
                </div>
            </div>

            {/* Pairing Section */}
            {!nodeStats.active && (
                <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-blue-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Zap className="h-5 w-5 text-blue-500" /> Connect Device
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row gap-6 items-center">
                            <div className="flex-1 space-y-2">
                                <p className="text-sm text-zinc-400">
                                    To start earning, pair your hardware node or CLI client with this account.
                                    Generate a pairing code below and enter it on your device.
                                </p>
                            </div>
                            <PairingActions />
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Earned</CardTitle>
                        <Wallet className="h-4 w-4 text-zinc-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">${nodeStats.totalEarned?.toFixed(2) || '0.00'}</div>
                        <p className="text-xs text-zinc-500 mt-1">Cumulative lifetime earnings</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 border-blue-500/20 shadow-blue-500/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Claimable Rewards</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <div className="text-2xl font-bold text-zinc-100">${nodeStats.claimable?.toFixed(2) || '0.00'}</div>
                        <Button
                            disabled={!nodeStats.claimable || Number(nodeStats.claimable) <= 0}
                            onClick={handleClaim}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Claim Rewards
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Avg Uptime</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">99.9%</div>
                        <p className="text-xs text-green-500 mt-1">Last 7 days average</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-1">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Epoch Rewards</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader className="border-zinc-800">
                                <TableRow className="hover:bg-transparent border-zinc-800">
                                    <TableHead className="text-zinc-400 text-xs">Epoch</TableHead>
                                    <TableHead className="text-zinc-400 text-xs">Amount</TableHead>
                                    <TableHead className="text-zinc-400 text-xs">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats?.earnings?.map((e: any, i: number) => (
                                    <TableRow key={i} className="border-zinc-800 hover:bg-zinc-800/50">
                                        <TableCell className="font-mono text-xs">#{e.epoch_id}</TableCell>
                                        <TableCell className="font-medium text-zinc-300 text-sm">${Number(e.amount_usdt).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge className={e.status === 'UNPAID' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}>
                                                {e.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function PairingActions() {
    const [code, setCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const generateCode = async () => {
        setLoading(true);
        try {
            const { data } = await api.post('/pair/request', {});
            if (data.pair_code) {
                setCode(data.pair_code);
                toast.success("Pairing code generated");
            }
        } catch (err) {
            toast.error("Failed to generate code");
        } finally {
            setLoading(false);
        }
    };

    if (code) {
        return (
            <div className="flex flex-col items-center gap-2 p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Your Pairing Code</span>
                <div className="text-3xl font-mono font-bold tracking-widest text-blue-400">{code}</div>
                <p className="text-xs text-zinc-400 text-center max-w-[200px] mt-2">
                    Enter this code in your device terminal or UI to complete setup.
                </p>
                {process.env.NODE_ENV !== 'production' && (
                    <Button
                        variant="secondary"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={async () => {
                            try {
                                const deviceId = `sim_device_${Date.now()}`;
                                await api.post('/pair/confirm', { code, device_id: deviceId });
                                toast.success(`Simulated device ${deviceId} connected!`);
                                setCode(null); // Clear code to show success state eventually
                            } catch (e: any) {
                                toast.error(e.response?.data?.error || "Pairing failed");
                            }
                        }}
                    >
                        Simulate Device Connection
                    </Button>
                )}
            </div>
        );
    }

    return (
        <Button onClick={generateCode} disabled={loading} className="bg-blue-600 hover:bg-blue-700 font-semibold px-8">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            Generate Pair Code
        </Button>
    );
}
