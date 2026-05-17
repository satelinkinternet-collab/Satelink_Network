'use client';
import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useDashboardFilters } from '@/lib/stores/dashboard-filters';
import { FilterBar } from '@/components/satelink/filter-bar';

const API = 'https://rpc.satelink.network';

const COLORS = {
  node: '#408A71',
  platform: '#00D1FF',
  distrib: '#a0a030',
  bg: '#091413',
  grid: '#1a3028',
  text: '#285A48',
};

function ChartCard({ title, sub, children, height = 200 }: {
  title: string;
  sub: string;
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <div className="bg-[#0c1a17] border border-[#1a3028] rounded p-4">
      <p className="text-[11px] font-semibold text-[#B0E4CC] mb-0.5">{title}</p>
      <p className="text-[9px] text-[#285A48] mb-4">{sub}</p>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, fmt }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#091413] border border-[#285A48] rounded p-3
                    text-[10px] shadow-lg">
      <p className="text-[#B0E4CC] font-semibold mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{ backgroundColor: p.color }} />
          <span className="text-[#285A48]">{p.name}:</span>
          <span className="font-mono font-semibold"
                style={{ color: p.color }}>
            {fmt ? fmt(p.value) : p.value?.toLocaleString?.() || p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { fmt, revenueType } = useDashboardFilters();
  const [epochs, setEpochs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/epochs`)
      .then(r => r.json())
      .then(d => {
        setEpochs((d.epochs || []).reverse());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const chartData = epochs.slice(-12).map((e: any) => ({
    epoch: `#${e.epoch_id ?? e.id ?? '?'}`,
    revenue: parseFloat(e.total_revenue_usdt || e.total || 0),
    nodePool: parseFloat(e.node_pool_usdt || (e.total || 0) * 0.5),
    platform: parseFloat(e.platform_share_usdt || (e.total || 0) * 0.3),
    distrib: parseFloat(e.distributor_share_usdt || (e.total || 0) * 0.2),
    requests: parseInt(e.total_requests || e.requests || 0),
  }));

  const totalRevenue = epochs.reduce((s, e) =>
    s + parseFloat(e.total_revenue_usdt || e.total || 0), 0);
  const totalNodePool = epochs.reduce((s, e) =>
    s + parseFloat(e.node_pool_usdt || (e.total || 0) * 0.5), 0);
  const totalPlatform = epochs.reduce((s, e) =>
    s + parseFloat(e.platform_share_usdt || (e.total || 0) * 0.3), 0);
  const totalRequests = epochs.reduce((s, e) =>
    s + parseInt(e.total_requests || e.requests || 0), 0);

  const pieData = [
    { name: 'Node Operators', value: totalNodePool, color: COLORS.node },
    { name: 'Platform Fee', value: totalPlatform, color: COLORS.platform },
    { name: 'Distribution', value: totalRevenue - totalNodePool - totalPlatform,
      color: COLORS.distrib },
  ].filter(d => d.value > 0);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-[11px] text-[#285A48] animate-pulse">
        Loading analytics...
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#091413]">
      <FilterBar page="analytics" />
      <div className="flex-1 overflow-auto p-5">

        {revenueType === 'metered' && (
          <div className="mb-4 p-3 bg-[#16140a] border border-[#3a3e18]
                          rounded text-[10px] text-[#a0a030] flex items-start gap-2">
            <span className="mt-0.5">⚠</span>
            <span>
              <strong>Metered revenue</strong> — economic value tracked by
              infrastructure usage at $0.000030/call. Real USDT collection
              requires API key payment enforcement. Switch filter to
              <strong> Collected</strong> to see on-chain confirmed revenue.
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            {label:'Total Metered', value:fmt(totalRevenue), color:'#B0E4CC'},
            {label:'Node Earnings', value:fmt(totalNodePool), color:'#408A71'},
            {label:'Platform Fee', value:fmt(totalPlatform), color:'#00D1FF'},
            {label:'Total Calls', value:totalRequests.toLocaleString(), color:'#B0E4CC'},
          ].map(m => (
            <div key={m.label}
                 className="bg-[#0c1a17] border border-[#1a3028] rounded p-4">
              <p className="text-[9px] text-[#285A48] uppercase
                            tracking-widest font-semibold mb-2">
                {m.label}
              </p>
              <p className="text-[20px] font-bold font-mono"
                 style={{ color: m.color }}>
                {m.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <ChartCard
            title="Revenue per Epoch — 50/30/20 Split"
            sub="Node pool · Platform fee · Distribution · metered USDT"
            height={220}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}
                         margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  {[
                    {id:'node', color: COLORS.node},
                    {id:'plat', color: COLORS.platform},
                    {id:'dist', color: COLORS.distrib},
                  ].map(g => (
                    <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={g.color} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={g.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke={COLORS.grid} />
                <XAxis dataKey="epoch" stroke={COLORS.text}
                       tick={{ fontSize: 9, fill: COLORS.text }} />
                <YAxis stroke={COLORS.text}
                       tick={{ fontSize: 9, fill: COLORS.text }}
                       tickFormatter={v => fmt(v)} width={70} />
                <Tooltip content={<CustomTooltip fmt={fmt} />} />
                <Area type="monotone" dataKey="nodePool" name="Node Pool"
                      stroke={COLORS.node} fill="url(#node)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="platform" name="Platform"
                      stroke={COLORS.platform} fill="url(#plat)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="distrib" name="Distribution"
                      stroke={COLORS.distrib} fill="url(#dist)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <ChartCard
            title="RPC Requests per Epoch"
            sub="Total calls processed across all chains"
            height={180}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}
                        margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={COLORS.grid} />
                <XAxis dataKey="epoch" stroke={COLORS.text}
                       tick={{ fontSize: 9, fill: COLORS.text }} />
                <YAxis stroke={COLORS.text}
                       tick={{ fontSize: 9, fill: COLORS.text }}
                       tickFormatter={v => v >= 1000 ?
                         `${(v/1000).toFixed(0)}K` : String(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="requests" name="RPC Calls"
                     fill={COLORS.node} radius={[2,2,0,0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Revenue Distribution"
            sub="Cumulative split across all epochs"
            height={180}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="40%" cy="50%"
                     innerRadius={45} outerRadius={70}
                     paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={0.9} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(v)}
                         contentStyle={{
                           background: COLORS.bg,
                           border: `1px solid ${COLORS.grid}`,
                           borderRadius: 4, fontSize: 10
                         }} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => (
                    <span style={{ fontSize: 10, color: COLORS.text }}>{v}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="bg-[#0c1a17] border border-[#1a3028] rounded p-4">
          <p className="text-[11px] font-semibold text-[#B0E4CC] mb-4">
            Unit Economics
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {label:'Price per call', value:'$0.000030', note:'USDT'},
              {label:'Calls per $1', value:'33,333', note:'requests'},
              {label:'Rate (current)', value:fmt(0.89)+'/hr', note:'metered'},
              {label:'To $500/hr', value:`${Math.round(500/0.89)}x`, note:'more traffic'},
            ].map(m => (
              <div key={m.label}>
                <p className="text-[9px] text-[#285A48] uppercase
                              tracking-widest font-semibold mb-1">
                  {m.label}
                </p>
                <p className="text-[16px] font-bold font-mono text-[#B0E4CC]">
                  {m.value}
                </p>
                <p className="text-[9px] text-[#285A48]">{m.note}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
