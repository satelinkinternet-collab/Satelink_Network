"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, RotateCcw } from 'lucide-react';
import api from '@/lib/api';
import {
    PageHeader, ErrorBanner, DataTable, ConfirmDialog,
    useIsReadonly, formatTs, StatusBadge
} from '@/components/admin/admin-shared';

export default function EpochsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<any[]>([]);
    const [confirmAction, setConfirmAction] = useState<{ type: 'finalize' | 'recompute'; id: number } | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const readonly = useIsReadonly();

    const fetch = useCallback(async () => {
        try {
            setError('');
            const res = await api.get('/admin/rewards/epochs');
            if (res.data.ok) setData(res.data.epochs);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to fetch');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const executeAction = async () => {
        if (!confirmAction) return;
        setActionLoading(true);
        try {
            if (confirmAction.type === 'finalize') {
                await api.post(`/admin/rewards/epochs/${confirmAction.id}/finalize`);
            } else {
                // 2-step recompute — first get token, then confirm
                const step1 = await api.post(`/admin/rewards/epochs/${confirmAction.id}/recompute`);
                if (step1.data.confirm_token) {
                    await api.post(`/admin/rewards/epochs/${confirmAction.id}/recompute`, { confirm_token: step1.data.confirm_token });
                }
            }
            await fetch();
        } catch (e: any) {
            setError(e.response?.data?.error || 'Action failed');
        } finally {
            setActionLoading(false);
            setConfirmAction(null);
        }
    };

    const columns = [
        { key: 'id', label: 'Epoch' },
        { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
        { key: 'start_ts', label: 'Start', render: (r: any) => <span className="text-xs text-zinc-500">{formatTs(r.start_ts)}</span> },
        { key: 'end_ts', label: 'End', render: (r: any) => <span className="text-xs text-zinc-500">{formatTs(r.end_ts)}</span> },
        { key: 'total_revenue_usdt', label: 'Revenue', render: (r: any) => <span className="font-mono text-sm text-emerald-400">${parseFloat(r.total_revenue_usdt || 0).toFixed(2)}</span> },
        {
            key: 'actions', label: 'Actions', render: (r: any) => (
                <div className="flex gap-1">
                    {!readonly && r.status !== 'FINALIZED' && (
                        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setConfirmAction({ type: 'finalize', id: r.id }); }} className="text-xs text-emerald-400 hover:text-emerald-300 h-7 px-2">
                            <CheckCircle className="h-3 w-3 mr-1" /> Finalize
                        </Button>
                    )}
                    {!readonly && (
                        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setConfirmAction({ type: 'recompute', id: r.id }); }} className="text-xs text-amber-400 hover:text-amber-300 h-7 px-2">
                            <RotateCcw className="h-3 w-3 mr-1" /> Recompute
                        </Button>
                    )}
                </div>
            )
        },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <PageHeader title="Reward Epochs" subtitle="Manage epoch lifecycle and distributions"
                actions={<Button variant="ghost" size="sm" onClick={fetch} className="text-zinc-400 hover:text-zinc-200"><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>}
            />
            {error && <ErrorBanner message={error} onRetry={fetch} />}
            <Card className="bg-zinc-900/60 border-zinc-800/60">
                <CardContent className="p-0">
                    <DataTable columns={columns} data={data} loading={loading} emptyMessage="No epochs" />
                </CardContent>
            </Card>

            <ConfirmDialog
                open={!!confirmAction}
                title={confirmAction?.type === 'finalize' ? 'Finalize Epoch?' : 'Recompute Epoch?'}
                description={confirmAction?.type === 'finalize' ? 'This will lock the epoch and distribute rewards.' : 'This is a destructive 2-step operation that will recalculate all earnings.'}
                variant={confirmAction?.type === 'recompute' ? 'danger' : 'warning'}
                confirmLabel={confirmAction?.type === 'finalize' ? 'Finalize' : 'Recompute'}
                onConfirm={executeAction}
                onCancel={() => setConfirmAction(null)}
                loading={actionLoading}
            />
        </div>
    );
}
