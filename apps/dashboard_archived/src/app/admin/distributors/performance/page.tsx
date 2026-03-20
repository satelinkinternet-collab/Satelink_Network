"use client";

import { useState, useEffect } from 'react';

interface Distributor {
    distributor_wallet: string;
    referrals: number;
    activated_nodes: number;
    revenue_contributed: number;
    commission_earned: number;
    fraud_score: number;
}

interface FraudAlert {
    type: string;
    severity: string;
    wallet?: string;
    detail: string;
}

export default function DistributorPerformancePage() {
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/admin/distributors/performance', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
        })
            .then(r => r.json())
            .then(d => {
                setDistributors(d.distributors || []);
                setFraudAlerts(d.fraud_summary?.alerts || []);
                setLoading(false);
            })
            .catch(e => { setError(e.message); setLoading(false); });
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-400">Loading distributor data...</div>;
    if (error) return <div className="p-8 text-center text-red-400">Error: {error}</div>;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Distributor Performance</h1>
                <p className="text-sm text-slate-400 mt-1">Referrals, revenue, commissions, and fraud flags</p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Distributors" value={distributors.length} />
                <StatCard label="Total Referrals" value={distributors.reduce((a, d) => a + d.referrals, 0)} />
                <StatCard label="Total Commissions" value={`$${distributors.reduce((a, d) => a + d.commission_earned, 0).toFixed(2)}`} color="text-emerald-400" />
                <StatCard label="Fraud Alerts" value={fraudAlerts.length} color={fraudAlerts.length > 0 ? "text-red-400" : "text-emerald-400"} />
            </div>

            {/* Fraud Alerts Banner */}
            {fraudAlerts.length > 0 && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                    <h3 className="text-red-400 font-semibold text-sm mb-2">⚠️ Active Fraud Alerts ({fraudAlerts.length})</h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                        {fraudAlerts.map((a, i) => (
                            <div key={i} className="text-xs text-red-300 flex gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${a.severity === 'high' ? 'bg-red-700' : 'bg-amber-700'}`}>
                                    {a.type}
                                </span>
                                <span>{a.detail}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase text-slate-400 bg-slate-800/50">
                        <tr>
                            <th className="px-4 py-3">Distributor</th>
                            <th className="px-4 py-3">Referrals</th>
                            <th className="px-4 py-3">Activated</th>
                            <th className="px-4 py-3">Revenue</th>
                            <th className="px-4 py-3">Commission</th>
                            <th className="px-4 py-3">Fraud Score</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {distributors.map(d => (
                            <tr key={d.distributor_wallet} className="hover:bg-slate-700/50">
                                <td className="px-4 py-3 font-mono text-blue-400 truncate max-w-[200px]">{d.distributor_wallet}</td>
                                <td className="px-4 py-3">{d.referrals}</td>
                                <td className="px-4 py-3">{d.activated_nodes}</td>
                                <td className="px-4 py-3 text-emerald-400">${d.revenue_contributed?.toFixed(4)}</td>
                                <td className="px-4 py-3 text-amber-400">${d.commission_earned?.toFixed(4)}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${d.fraud_score >= 50 ? 'bg-red-700 text-red-200' : d.fraud_score >= 20 ? 'bg-amber-700 text-amber-200' : 'bg-emerald-800 text-emerald-300'}`}>
                                        {d.fraud_score}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {distributors.length === 0 && (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No distributor data yet</td></tr>
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
