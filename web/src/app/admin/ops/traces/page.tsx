"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Copy, Check, ExternalLink, Clock, AlertTriangle, Database } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErrorBanner, DataTable, DetailDrawer, JsonViewer, formatTs } from '@/components/admin/admin-shared';
import { DebugToolbox } from '@/components/admin/DebugToolbox';

export default function TracesPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [linkedErrors, setLinkedErrors] = useState<any[]>([]);
    const [linkedQueries, setLinkedQueries] = useState<any[]>([]);
    const [copied, setCopied] = useState(false);

    const fetchData = useCallback(async () => {
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

    useEffect(() => { fetchData(); }, [fetchData]);

    // When a trace is selected, load linked errors and slow queries
    const openDetail = async (row: any) => {
        setSelected(row);
        setLinkedErrors([]);
        setLinkedQueries([]);

        if (row.trace_id) {
            // Fetch errors linked by trace_id
            try {
                const errRes = await api.get(`/admin/ops/errors?limit=20`);
                if (errRes.data.ok) {
                    const linked = errRes.data.errors.filter((e: any) => e.trace_id === row.trace_id);
                    setLinkedErrors(linked);
                }
            } catch { }

            // Fetch slow queries in a similar time window
            try {
                const sqRes = await api.get(`/admin/ops/slow-queries?limit=50`);
                if (sqRes.data.ok) {
                    // Show queries that happened around the trace time (±30s)
                    const traceTime = row.created_at;
                    const linked = sqRes.data.queries.filter((q: any) =>
                        Math.abs((q.last_seen_at || 0) - traceTime) < 30_000
                    );
                    setLinkedQueries(linked);
                }
            } catch { }
        }
    };

    const copyJson = async () => {
        if (!selected) return;
        try {
            await navigator.clipboard.writeText(JSON.stringify({
                trace: selected,
                linked_errors: linkedErrors,
                linked_slow_queries: linkedQueries,
            }, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { }
    };

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
                actions={<Button variant="ghost" size="sm" onClick={fetchData} className="text-zinc-400 hover:text-zinc-200"><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>}
            />
            {error && <ErrorBanner message={error} onRetry={fetchData} />}
            <Card className="bg-zinc-900/60 border-zinc-800/60">
                <CardContent className="p-0">
                    <DataTable columns={columns} data={data} onRowClick={openDetail} loading={loading} searchable searchPlaceholder="Search traces..." emptyMessage="No traces" />
                </CardContent>
            </Card>

            {/* Trace Timeline Detail Drawer */}
            <DetailDrawer open={!!selected} onClose={() => { setSelected(null); setLinkedErrors([]); setLinkedQueries([]); }} title="Trace Timeline">
                {selected && (
                    <div className="space-y-4">
                        {/* Header info */}
                        <div className="grid grid-cols-2 gap-3">
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Trace ID</p><p className="text-xs font-mono text-blue-400 break-all">{selected.trace_id}</p></div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Duration</p><p className="text-lg font-bold text-zinc-200">{selected.duration_ms}ms</p></div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Method</p><p className="text-sm text-zinc-300">{selected.method}</p></div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Status</p><p className="text-sm text-zinc-300">{selected.status_code}</p></div>
                        </div>
                        <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Route</p><p className="text-sm font-mono text-zinc-300">{selected.route}</p></div>
                        <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Time</p><p className="text-xs text-zinc-400">{formatTs(selected.created_at)}</p></div>

                        {/* Duration Timeline Bar */}
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase mb-2">Request Timeline</p>
                            <div className="relative h-6 bg-zinc-800/80 rounded-lg overflow-hidden">
                                <div
                                    className={`h-full rounded-lg transition-all ${selected.duration_ms > 500 ? 'bg-gradient-to-r from-red-600 to-red-500' :
                                        selected.duration_ms > 200 ? 'bg-gradient-to-r from-amber-600 to-amber-500' :
                                            'bg-gradient-to-r from-emerald-600 to-emerald-500'}`}
                                    style={{ width: `${Math.min(100, Math.max(5, (selected.duration_ms / 1000) * 100))}%` }}
                                />
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-white/80">
                                    {selected.duration_ms}ms
                                </span>
                            </div>
                        </div>

                        {/* Linked Errors */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                                <p className="text-xs text-zinc-400 font-semibold">Linked Errors ({linkedErrors.length})</p>
                            </div>
                            {linkedErrors.length === 0 ? (
                                <p className="text-xs text-zinc-600 pl-5">No errors linked to this trace</p>
                            ) : (
                                <div className="space-y-1.5 pl-5">
                                    {linkedErrors.map((err: any, i: number) => (
                                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-900/10 border border-red-500/10">
                                            <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] shrink-0">{err.status_code}</Badge>
                                            <div className="min-w-0">
                                                <p className="text-xs text-zinc-300 truncate">{err.message}</p>
                                                <p className="text-[10px] text-zinc-600 font-mono">{err.stack_hash?.slice(0, 12)}</p>
                                            </div>
                                            <a href={`/admin/ops/errors`} className="shrink-0">
                                                <ExternalLink className="h-3 w-3 text-red-400/50 hover:text-red-400" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Linked Slow Queries */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Database className="h-3.5 w-3.5 text-amber-400" />
                                <p className="text-xs text-zinc-400 font-semibold">Nearby Slow Queries ({linkedQueries.length})</p>
                            </div>
                            {linkedQueries.length === 0 ? (
                                <p className="text-xs text-zinc-600 pl-5">No slow queries near this trace</p>
                            ) : (
                                <div className="space-y-1.5 pl-5">
                                    {linkedQueries.map((sq: any, i: number) => (
                                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-900/10 border border-amber-500/10">
                                            <span className="font-mono text-xs text-amber-400 shrink-0">{Math.round(sq.avg_ms)}ms</span>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-zinc-400 font-mono truncate">{sq.sample_sql}</p>
                                                <p className="text-[10px] text-zinc-600">{sq.count}× hits</p>
                                            </div>
                                            <a href="/admin/ops/slow-queries" className="shrink-0">
                                                <ExternalLink className="h-3 w-3 text-amber-400/50 hover:text-amber-400" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Deep links */}
                        <div className="pt-2 border-t border-zinc-800/40 flex flex-wrap gap-2">
                            <a href={`/admin/ops/traces?trace_id=${selected.trace_id}`}
                                className="text-[11px] px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                                Permalink
                            </a>
                            <a href={`/admin/ops/errors`}
                                className="text-[11px] px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 transition-colors">
                                All Errors →
                            </a>
                            <a href={`/admin/ops/slow-queries`}
                                className="text-[11px] px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 transition-colors">
                                All Queries →
                            </a>
                        </div>

                        {/* Copy JSON + Raw data */}
                        <div className="pt-2">
                            <Button size="sm" variant="outline" onClick={copyJson}
                                className="text-zinc-400 border-zinc-700 hover:bg-zinc-800 text-xs w-full">
                                {copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                                {copied ? 'Copied!' : 'Copy Full JSON (trace + linked)'}
                            </Button>
                        </div>

                        <JsonViewer data={selected} label="Raw Trace Data" />
                    </div>
                )}
            </DetailDrawer>

            <DebugToolbox viewContext={{ page: 'ops/traces', traceCount: data.length }} />
        </div>
    );
}
