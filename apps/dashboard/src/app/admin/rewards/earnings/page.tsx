"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErrorBanner, DataTable } from '@/components/admin/admin-shared';

export default function EarningsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<any[]>([]);

    const fetch = useCallback(async () => {
        try {
            setError('');
            const res = await api.get('/admin/rewards/earnings');
            if (res.data.ok) setData(res.data.earnings);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to fetch');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const columns = [
        { key: 'epoch_id', label: 'Epoch' },
        { key: 'wallet_or_node_id', label: 'Wallet / Node', render: (r: any) => <span className="font-mono text-xs text-blue-400">{r.wallet_or_node_id?.slice(0, 16)}...</span> },
        { key: 'amount_usdt', label: 'Earned', render: (r: any) => <span className="font-mono text-sm text-emerald-400">${parseFloat(r.amount_usdt || 0).toFixed(4)}</span> },
        { key: 'role', label: 'Role', render: (r: any) => <span className="text-[10px] text-zinc-500 uppercase">{r.role}</span> },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <PageHeader title="Earnings" subtitle="Per-epoch earnings breakdown"
                actions={<Button variant="ghost" size="sm" onClick={fetch} className="text-zinc-400 hover:text-zinc-200"><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>}
            />
            {error && <ErrorBanner message={error} onRetry={fetch} />}
            <Card className="bg-zinc-900/60 border-zinc-800/60">
                <CardContent className="p-0">
                    <DataTable columns={columns} data={data} loading={loading} searchable searchPlaceholder="Search wallets..." emptyMessage="No earnings data" />
                </CardContent>
            </Card>
        </div>
    );
}
