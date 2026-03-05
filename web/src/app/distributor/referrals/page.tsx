"use client";
import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function DistributorReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/dist-api/referrals');
        if (res.data?.ok) {
          setReferrals(res.data.referrals || []);
          setSummary(res.data.summary || null);
        }
      } catch {
        toast.error('Failed to load referrals');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const copyCode = () => {
    if (!summary?.ref_code) return;
    navigator.clipboard.writeText(summary.ref_code).then(() => toast.success('Referral code copied'));
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Referrals</h1>
        <p className="text-sm text-zinc-500 mt-1">Track signups and earnings from your referral code</p>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Loading...</p>}

      {!loading && summary && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-zinc-900/80 border-zinc-800/60">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Your Code</p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm font-bold text-emerald-400 font-mono">{summary.ref_code}</code>
                  <button onClick={copyCode} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">copy</button>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/80 border-zinc-800/60">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Signups</p>
                <p className="text-xl font-bold text-zinc-100 mt-1">{summary.total_signups}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/80 border-zinc-800/60">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Earnings</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">${summary.total_earnings}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/80 border-zinc-800/60">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Commission Rate</p>
                <p className="text-xl font-bold text-zinc-100 mt-1">{summary.commission_rate}</p>
              </CardContent>
            </Card>
          </div>

          {/* Referrals table */}
          <Card className="bg-zinc-900/80 border-zinc-800/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-300">
                Referred Wallets ({referrals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 && (
                <p className="text-zinc-500 text-sm py-6 text-center">No referrals yet. Share your code to get started.</p>
              )}
              {referrals.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-zinc-800/60">
                        <th className="pb-2 text-xs font-medium text-zinc-500 pr-4">Code</th>
                        <th className="pb-2 text-xs font-medium text-zinc-500 pr-4">Wallet</th>
                        <th className="pb-2 text-xs font-medium text-zinc-500 pr-4">Signups</th>
                        <th className="pb-2 text-xs font-medium text-zinc-500 pr-4">Earnings</th>
                        <th className="pb-2 text-xs font-medium text-zinc-500 pr-4">Commission</th>
                        <th className="pb-2 text-xs font-medium text-zinc-500 pr-4">Status</th>
                        <th className="pb-2 text-xs font-medium text-zinc-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {referrals.map((r: any, i: number) => (
                        <tr key={r.id ?? i}>
                          <td className="py-3 pr-4">
                            <code className="text-xs font-mono text-emerald-400">{r.code}</code>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="font-mono text-xs text-zinc-300">
                              {r.referee_wallet?.slice(0, 6)}…{r.referee_wallet?.slice(-4)}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-zinc-300">{r.signups_count}</td>
                          <td className="py-3 pr-4 font-medium text-zinc-100">${r.earnings}</td>
                          <td className="py-3 pr-4 text-zinc-300">{r.commission_rate}</td>
                          <td className="py-3 pr-4">
                            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                              {r.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-xs text-zinc-500">
                            {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
