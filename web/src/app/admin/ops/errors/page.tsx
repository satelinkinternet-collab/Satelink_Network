"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErrorBanner, DataTable, DetailDrawer, JsonViewer, formatTs, timeAgo } from '@/components/admin/admin-shared';

export default function ErrorsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [detail, setDetail] = useState<any>(null);

    const fetch = useCallback(async () => {
        try {
            setError('');
            const res = await api.get('/admin/ops/errors?limit=200');
            if (res.data.ok) setData(res.data.errors);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to fetch');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const openDetail = async (row: any) => {
        setSelected(row);
        try {
            const res = await api.get(`/admin/ops/errors/${row.id}`);
            if (res.data.ok) setDetail(res.data);
        } catch { }
    };

    const columns = [
        { key: 'status_code', label: 'Code', render: (r: any) => <Badge className={r.status_code >= 500 ? 'bg-red-500/10 text-red-400 border-red-500/20 text-[10px]' : 'bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]'}>{r.status_code}</Badge> },
        { key: 'message', label: 'Message', render: (r: any) => <span className="text-sm text-zinc-300 truncate max-w-[300px] block">{r.message}</span> },
        { key: 'service', label: 'Service', render: (r: any) => <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">{r.service || 'api'}</Badge> },
        { key: 'count', label: 'Count', render: (r: any) => <span className="font-mono text-xs text-amber-400">{r.count || 1}×</span> },
        { key: 'stack_hash', label: 'Hash', render: (r: any) => <span className="font-mono text-[10px] text-zinc-600">{r.stack_hash?.slice(0, 8)}</span> },
        { key: 'last_seen_at', label: 'Last Seen', render: (r: any) => <span className="text-xs text-zinc-500">{timeAgo(r.last_seen_at)}</span> },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <PageHeader title="Errors" subtitle="Backend error events grouped by stack hash"
                actions={<Button variant="ghost" size="sm" onClick={fetch} className="text-zinc-400 hover:text-zinc-200"><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>}
            />
            {error && <ErrorBanner message={error} onRetry={fetch} />}
            <Card className="bg-zinc-900/60 border-zinc-800/60">
                <CardContent className="p-0">
                    <DataTable columns={columns} data={data} onRowClick={openDetail} loading={loading} searchable searchPlaceholder="Search errors..." emptyMessage="No errors 🎉" />
                </CardContent>
            </Card>

            <DetailDrawer open={!!selected} onClose={() => { setSelected(null); setDetail(null); }} title="Error Detail">
                {selected && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Status Code</p><p className="text-lg font-bold text-red-400">{selected.status_code}</p></div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Count</p><p className="text-lg font-bold text-amber-400">{selected.count || 1}×</p></div>
                        </div>
                        <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Message</p><p className="text-sm text-zinc-300">{selected.message}</p></div>
                        {selected.stack_preview && (
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Stack Preview</p><pre className="text-xs text-zinc-400 bg-zinc-950 p-3 rounded-lg overflow-x-auto font-mono">{selected.stack_preview}</pre></div>
                        )}
                        {selected.trace_id && (
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] text-zinc-500">TRACE:</p>
                                <span className="font-mono text-xs text-blue-400">{selected.trace_id}</span>
                                <a href={`/admin/ops/traces?trace_id=${selected.trace_id}`}><ExternalLink className="h-3 w-3 text-blue-400" /></a>
                            </div>
                        )}
                        {detail?.related_traces?.length > 0 && (
                            <div>
                                <p className="text-xs text-zinc-400 font-semibold mb-2">Related Traces</p>
                                {detail.related_traces.map((t: any, i: number) => (
                                    <div key={i} className="text-xs text-zinc-500 py-1 border-b border-zinc-800/40">
                                        {t.method} {t.route} — {t.duration_ms}ms — {t.status_code}
                                    </div>
                                ))}
                            </div>
                        )}
                        <JsonViewer data={selected} label="Raw Error" />
                    </div>
                )}
            </DetailDrawer>
        </div>
    );
}
