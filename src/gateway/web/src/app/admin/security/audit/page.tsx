"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErrorBanner, DataTable, DetailDrawer, JsonViewer, formatTs, timeAgo } from '@/components/admin/admin-shared';

export default function AuditPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);

    const fetch = useCallback(async () => {
        try {
            setError('');
            const res = await api.get('/admin/security/audit?limit=200');
            if (res.data.ok) setData(res.data.logs);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to fetch');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const actionColors: Record<string, string> = {
        PAUSE_WITHDRAWALS: 'bg-red-500/10 text-red-400 border-red-500/20',
        SECURITY_FREEZE: 'bg-red-500/10 text-red-400 border-red-500/20',
        BAN_NODE: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        HOLD_WALLET: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        UPDATE_FLAG: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        UPDATE_LIMIT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    };

    const columns = [
        { key: 'action_type', label: 'Action', render: (r: any) => <Badge className={`text-[10px] uppercase ${actionColors[r.action_type] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{r.action_type}</Badge> },
        { key: 'actor_wallet', label: 'Actor', render: (r: any) => <span className="font-mono text-xs text-blue-400">{r.actor_wallet?.slice(0, 12)}...</span> },
        { key: 'target_type', label: 'Target', render: (r: any) => <span className="text-xs text-zinc-400">{r.target_type}: {r.target_id?.slice(0, 12)}</span> },
        { key: 'created_at', label: 'Time', render: (r: any) => <span className="text-xs text-zinc-500">{timeAgo(r.created_at)}</span> },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <PageHeader title="Audit Log" subtitle="Full admin action history with before/after diffs"
                actions={<Button variant="ghost" size="sm" onClick={fetch} className="text-zinc-400 hover:text-zinc-200"><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>}
            />
            {error && <ErrorBanner message={error} onRetry={fetch} />}
            <Card className="bg-zinc-900/60 border-zinc-800/60">
                <CardContent className="p-0">
                    <DataTable columns={columns} data={data} onRowClick={setSelected} loading={loading} searchable searchPlaceholder="Search actions..." emptyMessage="No audit events" />
                </CardContent>
            </Card>

            <DetailDrawer open={!!selected} onClose={() => setSelected(null)} title="Audit Entry">
                {selected && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Action</p><Badge className={`text-[10px] uppercase ${actionColors[selected.action_type] || 'bg-zinc-800 text-zinc-400'}`}>{selected.action_type}</Badge></div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Time</p><p className="text-xs text-zinc-400">{formatTs(selected.created_at)}</p></div>
                        </div>
                        <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Actor</p><p className="text-sm font-mono text-blue-400">{selected.actor_wallet}</p></div>
                        <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Target</p><p className="text-sm text-zinc-300">{selected.target_type}: {selected.target_id}</p></div>
                        {selected.ip_hash && <div><p className="text-[10px] text-zinc-500 uppercase mb-1">IP Hash</p><p className="font-mono text-xs text-zinc-500">{selected.ip_hash}</p></div>}

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-[10px] text-red-400 uppercase mb-1 font-bold">Before</p>
                                <JsonViewer data={selected.before_json} label="Before State" />
                            </div>
                            <div>
                                <p className="text-[10px] text-emerald-400 uppercase mb-1 font-bold">After</p>
                                <JsonViewer data={selected.after_json} label="After State" />
                            </div>
                        </div>
                    </div>
                )}
            </DetailDrawer>
        </div>
    );
}
