"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Ban } from 'lucide-react';
import api from '@/lib/api';
import {
    PageHeader, ErrorBanner, DataTable, DetailDrawer, StatusBadge,
    ConfirmDialog, JsonViewer, useIsReadonly, formatTs, timeAgo
} from '@/components/admin/admin-shared';

interface Node {
    node_id: string;
    wallet: string;
    status: string;
    device_type: string;
    region: string;
    last_seen: number;
    trust_score: number;
    [k: string]: any;
}

export default function NetworkNodesPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [nodes, setNodes] = useState<Node[]>([]);
    const [selected, setSelected] = useState<Node | null>(null);
    const [nodeDetail, setNodeDetail] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [banConfirm, setBanConfirm] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const readonly = useIsReadonly();

    const fetchNodes = useCallback(async () => {
        try {
            setError('');
            const params = new URLSearchParams();
            if (statusFilter) params.set('status', statusFilter);
            const res = await api.get(`/admin/network/nodes?${params}`);
            if (res.data.ok) setNodes(res.data.nodes);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to fetch');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { fetchNodes(); }, [fetchNodes]);

    const openDetail = async (node: Node) => {
        setSelected(node);
        try {
            const res = await api.get(`/admin/network/nodes/${node.node_id}`);
            if (res.data.ok) setNodeDetail(res.data);
        } catch { }
    };

    const banNode = async (nodeId: string) => {
        setActionLoading(true);
        try {
            await api.post('/admin/security/ban-node', { node_id: nodeId, reason: 'Admin action' });
            await fetchNodes();
            setBanConfirm(null);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Ban failed');
        } finally {
            setActionLoading(false);
        }
    };

    const columns = [
        { key: 'node_id', label: 'Node ID', render: (r: Node) => <span className="font-mono text-xs text-blue-400">{r.node_id?.slice(0, 12)}...</span> },
        { key: 'status', label: 'Status', render: (r: Node) => <StatusBadge status={r.status} /> },
        { key: 'device_type', label: 'Type', render: (r: Node) => <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] uppercase">{r.device_type || 'N/A'}</Badge> },
        { key: 'region', label: 'Region' },
        { key: 'trust_score', label: 'Trust', render: (r: Node) => <span className={r.trust_score > 80 ? 'text-emerald-400' : r.trust_score > 50 ? 'text-amber-400' : 'text-red-400'}>{r.trust_score ?? '—'}</span> },
        { key: 'last_seen', label: 'Last Seen', render: (r: Node) => <span className="text-xs text-zinc-500">{timeAgo(r.last_seen)}</span> },
    ];

    const statuses = ['online', 'offline', 'banned'];

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <PageHeader title="Network Fleet" subtitle={`${nodes.length} nodes`}
                actions={
                    <Button variant="ghost" size="sm" onClick={fetchNodes} className="text-zinc-400 hover:text-zinc-200">
                        <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                    </Button>
                }
            />

            {error && <ErrorBanner message={error} onRetry={fetchNodes} />}

            {/* Status Filter */}
            <div className="flex gap-2 mb-4 flex-wrap">
                <Badge
                    onClick={() => setStatusFilter('')}
                    className={`cursor-pointer text-xs ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                >
                    All
                </Badge>
                {statuses.map(s => (
                    <Badge
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`cursor-pointer text-xs capitalize ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                    >
                        {s}
                    </Badge>
                ))}
            </div>

            <Card className="bg-zinc-900/60 border-zinc-800/60">
                <CardContent className="p-0">
                    <DataTable columns={columns} data={nodes} onRowClick={openDetail} loading={loading} searchable searchPlaceholder="Search nodes..." emptyMessage="No nodes found" />
                </CardContent>
            </Card>

            {/* Detail Drawer */}
            <DetailDrawer open={!!selected} onClose={() => { setSelected(null); setNodeDetail(null); }} title={`Node: ${selected?.node_id?.slice(0, 16)}...`}>
                {selected && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Status</p><StatusBadge status={selected.status} /></div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Type</p><p className="text-sm text-zinc-300">{selected.device_type || '—'}</p></div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Region</p><p className="text-sm text-zinc-300">{selected.region || '—'}</p></div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Trust</p><p className="text-sm text-zinc-300">{selected.trust_score ?? '—'}</p></div>
                            <div className="col-span-2"><p className="text-[10px] text-zinc-500 uppercase mb-1">Last Seen</p><p className="text-sm text-zinc-300">{formatTs(selected.last_seen)}</p></div>
                        </div>

                        {nodeDetail?.recent_revenue?.length > 0 && (
                            <div>
                                <p className="text-xs text-zinc-400 font-semibold mb-2">Recent Revenue</p>
                                {nodeDetail.recent_revenue.slice(0, 5).map((r: any, i: number) => (
                                    <div key={i} className="flex justify-between py-1.5 border-b border-zinc-800/40 text-xs">
                                        <span className="text-zinc-400">{r.op_type}</span>
                                        <span className="text-emerald-400">${parseFloat(r.amount_usdt || 0).toFixed(4)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <JsonViewer data={selected} label="Full Node Data" />

                        {!readonly && selected.status !== 'banned' && (
                            <Button variant="destructive" size="sm" onClick={() => setBanConfirm(selected.node_id)} className="w-full">
                                <Ban className="h-4 w-4 mr-2" /> Ban Node
                            </Button>
                        )}
                    </div>
                )}
            </DetailDrawer>

            <ConfirmDialog
                open={!!banConfirm}
                title="Ban Node?"
                description={`This will immediately ban node ${banConfirm?.slice(0, 12)}... and prevent it from earning rewards.`}
                variant="danger"
                confirmLabel="Ban Node"
                onConfirm={() => banConfirm && banNode(banConfirm)}
                onCancel={() => setBanConfirm(null)}
                loading={actionLoading}
            />
        </div>
    );
}
