"use client";

import { useState, useEffect } from 'react';

export default function ProfitabilityPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/admin/revenue/profitability', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
        })
            .then(r => r.json())
            .then(d => { setData(d.data || []); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-400">Loading profitability data...</div>;
    if (error) return <div className="p-8 text-center text-red-400">Error: {error}</div>;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Node Profitability Dashboard</h1>
                <p className="text-sm text-slate-400 mt-1">Per-node economics, uptime, and attrition risk</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Nodes" value={data.length} />
                <StatCard label="Profitable" value={data.filter(n => n.simulated_net_profit >= 0).length} color="text-emerald-400" />
                <StatCard label="Unprofitable" value={data.filter(n => n.simulated_net_profit < 0).length} color="text-red-400" />
                <StatCard label="Avg Uptime" value={data.length > 0 ? `${(data.reduce((a, n) => a + n.uptime_pct, 0) / data.length).toFixed(1)}%` : '—'} />
            </div>

            {/* Table */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase text-slate-400 bg-slate-800/50">
                        <tr>
                            <th className="px-4 py-3">Rank</th>
                            <th className="px-4 py-3">Node</th>
                            <th className="px-4 py-3">Revenue</th>
                            <th className="px-4 py-3">Rewards</th>
                            <th className="px-4 py-3">Net Profit</th>
                            <th className="px-4 py-3">Uptime %</th>
                            <th className="px-4 py-3">Success %</th>
                            <th className="px-4 py-3">Avg Latency</th>
                            <th className="px-4 py-3">Ops</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {data.map(n => (
                            <tr key={n.node} className="hover:bg-slate-700/50">
                                <td className="px-4 py-3 font-mono text-slate-300">#{n.rank}</td>
                                <td className="px-4 py-3 font-mono text-blue-400 truncate max-w-[200px]">{n.node}</td>
                                <td className="px-4 py-3 text-emerald-400">${n.revenue_generated?.toFixed(4)}</td>
                                <td className="px-4 py-3 text-amber-400">${n.rewards_earned?.toFixed(4)}</td>
                                <td className={`px-4 py-3 font-semibold ${n.simulated_net_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ${n.simulated_net_profit?.toFixed(4)}
                                </td>
                                <td className="px-4 py-3">{n.uptime_pct}%</td>
                                <td className={`px-4 py-3 ${n.op_success_rate >= 95 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {n.op_success_rate}%
                                </td>
                                <td className="px-4 py-3">{n.avg_latency_ms}ms</td>
                                <td className="px-4 py-3">{n.op_count}</td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">No profitability data yet</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
    return (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <div className="text-xs text-slate-400">{label}</div>
            <div className={`text-2xl font-bold mt-1 ${color || 'text-white'}`}>{value}</div>
        </div>
    );
}
