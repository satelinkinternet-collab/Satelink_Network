"use client";
import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function NodeEarningsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/node-api/earnings');
        if (res.data?.ok) setData(res.data);
        else setError(res.data?.error || 'Failed to load earnings');
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load earnings');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Node Earnings</h1>
        <p className="text-sm text-zinc-500 mt-1">Your epoch-by-epoch earnings history</p>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Loading...</p>}
      {error && <div className="text-red-400 text-sm">Error: {error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="bg-zinc-900/80 border-zinc-800/60">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Earned</p>
                <p className="text-xl font-bold text-zinc-100 mt-1">${data.totalEarned}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/80 border-zinc-800/60">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Claimable</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">${data.claimable}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/80 border-zinc-800/60">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Records</p>
                <p className="text-xl font-bold text-zinc-100 mt-1">{data.total}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-zinc-900/80 border-zinc-800/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-300">Earnings History</CardTitle>
            </CardHeader>
            <CardContent>
              {data.earnings?.length === 0 && (
                <p className="text-zinc-500 text-sm py-4 text-center">No earnings records yet.</p>
              )}
              <div className="divide-y divide-zinc-800/60">
                {data.earnings?.map((e: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">Epoch #{e.epoch_id}</p>
                      <p className="text-xs text-zinc-500">{e.split_type || e.role || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-zinc-100">${(e.amount_usdt || 0).toFixed(4)}</p>
                      <Badge className={`text-[10px] ${e.status === 'UNPAID' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'}`}>
                        {e.status || 'PAID'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
