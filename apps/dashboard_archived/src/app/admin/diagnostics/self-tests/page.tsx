"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Play, CheckCircle, XCircle, AlertTriangle, Clock, SkipForward } from 'lucide-react';
import api from '@/lib/api';
import {
    PageHeader, ErrorBanner, DataTable, DetailDrawer, JsonViewer,
    StatusBadge, useIsReadonly, formatTs, timeAgo
} from '@/components/admin/admin-shared';

const statusIcon = (s: string) => {
    switch (s) {
        case 'pass': return <CheckCircle className="h-4 w-4 text-emerald-400" />;
        case 'fail': return <XCircle className="h-4 w-4 text-red-400" />;
        case 'error': return <AlertTriangle className="h-4 w-4 text-amber-400" />;
        case 'skipped': return <SkipForward className="h-4 w-4 text-zinc-500" />;
        default: return <Clock className="h-4 w-4 text-zinc-500" />;
    }
};

const statusColor = (s: string) => {
    switch (s) {
        case 'pass': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
        case 'fail': return 'bg-red-500/15 text-red-400 border-red-500/30';
        case 'error': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
        default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
};

export default function SelfTestsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [running, setRunning] = useState(false);
    const [runResult, setRunResult] = useState<any>(null);
    const readonly = useIsReadonly();

    const fetchData = useCallback(async () => {
        try {
            setError('');
            const res = await api.get('/admin/diagnostics/self-tests?limit=100');
            if (res.data.ok) setData(res.data.tests);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to fetch');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const runTests = async (kind?: string) => {
        setRunning(true);
        setRunResult(null);
        try {
            const res = await api.post('/admin/diagnostics/self-tests/run', { kind });
            setRunResult(res.data);
            await fetchData();
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to run tests');
        } finally { setRunning(false); }
    };

    const columns = [
        {
            key: 'status', label: 'Status', render: (r: any) => (
                <div className="flex items-center gap-1.5">
                    {statusIcon(r.status)}
                    <Badge className={`text-[10px] uppercase border ${statusColor(r.status)}`}>{r.status}</Badge>
                </div>
            )
        },
        {
            key: 'kind', label: 'Test Kind', render: (r: any) => (
                <span className="text-sm text-zinc-300 font-mono">{r.kind}</span>
            )
        },
        {
            key: 'duration_ms', label: 'Duration', render: (r: any) => (
                <span className={`text-xs ${(r.duration_ms || 0) > 5000 ? 'text-amber-400' : 'text-zinc-400'}`}>
                    {r.duration_ms}ms
                </span>
            )
        },
        {
            key: 'error_message', label: 'Error', render: (r: any) => (
                <span className="text-xs text-red-400/80 max-w-[250px] truncate block">{r.error_message || '—'}</span>
            )
        },
        {
            key: 'created_at', label: 'Ran At', render: (r: any) => (
                <span className="text-xs text-zinc-500">{timeAgo(r.created_at)}</span>
            )
        },
    ];

    // Aggregate latest run stats
    const latestByKind = new Map<string, any>();
    data.forEach(t => { if (!latestByKind.has(t.kind)) latestByKind.set(t.kind, t); });
    const passCount = [...latestByKind.values()].filter(t => t.status === 'pass').length;
    const failCount = [...latestByKind.values()].filter(t => t.status === 'fail' || t.status === 'error').length;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <PageHeader title="Self-Tests" subtitle={`${passCount} passing · ${failCount} failing`}
                actions={
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={fetchData} className="text-zinc-400 hover:text-zinc-200">
                            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                        </Button>
                        {!readonly && (
                            <Button size="sm" onClick={() => runTests()} disabled={running}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white">
                                <Play className="h-4 w-4 mr-1" /> {running ? 'Running…' : 'Run All'}
                            </Button>
                        )}
                    </div>
                }
            />
            {error && <ErrorBanner message={error} onRetry={fetchData} />}

            {runResult && (
                <Card className="bg-zinc-900/60 border-zinc-800/60 mb-4">
                    <CardContent className="p-4">
                        <p className="text-xs text-zinc-500 uppercase mb-2 font-medium">Last Run Result</p>
                        <div className="flex flex-wrap gap-3">
                            {runResult.results?.map((r: any) => (
                                <div key={r.kind} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${statusColor(r.status)}`}>
                                    {statusIcon(r.status)}
                                    <span className="text-xs font-mono">{r.kind}</span>
                                    <span className="text-[10px] opacity-70">{r.durationMs}ms</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick-action buttons per kind */}
            {!readonly && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {['backend_smoke', 'api_contract', 'db_integrity', 'sse_health'].map(k => (
                        <Button key={k} variant="outline" size="sm" onClick={() => runTests(k)} disabled={running}
                            className="text-xs text-zinc-400 border-zinc-700 hover:bg-zinc-800 font-mono">
                            <Play className="h-3 w-3 mr-1" />{k}
                        </Button>
                    ))}
                </div>
            )}

            <Card className="bg-zinc-900/60 border-zinc-800/60">
                <CardContent className="p-0">
                    <DataTable columns={columns} data={data} onRowClick={setSelected} loading={loading} searchable emptyMessage="No test runs yet" />
                </CardContent>
            </Card>

            <DetailDrawer open={!!selected} onClose={() => setSelected(null)} title="Test Run Detail">
                {selected && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Status</p>
                                <div className="flex items-center gap-1.5">{statusIcon(selected.status)}<span className="text-sm text-zinc-200">{selected.status}</span></div>
                            </div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Kind</p><p className="text-sm font-mono text-zinc-300">{selected.kind}</p></div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Duration</p><p className="text-sm text-zinc-300">{selected.duration_ms}ms</p></div>
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Ran At</p><p className="text-xs text-zinc-400">{formatTs(selected.created_at)}</p></div>
                        </div>
                        {selected.error_message && (
                            <div><p className="text-[10px] text-zinc-500 uppercase mb-1">Error</p>
                                <p className="text-sm text-red-400 bg-red-900/20 p-2 rounded-lg border border-red-500/20 font-mono text-xs">{selected.error_message}</p>
                            </div>
                        )}
                        {selected.output_json && <JsonViewer data={selected.output_json} label="Output" />}
                    </div>
                )}
            </DetailDrawer>
        </div>
    );
}
