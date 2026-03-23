'use client';

import { Wallet, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import { EconomicsData } from '@/services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function EconomicEngine({ data, isLoading }: { data: EconomicsData | null, isLoading: boolean }) {
  // Mock data for visual appeal if backend not returning graph data yet
  const revenueGraph = data?.revenueGraph?.length ? data.revenueGraph : [
    { time: '00:00', amount: 120 },
    { time: '04:00', amount: 300 },
    { time: '08:00', amount: 450 },
    { time: '12:00', amount: 480 },
    { time: '16:00', amount: 590 },
    { time: '20:00', amount: 800 },
    { time: '24:00', amount: 950 },
  ];

  const distribution = data?.distribution || { nodeEarnings: 50, treasury: 30, burned: 20 };
  const pieData = [
    { name: 'Nodes (50%)', value: distribution.nodeEarnings, color: '#3b82f6' }, // blue-500
    { name: 'Treasury (30%)', value: distribution.treasury, color: '#10b981' }, // emerald-500
    { name: 'Burned (20%)', value: distribution.burned, color: '#f59e0b' }, // amber-500
  ];

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 relative">
      <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <Wallet className="w-5 h-5 text-indigo-400" />
        Economic Engine
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Graph */}
        <div className="col-span-1 lg:col-span-2 bg-slate-950/50 border border-slate-800/50 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Revenue Trajectory</h3>
            <div className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +14.2% Today
            </div>
          </div>
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueGraph} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} width={40} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Pie & Stats */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-5 flex-1 relative overflow-hidden">
             {/* Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
            
            <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-slate-500" />
              Epoch Distribution
            </h3>
            
            <div className="h-32 w-full flex items-center justify-center relative z-10">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={45}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', padding: '4px 8px' }}
                      itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
            </div>
            
            <div className="space-y-2 mt-2 relative z-10">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-400">{item.name}</span>
                  </div>
                  <span className="text-slate-200 font-medium">{item.value.toLocaleString()} USDT</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
