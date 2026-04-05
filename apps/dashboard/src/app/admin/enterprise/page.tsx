"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Activity, Users, TrendingUp, RefreshCw, BarChart2 } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErrorBanner, KpiSkeleton } from '@/components/admin/admin-shared';

interface DemandMetrics {
    total_enterprise_balance: number;
    active_clients: number;
    ops_last_24h: number;
    revenue_last_24h: number;
    ops_grouped: Array<{
        source: string;
        count: number;
        revenue: number;
    }>;
}

export default function EnterpriseDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [metrics, setMetrics] = useState<DemandMetrics | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            setError('');
            const res = await api.get('/api/demand/metrics');
            if (res.data.ok) {
                setMetrics(res.data.data);
            } else {
                setError(res.data.error || 'Failed to fetch metrics');
            }
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to fetch enterprise metrics');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // refresh every minute
        return () => clearInterval(interval);
    }, [fetchData]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
            <PageHeader
                title="Enterprise Demand Analytics"
                subtitle="Real-time Phase 4 usage and revenue from paid ops"
                actions={
                    <Button variant="ghost" size="sm" onClick={fetchData} className="text-zinc-400 hover:text-zinc-200">
                        <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                    </Button>
                }
            />

            {error && <ErrorBanner message={error} onRetry={fetchData} />}

            {loading && !metrics ? (
                <KpiSkeleton count={4} />
            ) : metrics ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <Wallet className="h-5 w-5 text-emerald-400" />
                                    <h3 className="text-sm font-semibold text-zinc-400">Total Pre-Deposits</h3>
                                </div>
                                <p className="text-3xl font-bold tracking-tight text-white mb-1">
                                    ${metrics.total_enterprise_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-zinc-500">Unused prepaid USDT</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <TrendingUp className="h-5 w-5 text-amber-400" />
                                    <h3 className="text-sm font-semibold text-zinc-400">24h Ops Revenue</h3>
                                </div>
                                <p className="text-3xl font-bold tracking-tight text-white mb-1">
                                    ${metrics.revenue_last_24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-zinc-500">Revenue burned to operators</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <Activity className="h-5 w-5 text-blue-400" />
                                    <h3 className="text-sm font-semibold text-zinc-400">Paid Ops (24h)</h3>
                                </div>
                                <p className="text-3xl font-bold tracking-tight text-white mb-1">
                                    {metrics.ops_last_24h.toLocaleString()}
                                </p>
                                <p className="text-xs text-zinc-500">Total metered events</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <Users className="h-5 w-5 text-purple-400" />
                                    <h3 className="text-sm font-semibold text-zinc-400">Active Clients</h3>
                                </div>
                                <p className="text-3xl font-bold tracking-tight text-white mb-1">
                                    {metrics.active_clients}
                                </p>
                                <p className="text-xs text-zinc-500">Registered enterprises</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="bg-zinc-900/60 border-zinc-800/60 mt-8 mb-8">
                        <div className="px-6 py-4 border-b border-zinc-800/60 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BarChart2 className="h-5 w-5 text-zinc-400" />
                                <h2 className="text-lg font-bold text-zinc-100">Revenue by Operation Type</h2>
                            </div>
                            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-xs">All Time</Badge>
                        </div>
                        <CardContent className="p-0">
                            {metrics.ops_grouped && metrics.ops_grouped.length > 0 ? (
                                <table className="w-full text-sm text-left text-zinc-300">
                                    <thead className="text-xs font-semibold text-zinc-400 uppercase bg-zinc-900/40 border-b border-zinc-800">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Operation</th>
                                            <th className="px-6 py-3 font-medium text-right">Count</th>
                                            <th className="px-6 py-3 font-medium text-right">Revenue (USDT)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50">
                                        {metrics.ops_grouped.map((op, idx) => (
                                            <tr key={idx} className="hover:bg-zinc-800/20 transition-colors">
                                                <td className="px-6 py-4 font-mono text-zinc-200">
                                                    <span className="inline-flex items-center rounded-md bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-400/20 mr-2">
                                                        API
                                                    </span>
                                                    {op.source}
                                                </td>
                                                <td className="px-6 py-4 text-right">{op.count.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right text-emerald-400 font-medium">
                                                    ${op.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-zinc-500">
                                    No paid operations have been executed yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            ) : null}
        </div>
    );
}
