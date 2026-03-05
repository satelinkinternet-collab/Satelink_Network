"use client";
import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const LEVELS = ['', 'ERROR', 'WARN', 'INFO'];

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = level ? `?level=${level}` : '';
        const res = await api.get(`/admin-api/logs${params}`);
        if (res.data?.ok) {
          setLogs(res.data.logs || []);
          setTotal(res.data.total || 0);
        }
      } catch {
        toast.error('Failed to load logs');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [level]);

  const levelColor = (l: string) => {
    if (l === 'ERROR') return 'bg-red-500/15 text-red-400 border-red-500/30';
    if (l === 'WARN')  return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    return 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30';
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Logs</h1>
          <p className="text-sm text-zinc-500 mt-1">{total} entries</p>
        </div>
        <select
          value={level}
          onChange={e => setLevel(e.target.value)}
          className="text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 rounded px-3 py-1.5 focus:outline-none"
        >
          {LEVELS.map(l => (
            <option key={l} value={l}>{l || 'All levels'}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Loading...</p>}

      {!loading && (
        <Card className="bg-zinc-900/80 border-zinc-800/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-300">Error Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 && (
              <p className="text-zinc-500 text-sm py-6 text-center">No log entries.</p>
            )}
            <div className="divide-y divide-zinc-800/60">
              {logs.map((l: any, i: number) => (
                <div key={l.id ?? i} className="py-3 flex items-start gap-3">
                  <Badge className={`text-[10px] mt-0.5 shrink-0 ${levelColor(l.level)}`}>
                    {l.level || 'INFO'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 font-mono break-all">{l.message || l.msg || JSON.stringify(l)}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {l.ts ? new Date(l.ts).toLocaleString() : '—'}
                      {l.source ? ` · ${l.source}` : ''}
                    </p>
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
