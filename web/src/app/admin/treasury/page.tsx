"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, CheckCircle, Database, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErrorBanner, KpiSkeleton } from '@/components/admin/admin-shared';

interface TreasuryStatus {
    total_balance: string;
    pending_claims_total: string;
    liquidity_ratio: number;
    withdraw_status: string;
}

export default function TreasuryPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [status, setStatus] = useState<TreasuryStatus | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            setError('');
            const res = await api.get('/admin-api/treasury/health');
            if (res.data.ok) {
                setStatus(res.data.data);
            }
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to fetch treasury status');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // refresh every minute
        return () => clearInterval(interval);
    }, [fetchData]);

    const getStatusBadge = (wdStatus: string) => {
        switch (wdStatus) {
            case 'AVAILABLE': return <Badge className="bg-emerald-500/10 text-emerald-400">Available</Badge>;
            case 'PARTIAL': return <Badge className="bg-amber-500/10 text-amber-400">Partial</Badge>;
            case 'BLOCKED': return <Badge className="bg-red-500/10 text-red-400">Blocked</Badge>;
            default: return <Badge>{wdStatus}</Badge>;
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
            <PageHeader
                title="Treasury Dashboard"
                subtitle="Real-time USDT settlement monitoring (Fuse EVM)"
                actions={
                    <Button variant="ghost" size="sm" onClick={fetchData} className="text-zinc-400 hover:text-zinc-200">
                        <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                    </Button>
                }
            />

            {error && <ErrorBanner message={error} onRetry={fetchData} />}

            {loading && !status ? (
                <KpiSkeleton count={4} />
            ) : status ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Wallet className="h-5 w-5 text-emerald-400" />
                                <h3 className="text-sm font-semibold text-zinc-400">Current USDT Balance</h3>
                            </div>
                            <p className="text-3xl font-bold tracking-tight text-white mb-1">
                                ${Number(status.total_balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-zinc-500">Available treasury balance (USDT)</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Layers className="h-5 w-5 text-amber-400" />
                                <h3 className="text-sm font-semibold text-zinc-400">Pending Claims</h3>
                            </div>
                            <p className="text-3xl font-bold tracking-tight text-white mb-1">
                                ${Number(status.pending_claims_total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-zinc-500">Total UNPAID epoch earnings</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Database className="h-5 w-5 text-blue-400" />
                                <h3 className="text-sm font-semibold text-zinc-400">Available Liquidity</h3>
                            </div>
                            <p className="text-3xl font-bold tracking-tight text-white mb-1">
                                {(status.liquidity_ratio * 100).toFixed(1)}%
                            </p>
                            <p className="text-xs text-zinc-500">Vault Balance / Pending Claims</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-2">
                                {status.withdraw_status === 'AVAILABLE' ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <AlertCircle className="h-5 w-5 text-red-500" />}
                                <h3 className="text-sm font-semibold text-zinc-400">Withdraw Health</h3>
                            </div>
                            <div className="mt-2">
                                {getStatusBadge(status.withdraw_status)}
                            </div>
                            <p className="text-xs text-zinc-500 mt-2">Smart contract withdrawal status</p>
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            <Card className="bg-zinc-900/60 border-zinc-800/60">
                <div className="px-6 py-4 border-b border-zinc-800/60 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-zinc-100">Epoch Merkle Anchors</h2>
                    <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-xs">Fuse EVM</Badge>
                </div>
                <CardContent className="p-6 text-sm text-zinc-400 text-center">
                    (In a full UI, a data table showing epoch anchors and Fuse explorer links goes here.)
                </CardContent>
            </Card>
        </div>
    );
}
