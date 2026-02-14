"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErrorBanner, DataTable, DetailDrawer, JsonViewer, formatTs } from '@/components/admin/admin-shared';

export default function TracesPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);

    const fetch = useCallback(async () => {
        try {
            setError('');
            const params = new URLSearchParams(window.location.search);
            const traceId = params.get('trace_id');
            const url = traceId ? `/admin/ops/traces?trace_id=${traceId}` : '/admin/ops/traces?limit=200';
            const res = await api.get(url);
            if (res.data.ok) setData(res.data.traces);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to fetch');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const columns = [
        { key: 'trace_id', label: 'Trace ID', render: (r: any) => <span className="font-mono text-xs text-blue-400">{r.trace_id?.slice(0, 12)}...</span> },
        { key: 'method', label: 'Method', render: (r: any) => <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">{r.method}</Badge> },
        { key: 'route', label: 'Route', render: (r: any) => <span className="text-sm text-zinc-300 font-mono">{r.route}</span> },
        { key: 'status_code', label: 'Status', render: (r: any) => <Badge className={r.status_code < 400 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]' : 'bg-red-500/10 text-red-400 border-red-500/20 text-[10px]'}>{r.status_code}</Badge> },
        { key: 'duration_ms', label: 'Duration', render: (r: any) => <span className={`font-mono text-xs ${r.duration_ms > 500 ? 'text-red-400' : r.duration_ms > 200 ? 'text-amber-400' : 'text-emerald-400'}`}>{r.duration_ms}ms</span> },
        { key: 'created_at', label: 'Time', render: (r: any) => <span className="text-xs text-zinc-500">{formatTs(r.created_at)}</span> },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <PageHeader title="Request Traces" subtitle="Request-level observability"
                actions={<Button variant="ghost" size="sm" onClick={fetch} className="text-zinc-400 hover:text-zinc-200"><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>}
            />
            {error && <ErrorBanner message={error} onRetry={fetch} />}
            <Card className="bg-zinc-900/60 border-zinc-800/60">
                <CardContent className="p-0">
                    <DataTable columns={columns} data={data} onRowClick={setSelected} loading={loading} searchable searchPlaceholder="Search traces..." emptyMessage="No traces" />
                </CardContent>
            </Card>

            <DetailDrawer open={!!selected} onClose={() => setSelected(null)} title="Trace Detail">
                {selected && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Trace ID</p><p className="text-xs font-mono text-blue-400 break-all">{selected.trace_id}</p></div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Duration</p><p className="text-lg font-bold text-zinc-200">{selected.duration_ms}ms</p></div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Method</p><p className="text-sm text-zinc-300">{selected.method}</p></div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Status</p><p className="text-sm text-zinc-300">{selected.status_code}</p></div>
                        </div>
                        <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Route</p><p className="text-sm font-mono text-zinc-300">{selected.route}</p></div>
                        <JsonViewer data={selected} label="Full Trace Data" />
                    </div>
                )}
            </DetailDrawer>
        </div>
    );
}
