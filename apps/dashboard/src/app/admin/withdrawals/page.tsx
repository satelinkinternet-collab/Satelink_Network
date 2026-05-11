"use client";
import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);

  async function load() {
    try {
      const res = await api.get('/admin-api/withdrawals?status=PENDING');
      if (res.data?.ok) {
        setWithdrawals(res.data.withdrawals || []);
        setTotal(res.data.total || 0);
      }
    } catch {
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    setActing(id);
    try {
      await api.post(`/admin-api/withdrawals/${id}/${action}`);
      toast.success(`Withdrawal ${action === 'approve' ? 'approved' : 'rejected'}`);
      setWithdrawals(prev => prev.filter(w => w.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || `Failed to ${action}`);
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Pending Withdrawals</h1>
        <p className="text-sm text-zinc-500 mt-1">{total} pending request{total !== 1 ? 's' : ''}</p>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Loading...</p>}

      {!loading && (
        <Card className="bg-zinc-900/80 border-zinc-800/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-300">Withdrawal Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 && (
              <p className="text-zinc-500 text-sm py-6 text-center">No pending withdrawals.</p>
            )}
            <div className="divide-y divide-zinc-800/60">
              {withdrawals.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-zinc-200 truncate">{w.wallet}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {new Date(w.created_at).toLocaleString()} · #{w.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-zinc-100 whitespace-nowrap">
                      ${(w.amount_usdt || 0).toFixed(4)}
                    </p>
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
                      {w.status}
                    </Badge>
                    <button
                      onClick={() => handleAction(w.id, 'approve')}
                      disabled={acting === w.id}
                      className="px-3 py-1 text-xs font-medium rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(w.id, 'reject')}
                      disabled={acting === w.id}
                      className="px-3 py-1 text-xs font-medium rounded bg-red-900/60 hover:bg-red-800/70 text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Reject
                    </button>
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
