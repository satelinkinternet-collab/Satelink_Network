"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Send, CheckCircle, ExternalLink, Bug } from 'lucide-react';
import api from '@/lib/api';
import {
    PageHeader, ErrorBanner, DataTable, DetailDrawer, JsonViewer,
    SeverityBadge, ConfirmDialog, useIsReadonly, formatTs, timeAgo
} from '@/components/admin/admin-shared';

const statusMap: Record<string, { label: string; color: string }> = {
    open: { label: 'Open', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
    sent_to_agent: { label: 'Sent to Agent', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    resolved: { label: 'Resolved', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
};

export default function IncidentsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [markSentConfirm, setMarkSentConfirm] = useState<number | null>(null);
    const [resolveConfirm, setResolveConfirm] = useState<number | null>(null);
    const [fixRequestConfirm, setFixRequestConfirm] = useState<number | null>(null);
    const readonly = useIsReadonly();

    const fetchData = useCallback(async () => {
        try {
            setError('');
            const params = new URLSearchParams();
            if (statusFilter) params.set('status', statusFilter);
            const res = await api.get(`/admin/diagnostics/incidents?${params}&limit=100`);
            if (res.data.ok) setData(res.data.incidents);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to fetch');
        } finally { setLoading(false); }
    }, [statusFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const markSent = async (id: number) => {
        setActionLoading(true);
        try {
            await api.post(`/admin/diagnostics/incidents/${id}/mark-sent`);
            await fetchData();
            setMarkSentConfirm(null);
            setSelected(null);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed');
        } finally { setActionLoading(false); }
    };

    const resolve = async (id: number) => {
        setActionLoading(true);
        try {
            await api.post(`/admin/diagnostics/incidents/${id}/resolve`, { notes: 'Resolved by admin' });
            await fetchData();
            setResolveConfirm(null);
            setSelected(null);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed');
        } finally { setActionLoading(false); }
    };

    const fixRequest = async (id: number) => {
        setActionLoading(true);
        try {
            const res = await api.post('/admin/diagnostics/fix-request', {
                incident_id: id,
                request_notes: 'Auto-generated fix request from admin UI',
                preferred_scope: 'minimal',
                max_risk: 'low'
            });
            if (res.data.ok) {
                // Copy task_spec to clipboard
                try {
                    await navigator.clipboard.writeText(JSON.stringify(res.data.task_spec, null, 2));
                } catch (_) { }
            }
            await fetchData();
            setFixRequestConfirm(null);
            setSelected(null);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed');
        } finally { setActionLoading(false); }
    };

    const columns = [
        { key: 'severity', label: 'Severity', render: (r: any) => <SeverityBadge severity={r.severity} /> },
        {
            key: 'title', label: 'Title', render: (r: any) => (
                <span className="text-sm text-zinc-300 max-w-[300px] truncate block">{r.title}</span>
            )
        },
        {
            key: 'source_kind', label: 'Source', render: (r: any) => (
                <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] uppercase">{r.source_kind}</Badge>
            )
        },
        {
            key: 'status', label: 'Status', render: (r: any) => {
                const s = statusMap[r.status] || { label: r.status, color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
                return <Badge className={`text-[10px] uppercase border ${s.color}`}>{s.label}</Badge>;
            }
        },
        {
            key: 'created_at', label: 'Time', render: (r: any) => (
                <span className="text-xs text-zinc-500">{timeAgo(r.created_at)}</span>
            )
        },
    ];

    const statuses = ['open', 'sent_to_agent', 'resolved'];
    const openCount = data.filter(d => d.status === 'open').length;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <PageHeader title="Incident Bundles" subtitle={`${openCount} open`}
                actions={<Button variant="ghost" size="sm" onClick={fetchData} className="text-zinc-400 hover:text-zinc-200"><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>}
            />
            {error && <ErrorBanner message={error} onRetry={fetchData} />}

            <div className="flex gap-2 mb-4 flex-wrap">
                <Badge onClick={() => setStatusFilter('')} className={`cursor-pointer text-xs ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>All</Badge>
                {statuses.map(s => (
                    <Badge key={s} onClick={() => setStatusFilter(s)} className={`cursor-pointer text-xs capitalize ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                        {statusMap[s]?.label || s}
                    </Badge>
                ))}
            </div>

            <Card className="bg-zinc-900/60 border-zinc-800/60">
                <CardContent className="p-0">
                    <DataTable columns={columns} data={data} onRowClick={setSelected} loading={loading} searchable emptyMessage="No incidents" />
                </CardContent>
            </Card>

            <DetailDrawer open={!!selected} onClose={() => setSelected(null)} title="Incident Detail">
                {selected && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Severity</p><SeverityBadge severity={selected.severity} /></div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Status</p>
                                <Badge className={`text-[10px] uppercase border ${(statusMap[selected.status] || {}).color || 'bg-zinc-800 text-zinc-400'}`}>
                                    {(statusMap[selected.status] || {}).label || selected.status}
                                </Badge>
                            </div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Source</p><p className="text-sm text-zinc-300">{selected.source_kind}</p></div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Created</p><p className="text-xs text-zinc-400">{formatTs(selected.created_at)}</p></div>
                        </div>
                        <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Title</p><p className="text-sm text-zinc-200">{selected.title}</p></div>

                        {selected.context_json && <JsonViewer data={selected.context_json} label="Context (Debug Bundle)" />}
                        {selected.task_spec_json && <JsonViewer data={selected.task_spec_json} label="Task Spec" />}
                        {selected.request_notes && (
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Notes</p><p className="text-sm text-zinc-300">{selected.request_notes}</p></div>
                        )}
                        {selected.resolved_by && (
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Resolved By</p><p className="text-xs text-zinc-400">{selected.resolved_by} at {formatTs(selected.resolved_at)}</p></div>
                        )}

                        {!readonly && (
                            <div className="flex gap-2 pt-2 flex-wrap">
                                {selected.status === 'open' && (
                                    <>
                                        <Button size="sm" variant="outline" onClick={() => setMarkSentConfirm(selected.id)}
                                            className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10 flex-1">
                                            <Send className="h-3 w-3 mr-1" /> Mark Sent
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => setFixRequestConfirm(selected.id)}
                                            className="text-purple-400 border-purple-500/30 hover:bg-purple-500/10 flex-1">
                                            <Bug className="h-3 w-3 mr-1" /> Fix Request
                                        </Button>
                                    </>
                                )}
                                {selected.status !== 'resolved' && (
                                    <Button size="sm" variant="outline" onClick={() => setResolveConfirm(selected.id)}
                                        className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 flex-1">
                                        <CheckCircle className="h-3 w-3 mr-1" /> Resolve
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </DetailDrawer>

            <ConfirmDialog open={!!markSentConfirm} title="Mark as Sent?" description="Mark this incident as sent to the agent for remediation."
                variant="default" confirmLabel="Mark Sent" onConfirm={() => markSentConfirm && markSent(markSentConfirm)} onCancel={() => setMarkSentConfirm(null)} loading={actionLoading} />
            <ConfirmDialog open={!!resolveConfirm} title="Resolve Incident?" description="Mark this incident as resolved."
                variant="default" confirmLabel="Resolve" onConfirm={() => resolveConfirm && resolve(resolveConfirm)} onCancel={() => setResolveConfirm(null)} loading={actionLoading} />
            <ConfirmDialog open={!!fixRequestConfirm} title="Generate Fix Request?" description="Create a fix-request task spec and mark incident as sent to agent. The task spec will be copied to clipboard."
                variant="warning" confirmLabel="Generate" onConfirm={() => fixRequestConfirm && fixRequest(fixRequestConfirm)} onCancel={() => setFixRequestConfirm(null)} loading={actionLoading} />
        </div>
    );
}
