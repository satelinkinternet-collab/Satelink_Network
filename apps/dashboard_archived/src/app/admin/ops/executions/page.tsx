"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErrorBanner, DataTable, formatTs } from '@/components/admin/admin-shared';

export default function ExecutionsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<any[]>([]);

    const fetch = useCallback(async () => {
        try {
            setError('');
            const res = await api.get('/admin/ops/executions?limit=200');
            if (res.data.ok) setData(res.data.executions);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to fetch');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const columns = [
        { key: 'id', label: 'ID' },
        { key: 'op_type', label: 'Op Type', render: (r: any) => <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] uppercase">{r.op_type}</Badge> },
        { key: 'status', label: 'Status', render: (r: any) => <Badge className={r.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]' : 'bg-red-500/10 text-red-400 border-red-500/20 text-[10px]'}>{r.status}</Badge> },
        { key: 'amount_usdt', label: 'Amount', render: (r: any) => <span className="text-emerald-400 font-mono text-xs">${parseFloat(r.amount_usdt || 0).toFixed(4)}</span> },
        { key: 'node_id', label: 'Node', render: (r: any) => <span className="font-mono text-xs text-zinc-500">{r.node_id?.slice(0, 10)}...</span> },
        { key: 'client_id', label: 'Client', render: (r: any) => <span className="font-mono text-xs text-zinc-500">{r.client_id?.slice(0, 10)}...</span> },
        { key: 'created_at', label: 'Time', render: (r: any) => <span className="text-xs text-zinc-500">{formatTs(r.created_at)}</span> },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <PageHeader title="Executions" subtitle="Revenue event execution log"
                actions={<Button variant="ghost" size="sm" onClick={fetch} className="text-zinc-400 hover:text-zinc-200"><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>}
            />
            {error && <ErrorBanner message={error} onRetry={fetch} />}
            <Card className="bg-zinc-900/60 border-zinc-800/60">
                <CardContent className="p-0">
                    <DataTable columns={columns} data={data} loading={loading} searchable searchPlaceholder="Search executions..." emptyMessage="No executions" />
                </CardContent>
            </Card>
        </div>
    );
}
