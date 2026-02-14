"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, DollarSign, TrendingUp, PieChart } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErrorBanner, KpiSkeleton, DataTable } from '@/components/admin/admin-shared';

export default function RevenueOverviewPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<any>(null);

    const fetch = useCallback(async () => {
        try {
            setError('');
            const res = await api.get('/admin/revenue/overview');
            if (res.data.ok) setData(res.data);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to fetch');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const opColumns = [
        { key: 'op_type', label: 'Op Type', render: (r: any) => <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] uppercase">{r.op_type}</Badge> },
        { key: 'total', label: 'Total USDT', render: (r: any) => <span className="font-mono text-sm text-emerald-400">${parseFloat(r.total || 0).toFixed(2)}</span> },
        { key: 'count', label: 'Count', render: (r: any) => <span className="font-mono text-xs text-zinc-400">{r.count}</span> },
    ];

    const clientColumns = [
        { key: 'client_id', label: 'Client', render: (r: any) => <span className="font-mono text-xs text-blue-400">{r.client_id?.slice(0, 16)}...</span> },
        { key: 'total', label: 'Total USDT', render: (r: any) => <span className="font-mono text-sm text-emerald-400">${parseFloat(r.total || 0).toFixed(2)}</span> },
        { key: 'count', label: 'Ops', render: (r: any) => <span className="text-xs text-zinc-400">{r.count}</span> },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <PageHeader title="Revenue Overview" subtitle="Aggregate revenue breakdowns"
                actions={<Button variant="ghost" size="sm" onClick={fetch} className="text-zinc-400 hover:text-zinc-200"><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>}
            />
            {error && <ErrorBanner message={error} onRetry={fetch} />}

            {loading ? <KpiSkeleton count={2} /> : data && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-zinc-800/40">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="h-4 w-4 text-emerald-400" />
                                    <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">Revenue (24h)</span>
                                </div>
                                <p className="text-3xl font-bold text-emerald-400">${data.revenue_24h_usdt}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-zinc-800/40">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-blue-400" />
                                    <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">Revenue (7d)</span>
                                </div>
                                <p className="text-3xl font-bold text-blue-400">${data.revenue_7d_usdt}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="bg-zinc-900/60 border-zinc-800/60">
                            <div className="px-4 sm:px-6 py-4 border-b border-zinc-800/60 flex items-center gap-2">
                                <PieChart className="h-4 w-4 text-blue-400" />
                                <h3 className="text-sm font-bold text-zinc-200">By Operation Type</h3>
                            </div>
                            <CardContent className="p-0">
                                <DataTable columns={opColumns} data={data.by_op_type || []} emptyMessage="No data" />
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-900/60 border-zinc-800/60">
                            <div className="px-4 sm:px-6 py-4 border-b border-zinc-800/60 flex items-center gap-2">
                                <PieChart className="h-4 w-4 text-emerald-400" />
                                <h3 className="text-sm font-bold text-zinc-200">Top Clients</h3>
                            </div>
                            <CardContent className="p-0">
                                <DataTable columns={clientColumns} data={data.by_client || []} emptyMessage="No data" />
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
