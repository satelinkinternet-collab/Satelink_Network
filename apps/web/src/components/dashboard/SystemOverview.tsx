'use client';

import { Activity, Zap, Server, Layers } from 'lucide-react';
import { SystemStatusData } from '@/services/api';

export default function SystemOverview({ data, isLoading }: { data: SystemStatusData | null, isLoading: boolean }) {
  // Using default mock data slightly to structure the UI if backend not fully up
  const revenue = data?.revenue || 0;
  const jobsPerSec = data?.jobsPerSec || 0;
  const queueDepth = data?.queueDepth || 0;
  const activeWorkers = data?.activeWorkers || 0;

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

      <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <Activity className="w-5 h-5 text-blue-500" />
        System Overview
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`$${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Live Cumulative"
          icon={<Zap className="w-4 h-4 text-emerald-400" />}
          gradient="from-emerald-500/20 to-emerald-500/0"
          border="border-emerald-500/20"
          isLoading={isLoading && !data}
        />
        <MetricCard
          title="Throughput"
          value={`${jobsPerSec.toLocaleString()} j/s`}
          subtitle="Current Speed"
          icon={<Activity className="w-4 h-4 text-blue-400" />}
          gradient="from-blue-500/20 to-blue-500/0"
          border="border-blue-500/20"
          isLoading={isLoading && !data}
        />
        <MetricCard
          title="Queue Depth"
          value={queueDepth.toLocaleString()}
          subtitle="Pending Jobs"
          icon={<Layers className="w-4 h-4 text-amber-400" />}
          gradient="from-amber-500/20 to-amber-500/0"
          border="border-amber-500/20"
          isLoading={isLoading && !data}
        />
        <MetricCard
          title="Active Workers"
          value={activeWorkers.toLocaleString()}
          subtitle="Compute Nodes"
          icon={<Server className="w-4 h-4 text-indigo-400" />}
          gradient="from-indigo-500/20 to-indigo-500/0"
          border="border-indigo-500/20"
          isLoading={isLoading && !data}
        />
      </div>
    </div>
  );
}

function MetricCard({ 
  title, value, subtitle, icon, gradient, border, isLoading 
}: { 
  title: string; value: string; subtitle: string; icon: React.ReactNode; gradient: string; border: string; isLoading: boolean;
}) {
  return (
    <div className={`bg-slate-950/50 rounded-lg p-5 border ${border} relative overflow-hidden group hover:border-slate-600 transition-colors`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20 group-hover:opacity-40 transition-opacity`} />
      
      <div className="relative z-10">
        <div className="flex items-centerjustify-between mb-3">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm font-medium text-slate-400">{title}</span>
            <div className="p-1.5 rounded-md bg-slate-900 shadow-inner">
              {icon}
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="h-8 w-24 bg-slate-800 rounded animate-pulse mb-1 mt-2" />
        ) : (
          <div className="text-2xl font-bold text-white tracking-tight mb-1">{value}</div>
        )}
        
        <div className="text-xs text-slate-500 font-medium">{subtitle}</div>
      </div>
    </div>
  );
}
