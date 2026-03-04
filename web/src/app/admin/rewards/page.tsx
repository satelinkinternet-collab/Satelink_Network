"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminRewardsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [recentEpochs, setRecentEpochs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/admin-api/rewards/summary');
        if (res.data?.ok) {
          setSummary(res.data.summary);
          setRecentEpochs(res.data.recentEpochs || []);
        }
      } catch {
        toast.error('Failed to load rewards summary');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Rewards</h1>
          <p className="text-sm text-zinc-500 mt-1">Epoch distribution summary</p>
        </div>
        <Link
          href="/admin/rewards/epochs"
          className="text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-2 transition-colors"
        >
          View epochs detail →
        </Link>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Loading...</p>}

      {!loading && summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="bg-zinc-900/80 border-zinc-800/60">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Distributed</p>
                <p className="text-xl font-bold text-zinc-100 mt-1">${summary.totalDistributed}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/80 border-zinc-800/60">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Pending Rewards</p>
                <p className="text-xl font-bold text-amber-400 mt-1">${summary.pendingRewards}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/80 border-zinc-800/60">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Current Epoch</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">
                  {summary.currentEpoch ? `#${summary.currentEpoch.id}` : 'None'}
                </p>
                {summary.currentEpoch && (
                  <p className="text-xs text-zinc-500 mt-0.5">OPEN</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-zinc-900/80 border-zinc-800/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-300">Recent Epochs</CardTitle>
            </CardHeader>
            <CardContent>
              {recentEpochs.length === 0 && (
                <p className="text-zinc-500 text-sm py-4 text-center">No epoch data yet.</p>
              )}
              <div className="divide-y divide-zinc-800/60">
                {recentEpochs.map((ep: any) => (
                  <div key={ep.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">Epoch #{ep.id}</p>
                      <p className="text-xs text-zinc-500">
                        {ep.starts_at ? new Date(ep.starts_at).toLocaleDateString() : '—'}
                        {ep.ends_at ? ` – ${new Date(ep.ends_at).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-bold text-zinc-100">${(ep.distributed || 0).toFixed(2)}</p>
                      <Badge className={`text-[10px] ${ep.status === 'OPEN' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30'}`}>
                        {ep.status}
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
