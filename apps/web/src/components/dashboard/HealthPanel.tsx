'use client';

import { Activity, Database, Server, Wifi } from 'lucide-react';
import { SystemHealthData } from '@/services/api';

export default function HealthPanel({ data, isLoading }: { data: SystemHealthData | null, isLoading: boolean }) {
  const dbStatus = data?.dbStatus || 'online';
  const redisStatus = data?.redisStatus || 'online';
  const apiLatencyMs = data?.apiLatencyMs || 45;

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 relative">
      <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <Activity className="w-5 h-5 text-emerald-400" />
        System Health
      </h2>

      <div className="space-y-3">
        <StatusRow 
          label="Database (PostgreSQL)" 
          status={dbStatus} 
          icon={<Database className="w-4 h-4" />} 
        />
        <StatusRow 
          label="Cache & Queue (Redis)" 
          status={redisStatus} 
          icon={<Server className="w-4 h-4" />} 
        />
        
        <div className="pt-3 mt-3 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
              <Wifi className="w-4 h-4 text-blue-400" />
              API Latency
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{apiLatencyMs} ms</span>
              <LatencyPing latency={apiLatencyMs} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, status, icon }: { label: string; status: string; icon: React.ReactNode }) {
  let statusColor = 'bg-slate-500';
  let txColor = 'text-slate-500';
  let badgeText = 'Unknown';

  if (status === 'online') {
    statusColor = 'bg-emerald-500';
    txColor = 'text-emerald-500';
    badgeText = 'Operational';
  } else if (status === 'degraded') {
    statusColor = 'bg-amber-500';
    txColor = 'text-amber-500';
    badgeText = 'Degraded';
  } else if (status === 'offline') {
    statusColor = 'bg-rose-500';
    txColor = 'text-rose-500';
    badgeText = 'Offline';
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800/50">
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-md bg-slate-900 ${txColor}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-slate-300">{label}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-400">{badgeText}</span>
        <div className={`w-2 h-2 rounded-full ${statusColor} ${status === 'online' ? 'animate-pulse' : ''}`} />
      </div>
    </div>
  );
}

function LatencyPing({ latency }: { latency: number }) {
  const bars = 3;
  let activeBars = 1;
  let color = 'bg-rose-500';

  if (latency < 100) {
    activeBars = 3;
    color = 'bg-emerald-500';
  } else if (latency < 300) {
    activeBars = 2;
    color = 'bg-amber-500';
  }

  return (
    <div className="flex items-end gap-0.5 h-3">
      {[...Array(bars)].map((_, i) => (
        <div 
          key={i} 
          className={`w-1 rounded-sm ${i < activeBars ? color : 'bg-slate-700'}`}
          style={{ height: `${(i + 1) * 33}%` }}
        />
      ))}
    </div>
  );
}
