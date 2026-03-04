"use client";
import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DistributorReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/dist-api/referrals');
        if (res.data?.ok) setReferrals(res.data.referrals || []);
        else setError(res.data?.error || 'Failed to load referrals');
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load referrals');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Referrals</h1>
        <p className="text-sm text-zinc-500 mt-1">Wallets referred through your referral link</p>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Loading...</p>}
      {error && <div className="text-red-400 text-sm">Error: {error}</div>}

      {!loading && !error && (
        <Card className="bg-zinc-900/80 border-zinc-800/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-300">
              Referred Wallets ({referrals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 && (
              <p className="text-zinc-500 text-sm py-4 text-center">No referrals yet.</p>
            )}
            <div className="divide-y divide-zinc-800/60">
              {referrals.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-mono text-zinc-200">
                      {r.referee_wallet?.slice(0, 6)}…{r.referee_wallet?.slice(-4)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {r.created_at ? new Date(r.created_at * 1000).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <Badge className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                    {r.status || 'activated'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
