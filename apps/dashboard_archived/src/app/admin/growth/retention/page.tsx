"use client";
import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminRetentionPage() {
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [churnRisk, setChurnRisk] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/admin/economics/retention');
        if (res.data?.ok) {
          setCohorts(res.data.cohorts || []);
          setChurnRisk(res.data.churnRisk || []);
        }
      } catch {
        toast.error('Failed to load retention data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Retention</h1>
        <p className="text-sm text-zinc-500 mt-1">Weekly cohort activity and churn-risk nodes</p>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Loading...</p>}

      {!loading && (
        <>
          {/* Cohort chart */}
          <Card className="bg-zinc-900/80 border-zinc-800/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-300">Weekly Cohort Retention</CardTitle>
            </CardHeader>
            <CardContent>
              {cohorts.length === 0 ? (
                <p className="text-zinc-500 text-sm py-4 text-center">No cohort data yet.</p>
              ) : (
                <div className="space-y-3">
                  {cohorts.map((c: any) => (
                    <div key={c.week} className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500 w-20 shrink-0 font-mono">{c.week}</span>
                      <div className="flex-1 bg-zinc-800/60 rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            c.retained_pct >= 70 ? 'bg-emerald-500' :
                            c.retained_pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.max(c.retained_pct, 2)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-zinc-200 w-10 text-right">{c.retained_pct}%</span>
                      <span className="text-xs text-zinc-500 w-24 text-right">{c.active}/{c.total} active</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Churn-risk list */}
          <Card className="bg-zinc-900/80 border-zinc-800/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-zinc-300">Churn-Risk Nodes</CardTitle>
                <span className="text-xs text-zinc-500">{churnRisk.length} at risk</span>
              </div>
            </CardHeader>
            <CardContent>
              {churnRisk.length === 0 ? (
                <p className="text-zinc-500 text-sm py-4 text-center">No churn-risk nodes detected.</p>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {churnRisk.map((n: any) => (
                    <div key={n.node_id} className="flex items-center justify-between py-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-zinc-200">{n.node_id}</p>
                        <p className="text-xs text-zinc-500 truncate">
                          {n.wallet?.slice(0, 6)}…{n.wallet?.slice(-4)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-zinc-400">{n.days_inactive}d inactive</span>
                        <Badge className={`text-[10px] ${
                          n.risk === 'HIGH'
                            ? 'bg-red-500/15 text-red-400 border-red-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}>
                          {n.risk}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
