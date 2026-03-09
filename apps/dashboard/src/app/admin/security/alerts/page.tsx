"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, UserX, Shield } from 'lucide-react';
import api from '@/lib/api';
import {
    PageHeader, ErrorBanner, DataTable, DetailDrawer, JsonViewer,
    SeverityBadge, StatusBadge, ConfirmDialog, useIsReadonly, formatTs, timeAgo
} from '@/components/admin/admin-shared';

export default function SecurityAlertsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [triageConfirm, setTriageConfirm] = useState<number | null>(null);
    const [closeConfirm, setCloseConfirm] = useState<number | null>(null);
    const [holdWallet, setHoldWallet] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const readonly = useIsReadonly();

    const fetch = useCallback(async () => {
        try {
            setError('');
            const params = new URLSearchParams();
            if (statusFilter) params.set('status', statusFilter);
            const res = await api.get(`/admin/security/alerts?${params}&limit=200`);
            if (res.data.ok) setData(res.data.alerts);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to fetch');
        } finally { setLoading(false); }
    }, [statusFilter]);

    useEffect(() => { fetch(); }, [fetch]);

    const triageAlert = async (id: number) => {
        setActionLoading(true);
        try {
            await api.post(`/admin/security/alerts/${id}/triage`, { notes: 'Triaged by admin' });
            await fetch();
            setTriageConfirm(null);
            setSelected(null);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed');
        } finally { setActionLoading(false); }
    };

    const closeAlert = async (id: number) => {
        setActionLoading(true);
        try {
            await api.post(`/admin/security/alerts/${id}/close`, { notes: 'Resolved by admin' });
            await fetch();
            setCloseConfirm(null);
            setSelected(null);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed');
        } finally { setActionLoading(false); }
    };

    const holdWalletAction = async (wallet: string) => {
        setActionLoading(true);
        try {
            await api.post('/admin/security/hold-wallet', { wallet, reason: 'Security alert investigation' });
            setHoldWallet(null);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed');
        } finally { setActionLoading(false); }
    };

    const columns = [
        { key: 'severity', label: 'Severity', render: (r: any) => <SeverityBadge severity={r.severity} /> },
        { key: 'title', label: 'Title', render: (r: any) => <span className="text-sm text-zinc-300 max-w-[300px] truncate block">{r.title}</span> },
        { key: 'category', label: 'Category', render: (r: any) => <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] uppercase">{r.category}</Badge> },
        { key: 'entity_type', label: 'Entity', render: (r: any) => <span className="text-xs text-zinc-500">{r.entity_type}: {r.entity_id?.slice(0, 10)}</span> },
        { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
        { key: 'created_at', label: 'Time', render: (r: any) => <span className="text-xs text-zinc-500">{timeAgo(r.created_at)}</span> },
    ];

    const statuses = ['open', 'triaged', 'closed'];

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <PageHeader title="Security Alerts" subtitle={`${data.filter(d => d.status === 'open').length} open`}
                actions={<Button variant="ghost" size="sm" onClick={fetch} className="text-zinc-400 hover:text-zinc-200"><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>}
            />
            {error && <ErrorBanner message={error} onRetry={fetch} />}

            <div className="flex gap-2 mb-4 flex-wrap">
                <Badge onClick={() => setStatusFilter('')} className={`cursor-pointer text-xs ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>All</Badge>
                {statuses.map(s => (
                    <Badge key={s} onClick={() => setStatusFilter(s)} className={`cursor-pointer text-xs capitalize ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>{s}</Badge>
                ))}
            </div>

            <Card className="bg-zinc-900/60 border-zinc-800/60">
                <CardContent className="p-0">
                    <DataTable columns={columns} data={data} onRowClick={setSelected} loading={loading} searchable emptyMessage="No alerts" />
                </CardContent>
            </Card>

            <DetailDrawer open={!!selected} onClose={() => setSelected(null)} title="Alert Detail">
                {selected && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Severity</p><SeverityBadge severity={selected.severity} /></div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Status</p><StatusBadge status={selected.status} /></div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Category</p><p className="text-sm text-zinc-300">{selected.category}</p></div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Entity</p><p className="text-sm text-zinc-300">{selected.entity_type}: {selected.entity_id}</p></div>
                        </div>
                        <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Title</p><p className="text-sm text-zinc-200">{selected.title}</p></div>
                        <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Created</p><p className="text-xs text-zinc-400">{formatTs(selected.created_at)}</p></div>

                        {selected.evidence_json && <JsonViewer data={selected.evidence_json} label="Evidence" />}
                        {selected.resolution_notes && <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Resolution Notes</p><p className="text-sm text-zinc-300">{selected.resolution_notes}</p></div>}

                        {!readonly && (
                            <div className="flex gap-2 pt-2">
                                {selected.status === 'open' && (
                                    <Button size="sm" variant="outline" onClick={() => setTriageConfirm(selected.id)} className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10 flex-1">
                                        <Shield className="h-3 w-3 mr-1" /> Triage
                                    </Button>
                                )}
                                {selected.status !== 'closed' && (
                                    <Button size="sm" variant="outline" onClick={() => setCloseConfirm(selected.id)} className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 flex-1">
                                        Close
                                    </Button>
                                )}
                                {selected.entity_type === 'builder' && (
                                    <Button size="sm" variant="destructive" onClick={() => setHoldWallet(selected.entity_id)} className="flex-1">
                                        <UserX className="h-3 w-3 mr-1" /> Hold Wallet
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </DetailDrawer>

            <ConfirmDialog open={!!triageConfirm} title="Triage Alert?" description="Mark this alert as triaged and assign to yourself." variant="warning" confirmLabel="Triage" onConfirm={() => triageConfirm && triageAlert(triageConfirm)} onCancel={() => setTriageConfirm(null)} loading={actionLoading} />
            <ConfirmDialog open={!!closeConfirm} title="Close Alert?" description="Mark this alert as closed/resolved." variant="default" confirmLabel="Close Alert" onConfirm={() => closeConfirm && closeAlert(closeConfirm)} onCancel={() => setCloseConfirm(null)} loading={actionLoading} />
            <ConfirmDialog open={!!holdWallet} title="Hold Wallet?" description={`This will freeze wallet ${holdWallet?.slice(0, 12)}... until further investigation.`} variant="danger" confirmLabel="Hold" onConfirm={() => holdWallet && holdWalletAction(holdWallet)} onCancel={() => setHoldWallet(null)} loading={actionLoading} />
        </div>
    );
}
