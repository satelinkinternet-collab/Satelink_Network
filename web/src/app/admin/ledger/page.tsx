"use client";
import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminLedgerPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/admin-api/ledger/runs');
        if (res.data?.ok) {
          setRuns(res.data.runs || []);
          setTotal(res.data.total || 0);
        }
      } catch {
        toast.error('Failed to load ledger runs');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Ledger</h1>
        <p className="text-sm text-zinc-500 mt-1">{total} distribution run{total !== 1 ? 's' : ''}</p>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Loading...</p>}

      {!loading && (
        <Card className="bg-zinc-900/80 border-zinc-800/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-300">Distribution Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {runs.length === 0 && (
              <p className="text-zinc-500 text-sm py-6 text-center">No distribution runs yet.</p>
            )}
            <div className="divide-y divide-zinc-800/60">
              {runs.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">Run #{r.id}</p>
                    <p className="text-xs text-zinc-500">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-zinc-100">
                      ${(r.total_amount_usdt || 0).toFixed(2)}
                    </p>
                    <span className="text-xs text-zinc-500">{r.transaction_count ?? 0} txns</span>
                    <Badge className={`text-[10px] ${r.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : r.status === 'FAILED' ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}>
                      {r.status || 'PENDING'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
