'use client';

import { TerminalSquare, Layers, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { QueueHealthData } from '@/services/api';

export default function QueueExecution({ data, isLoading }: { data: QueueHealthData | null, isLoading: boolean }) {
  const depth = data?.depthPerPriority || { high: 0, normal: 0, low: 0 };
  const dlqSize = data?.dlqSize || 0;
  const throughput = data?.throughput || 0;

  const totalDepth = depth.high + depth.normal + depth.low;

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 relative">
      <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <TerminalSquare className="w-5 h-5 text-fuchsia-400" />
        Queue & Execution
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Priority Breakdown */}
        <div className="md:col-span-2 bg-slate-950/50 border border-slate-800/50 rounded-lg p-5">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-medium text-slate-400">Queue Depth by Priority</h3>
             <span className="text-xs font-semibold text-slate-300 bg-slate-800/80 px-2 py-1 rounded-md">
               Total: {totalDepth.toLocaleString()}
             </span>
           </div>
           
           <div className="space-y-4">
             <PriorityBar label="High" value={depth.high} max={Math.max(totalDepth, 100)} color="bg-rose-500" />
             <PriorityBar label="Normal" value={depth.normal} max={Math.max(totalDepth, 100)} color="bg-blue-500" />
             <PriorityBar label="Low" value={depth.low} max={Math.max(totalDepth, 100)} color="bg-slate-500" />
           </div>
        </div>

        {/* DLQ & Throughput Stats */}
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-4 flex-1 flex flex-col justify-center items-center relative overflow-hidden group">
            <div className={`absolute inset-0 bg-rose-500/5 transition-opacity ${dlqSize > 0 ? 'opacity-100 animate-pulse' : 'opacity-0'}`} />
            <AlertTriangle className={`w-6 h-6 mb-2 ${dlqSize > 0 ? 'text-rose-500' : 'text-slate-500'}`} />
            <div className="text-2xl font-bold text-white tracking-tight">{dlqSize}</div>
            <div className="text-xs font-medium text-slate-400">Dead Letter Queue</div>
          </div>
          
          <div className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-4 flex-1 flex flex-col justify-center items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-fuchsia-500/5" />
            <ArrowUpRight className="w-6 h-6 mb-2 text-fuchsia-400" />
            <div className="text-2xl font-bold text-white tracking-tight">{throughput} <span className="text-sm font-normal text-slate-500">jobs/m</span></div>
            <div className="text-xs font-medium text-slate-400">Avg Throughput</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriorityBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div>
      <div className="flex justify-between items-center mb-1 text-xs font-medium">
        <span className="text-slate-400">{label}</span>
        <span className="text-white">{value.toLocaleString()}</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-2 rounded-full ${color} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
