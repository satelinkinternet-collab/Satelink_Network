"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, List, PieChart, RefreshCw, TrendingUp } from 'lucide-react';
import { ErrorBanner, PageHeader, KpiSkeleton } from '@/components/admin/admin-shared';

export default function Page() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchOverview = useCallback(async () => {
    try {
      setError('');
      const res = await api.get('/admin/revenue/overview');
      if (res.data?.ok) setData(res.data);
      else setData(res.data ?? null);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load revenue overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 10000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  const overview = useMemo(() => {
    const root = data?.data ?? data;
    return {
      revenue24h: Number(root?.revenue_24h_usdt ?? 0),
      revenue7d: Number(root?.revenue_7d_usdt ?? 0),
      byOpType: Array.isArray(root?.by_op_type) ? root.by_op_type : [],
      byClient: Array.isArray(root?.by_client) ? root.by_client : [],
    };
  }, [data]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Admin Revenue"
        subtitle="Revenue health, breakdowns, and event streams"
        actions={
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 hover:bg-zinc-700/60"
            >
              <Link href="/admin/revenue/events">
                <List className="h-4 w-4 mr-1" /> Events
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 hover:bg-zinc-700/60"
            >
              <Link href="/admin/revenue/overview">
                <PieChart className="h-4 w-4 mr-1" /> Overview
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLoading(true);
                fetchOverview();
              }}
              className="text-zinc-400 hover:text-zinc-200"
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        }
      />

      {error && <ErrorBanner message={error} onRetry={fetchOverview} />}

      {loading ? (
        <KpiSkeleton count={2} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-zinc-800/40">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">Revenue (24h)</span>
                </div>
                <p className="text-3xl font-bold text-emerald-400">${Number.isFinite(overview.revenue24h) ? overview.revenue24h.toFixed(2) : '0.00'}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-zinc-800/40">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">Revenue (7d)</span>
                </div>
                <p className="text-3xl font-bold text-blue-400">${Number.isFinite(overview.revenue7d) ? overview.revenue7d.toFixed(2) : '0.00'}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-zinc-900/60 border-zinc-800/60">
              <div className="px-4 sm:px-6 py-4 border-b border-zinc-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-zinc-200">By operation type</h3>
                </div>
                <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] uppercase">
                  {overview.byOpType.length} rows
                </Badge>
              </div>
              <CardContent className="p-5">
                {overview.byOpType.length ? (
                  <div className="space-y-2">
                    {overview.byOpType.slice(0, 8).map((r: any, idx: number) => (
                      <div key={r?.op_type ?? idx} className="flex items-center justify-between gap-4">
                        <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] uppercase">
                          {String(r?.op_type ?? 'unknown')}
                        </Badge>
                        <div className="text-right">
                          <div className="font-mono text-sm text-emerald-400">
                            ${parseFloat(r?.total ?? 0).toFixed(2)}
                          </div>
                          <div className="font-mono text-[11px] text-zinc-500">
                            {r?.count ?? 0} ops
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-zinc-500">No data.</div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/60 border-zinc-800/60">
              <div className="px-4 sm:px-6 py-4 border-b border-zinc-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-zinc-200">Top clients</h3>
                </div>
                <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] uppercase">
                  {overview.byClient.length} rows
                </Badge>
              </div>
              <CardContent className="p-5">
                {overview.byClient.length ? (
                  <div className="space-y-2">
                    {overview.byClient.slice(0, 8).map((r: any, idx: number) => (
                      <div key={r?.client_id ?? idx} className="flex items-center justify-between gap-4">
                        <span className="font-mono text-xs text-blue-400">
                          {String(r?.client_id ?? 'unknown').slice(0, 16)}{String(r?.client_id ?? '').length > 16 ? '…' : ''}
                        </span>
                        <div className="text-right">
                          <div className="font-mono text-sm text-emerald-400">
                            ${parseFloat(r?.total ?? 0).toFixed(2)}
                          </div>
                          <div className="font-mono text-[11px] text-zinc-500">
                            {r?.count ?? 0} ops
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-zinc-500">No data.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
