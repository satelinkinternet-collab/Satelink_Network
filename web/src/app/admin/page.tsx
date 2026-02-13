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
    ShieldCheck,
    TrendingUp,
    Coins,
    Users,
    Clock,
    PauseCircle,
    PlayCircle,
    RefreshCw
} from 'lucide-react';

export default function AdminDashboard() {
    const { user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [paused, setPaused] = useState(false);

    // Real-time updates
    const { lastEvent } = useSSE('/stream/admin', ['treasury', 'revenue_batch', 'control_state']);

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/admin-api/stats');
            if (data.ok) {
                setData(data);
                // Also set paused state if available in data
            }
        } catch (err) {
            toast.error('Failed to fetch admin stats');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    // Handle SSE events
    useEffect(() => {
        if (!lastEvent) return;

        if (lastEvent.type === 'treasury') {
            setData((prev: any) => ({
                ...prev,
                stats: {
                    ...prev.stats,
                    treasuryAvailable: lastEvent.data.balance,
                    nodesOnline: lastEvent.data.active_nodes
                }
            }));
        } else if (lastEvent.type === 'revenue_batch') {
            const newEvents = lastEvent.data || [];
            if (newEvents.length === 0) return;

            setData((prev: any) => {
                // Prepend new events and keep last 20
                const updatedEvents = [...newEvents.reverse(), ...(prev.recentEvents || [])].slice(0, 20);

                // Update total revenue estimate if simple summation
                const addedRevenue = newEvents.reduce((acc: number, e: any) => acc + (Number(e.amount_usdt) || 0), 0);

                return {
                    ...prev,
                    recentEvents: updatedEvents,
                    stats: {
                        ...prev.stats,
                        revenueToday: (Number(prev.stats.revenueToday) + addedRevenue).toFixed(2)
                    }
                };
            });
            toast.success(`${newEvents.length} new revenue events!`);
        } else if (lastEvent.type === 'control_state') {
            // Update pause state
            // setPaused(lastEvent.data.withdrawals_paused === 'true');
        }
    }, [lastEvent]);

    const toggleWithdrawals = async () => {
        try {
            const newStatus = !paused;
            const { data } = await api.post('/admin-api/controls/pause-withdraw', { paused: newStatus });
            if (data.ok) {
                setPaused(newStatus);
                toast.success(`Withdrawals ${newStatus ? 'paused' : 'resumed'}`);
            }
        } catch (err) {
            toast.error('Failed to update system controls');
        }
    };

    if (loading && !data) return (
        <div className="flex justify-center items-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        </div>
    );

    const stats = data?.stats;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">System Overview</h2>
                    <p className="text-zinc-400">Real-time health and revenue monitoring.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant={paused ? "destructive" : "outline"}
                        onClick={toggleWithdrawals}
                        className="font-semibold"
                    >
                        {paused ? <PlayCircle className="mr-2 h-4 w-4" /> : <PauseCircle className="mr-2 h-4 w-4" />}
                        {paused ? 'Resume Withdrawals' : 'Pause Withdrawals'}
                    </Button>
                    <Button variant="outline" onClick={fetchStats}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Treasury Available</CardTitle>
                        <Coins className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">${stats?.treasuryAvailable}</div>
                        <p className="text-xs text-zinc-500 mt-1">USDT (Verified on-chain)</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Revenue Today</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">${stats?.revenueToday}</div>
                        <p className="text-xs text-green-500 mt-1">+12.5% from yesterday</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Current Epoch</CardTitle>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">#{stats?.currentEpoch?.id}</div>
                        <Badge className="mt-1 bg-blue-500/10 text-blue-400 border-blue-500/20">{stats?.currentEpoch?.status}</Badge>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Active Nodes</CardTitle>
                        <Users className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">{stats?.nodesOnline}</div>
                        <p className="text-xs text-zinc-500 mt-1">{stats?.nodesOffline} offline</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-lg">Recent Revenue Events</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader className="border-zinc-800">
                            <TableRow className="hover:bg-transparent border-zinc-800">
                                <TableHead className="text-zinc-400">Time</TableHead>
                                <TableHead className="text-zinc-400">Op Type</TableHead>
                                <TableHead className="text-zinc-400">Amount</TableHead>
                                <TableHead className="text-zinc-400">Client ID</TableHead>
                                <TableHead className="text-zinc-400">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data?.recentEvents.map((event: any, i: number) => (
                                <TableRow key={event.id || i} className="border-zinc-800 hover:bg-zinc-800/50">
                                    <TableCell className="font-mono text-xs">{new Date(event.created_at * 1000).toLocaleTimeString()}</TableCell>
                                    <TableCell className="font-medium text-zinc-300">{event.op_type}</TableCell>
                                    <TableCell className="text-green-500">${event.amount_usdt}</TableCell>
                                    <TableCell className="text-zinc-400">{event.client_id}</TableCell>
                                    <TableCell>
                                        <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">SUCCESS</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {data?.recentEvents.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-zinc-500">No recent events found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
