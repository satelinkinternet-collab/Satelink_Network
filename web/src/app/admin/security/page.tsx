"use client";
import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const alertColor = (type: string) => {
  if (type === 'FAILED_AUTH' || type === 'SUSPICIOUS_TX') return 'bg-red-500/15 text-red-400 border-red-500/30';
  if (type === 'PAUSE_WITHDRAWALS') return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  return 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30';
};

export default function AdminSecurityPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/admin-api/security/alerts');
        if (res.data?.ok) setAlerts(res.data.alerts || []);
      } catch {
        toast.error('Failed to load security alerts');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Security</h1>
        <p className="text-sm text-zinc-500 mt-1">{alerts.length} recent alert{alerts.length !== 1 ? 's' : ''}</p>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Loading...</p>}

      {!loading && (
        <Card className="bg-zinc-900/80 border-zinc-800/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-300">Security Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 && (
              <p className="text-zinc-500 text-sm py-6 text-center">No security alerts.</p>
            )}
            <div className="divide-y divide-zinc-800/60">
              {alerts.map((a: any, i: number) => (
                <div key={a.id ?? i} className="flex items-start justify-between py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-zinc-300 truncate">
                      {a.actor_wallet?.slice(0, 10) ?? '—'}…
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {a.created_at ? new Date(a.created_at).toLocaleString() : '—'}
                      {a.metadata ? ` · ${typeof a.metadata === 'string' ? a.metadata.slice(0, 60) : ''}` : ''}
                    </p>
                  </div>
                  <Badge className={`text-[10px] shrink-0 ${alertColor(a.action_type)}`}>
                    {a.action_type}
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
