"use client";
import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AdminRevenuePage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/admin-api/revenue/summary');
        if (res.data?.ok) setSummary(res.data.summary);
      } catch {
        toast.error('Failed to load revenue summary');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Revenue</h1>
        <p className="text-sm text-zinc-500 mt-1">Protocol revenue summary</p>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Loading...</p>}

      {!loading && summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="bg-zinc-900/80 border-zinc-800/60">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Today</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">${summary.today}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/80 border-zinc-800/60">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">All Time</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">${summary.total}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-zinc-900/80 border-zinc-800/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-300">By Event Type</CardTitle>
            </CardHeader>
            <CardContent>
              {(!summary.byType || summary.byType.length === 0) && (
                <p className="text-zinc-500 text-sm py-4 text-center">No revenue events yet.</p>
              )}
              <div className="divide-y divide-zinc-800/60">
                {(summary.byType || []).map((b: any) => (
                  <div key={b.type} className="flex items-center justify-between py-3">
                    <p className="text-sm font-mono text-zinc-300">{b.type}</p>
                    <p className="text-sm font-bold text-zinc-100">${b.amount}</p>
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
