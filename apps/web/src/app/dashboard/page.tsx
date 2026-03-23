'use client';

import { useDashboardData } from '@/hooks/useDashboardData';
import { RefreshCw, AlertCircle } from 'lucide-react';
import SystemOverview from '@/components/dashboard/SystemOverview';
import EconomicEngine from '@/components/dashboard/EconomicEngine';
import QueueExecution from '@/components/dashboard/QueueExecution';
import NodeOperator from '@/components/dashboard/NodeOperator';
import HealthPanel from '@/components/dashboard/HealthPanel';

export default function DashboardPage() {
  const { systemStatus, economics, queueHealth, systemHealth, isLoading, error } = useDashboardData(3000);

  if (isLoading && !systemStatus) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 gap-4">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <p className="animate-pulse font-medium">Initializing Real-time Telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Header section with active status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Control Panel</h1>
          <p className="text-slate-400 text-sm">Real-time system monitoring and operations</p>
        </div>
        
        {error && (
          <div className="flex items-center gap-2 bg-red-950/50 text-red-400 px-4 py-2 rounded-lg border border-red-900/50">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Degraded connectivity</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column (Wider for main charts/overview) */}
        <div className="xl:col-span-2 space-y-6">
          <SystemOverview data={systemStatus} isLoading={isLoading} />
          <EconomicEngine data={economics} isLoading={isLoading} />
          <QueueExecution data={queueHealth} isLoading={isLoading} />
        </div>

        {/* Right Column (Control logic & health) */}
        <div className="space-y-6">
          <NodeOperator isLoading={isLoading} />
          <HealthPanel data={systemHealth} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
