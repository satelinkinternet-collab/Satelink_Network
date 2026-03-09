"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErrorBanner, DataTable, formatTs } from '@/components/admin/admin-shared';
import { DebugToolbox } from '@/components/admin/DebugToolbox';

export default function SlowQueriesPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<any[]>([]);

    const fetch = useCallback(async () => {
        try {
            setError('');
            const res = await api.get('/admin/ops/slow-queries?limit=200');
            if (res.data.ok) setData(res.data.queries);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to fetch');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const columns = [
        { key: 'query_hash', label: 'Hash', render: (r: any) => <span className="font-mono text-xs text-blue-400">{r.query_hash}</span> },
        { key: 'avg_ms', label: 'Avg (ms)', render: (r: any) => <span className={`font-mono text-xs ${r.avg_ms > 1000 ? 'text-red-400' : r.avg_ms > 500 ? 'text-amber-400' : 'text-zinc-300'}`}>{Math.round(r.avg_ms)}</span> },
        { key: 'p95_ms', label: 'p95 (ms)', render: (r: any) => <span className={`font-mono text-xs ${r.p95_ms > 1000 ? 'text-red-400' : 'text-zinc-400'}`}>{Math.round(r.p95_ms || 0)}</span> },
        { key: 'count', label: 'Count', render: (r: any) => <span className="font-mono text-xs text-amber-400">{r.count}×</span> },
        { key: 'source', label: 'Source', render: (r: any) => <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">{r.source}</Badge> },
        { key: 'sample_sql', label: 'Sample SQL', render: (r: any) => <span className="font-mono text-[10px] text-zinc-500 truncate max-w-[300px] block">{r.sample_sql}</span> },
        { key: 'last_seen_at', label: 'Last Seen', render: (r: any) => <span className="text-xs text-zinc-500">{formatTs(r.last_seen_at)}</span> },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <PageHeader title="Slow Queries" subtitle="Database queries exceeding 250ms threshold"
                actions={<Button variant="ghost" size="sm" onClick={fetch} className="text-zinc-400 hover:text-zinc-200"><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>}
            />
            {error && <ErrorBanner message={error} onRetry={fetch} />}
            <Card className="bg-zinc-900/60 border-zinc-800/60">
                <CardContent className="p-0">
                    <DataTable columns={columns} data={data} loading={loading} searchable searchPlaceholder="Search queries..." emptyMessage="No slow queries ⚡" />
                </CardContent>
            </Card>

            <DebugToolbox viewContext={{ page: 'ops/slow-queries', queryCount: data.length }} />
        </div>
    );
}
