"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Server, Activity, Clock, Cpu } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AdminNodesPage() {
    const [nodes, setNodes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [nodeDetails, setNodeDetails] = useState<any>(null);

    const fetchNodes = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin-api/nodes');
            if (data.ok) {
                setNodes(data.nodes);
            }
        } catch (err) {
            toast.error('Failed to fetch nodes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNodes();
    }, []);

    const fetchNodeDetails = async (id: string) => {
        try {
            const { data } = await api.get(`/admin-api/nodes/${id}`);
            if (data.ok) {
                setNodeDetails(data);
            }
        } catch (err) {
            toast.error('Failed to load node details');
        }
    };

    const isOnline = (lastSeen: number) => lastSeen > (Date.now() / 1000 - 120); // 2 mins threshold

    const filteredNodes = nodes.filter(node => {
        const matchesSearch = node.node_id.toLowerCase().includes(search.toLowerCase()) ||
            node.wallet.toLowerCase().includes(search.toLowerCase());
        const online = isOnline(node.last_seen);
        const matchesFilter = filter === 'all' || (filter === 'online' ? online : !online);
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Node Monitoring</h2>
                    <p className="text-zinc-400">Live status of all registered nodes.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchNodes}>Refresh</Button>
                </div>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="flex items-center gap-2 bg-zinc-800/50 p-2 rounded-md border border-zinc-700 w-full md:w-96">
                            <Search className="h-4 w-4 text-zinc-400" />
                            <Input
                                placeholder="Search by ID or wallet..."
                                className="border-0 bg-transparent focus-visible:ring-0 h-auto p-0 text-zinc-100 placeholder:text-zinc-500"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={filter === 'all' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilter('all')}
                            >
                                All
                            </Button>
                            <Button
                                variant={filter === 'online' ? 'default' : 'outline'}
                                size="sm"
                                className={filter === 'online' ? 'bg-green-600 hover:bg-green-700' : ''}
                                onClick={() => setFilter('online')}
                            >
                                Online
                            </Button>
                            <Button
                                variant={filter === 'offline' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilter('offline')}
                            >
                                Offline
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader className="border-zinc-800">
                            <TableRow className="hover:bg-transparent border-zinc-800">
                                <TableHead>Node ID</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Device Type</TableHead>
                                <TableHead>Last Seen</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-zinc-500">Loading...</TableCell>
                                </TableRow>
                            ) : filteredNodes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-zinc-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <p>No nodes found.</p>
                                            {process.env.NODE_ENV !== 'production' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={async () => {
                                                        try {
                                                            await api.post('/__test/seed/nodes');
                                                            toast.success("Seeded demo nodes");
                                                            fetchNodes();
                                                        } catch (e) { toast.error("Seeding failed"); }
                                                    }}
                                                >
                                                    Seed Demo Nodes
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredNodes.map((node) => (
                                    <TableRow key={node.node_id} className="border-zinc-800 hover:bg-zinc-800/50">
                                        <TableCell className="font-mono text-zinc-300">
                                            {node.node_id}
                                            <div className="text-xs text-zinc-500">{node.wallet}</div>
                                        </TableCell>
                                        <TableCell>
                                            {isOnline(node.last_seen) ? (
                                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">Online</Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-zinc-800 text-zinc-500 border-zinc-700">Offline</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-zinc-400">
                                            {node.device_type}
                                        </TableCell>
                                        <TableCell className="text-zinc-400 text-xs">
                                            {formatDistanceToNow(node.last_seen * 1000, { addSuffix: true })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Dialog open={selectedNode?.node_id === node.node_id} onOpenChange={(open) => {
                                                if (open) {
                                                    setSelectedNode(node);
                                                    fetchNodeDetails(node.node_id);
                                                } else {
                                                    setSelectedNode(null);
                                                    setNodeDetails(null);
                                                }
                                            }}>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <Activity className="h-4 w-4 text-blue-400" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
                                                    <DialogHeader>
                                                        <DialogTitle className="flex items-center gap-2">
                                                            <Server className="h-5 w-5 text-blue-500" />
                                                            Node Details
                                                        </DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-6 py-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <label className="text-xs font-medium text-zinc-500 uppercase">Node ID</label>
                                                                <div className="text-sm font-mono text-zinc-200 bg-zinc-950 p-2 rounded border border-zinc-800 truncate">
                                                                    {node.node_id}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-xs font-medium text-zinc-500 uppercase">Wallet</label>
                                                                <div className="text-sm font-mono text-zinc-200 bg-zinc-950 p-2 rounded border border-zinc-800 truncate">
                                                                    {node.wallet}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                                                                <Activity className="h-4 w-4" /> Recent Activity (Revenue Events)
                                                            </h4>
                                                            <div className="border border-zinc-800 rounded-md overflow-hidden">
                                                                <Table>
                                                                    <TableHeader className="bg-zinc-950">
                                                                        <TableRow className="border-zinc-800 hover:bg-transparent">
                                                                            <TableHead className="h-8 text-xs">Time</TableHead>
                                                                            <TableHead className="h-8 text-xs">Type</TableHead>
                                                                            <TableHead className="h-8 text-xs text-right">Amount</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {nodeDetails?.activity?.map((event: any, i: number) => (
                                                                            <TableRow key={i} className="border-zinc-800 hover:bg-zinc-800/50">
                                                                                <TableCell className="text-xs text-zinc-400 py-2">
                                                                                    {new Date(event.created_at * 1000).toLocaleTimeString()}
                                                                                </TableCell>
                                                                                <TableCell className="text-xs font-medium text-zinc-300 py-2">{event.op_type}</TableCell>
                                                                                <TableCell className="text-xs text-green-500 text-right py-2">${event.amount_usdt}</TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                        {(!nodeDetails?.activity || nodeDetails.activity.length === 0) && (
                                                                            <TableRow>
                                                                                <TableCell colSpan={3} className="text-center py-4 text-xs text-zinc-500">No recent activity.</TableCell>
                                                                            </TableRow>
                                                                        )}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
