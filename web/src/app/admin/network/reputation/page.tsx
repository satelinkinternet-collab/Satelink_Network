'use client';
import { useEffect, useState } from 'react';

interface NodeRep {
    node_id: string;
    uptime_score: number;
    latency_score: number;
    reliability_score: number;
    fraud_penalty_score: number;
    revenue_score: number;
    composite_score: number;
    tier: string;
}

export default function ReputationDashboard() {
    const [nodes, setNodes] = useState<NodeRep[]>([]);
    const [tiers, setTiers] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [computing, setComputing] = useState(false);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch('/api/admin/network/reputation', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.ok) { setNodes(data.nodes || []); setTiers(data.tiers || {}); }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const triggerCompute = async () => {
        setComputing(true);
        const token = localStorage.getItem('admin_token');
        await fetch('/api/admin/network/reputation/compute', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        await fetchData();
        setComputing(false);
    };

    const tierColor = (t: string) => ({ platinum: '#a78bfa', gold: '#fbbf24', silver: '#94a3b8', bronze: '#d97706' }[t] || '#64748b');
    const tierBg = (t: string) => tierColor(t) + '22';

    const scoreBar = (score: number, color: string) => (
        <div style={{ height: 6, background: '#334155', borderRadius: 3, overflow: 'hidden', width: '100%' }}>
            <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }} />
        </div>
    );

    return (
        <div style={{ padding: '2rem', maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>⭐ Node Reputation Dashboard</h1>
                    <p style={{ color: '#94a3b8' }}>Quality rankings across all network nodes.</p>
                </div>
                <button onClick={triggerCompute} disabled={computing}
                    style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, cursor: 'pointer', opacity: computing ? 0.5 : 1 }}>
                    {computing ? '⏳ Computing...' : '🔄 Recompute Scores'}
                </button>
            </div>

            {/* Tier Distribution */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {(['platinum', 'gold', 'silver', 'bronze'] as const).map(t => (
                    <div key={t} style={{ background: '#1e293b', borderRadius: 12, padding: '1.25rem', border: `2px solid ${tierColor(t)}44`, textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem' }}>{t === 'platinum' ? '💎' : t === 'gold' ? '🥇' : t === 'silver' ? '🥈' : '🥉'}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: tierColor(t) }}>{tiers[t] || 0}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>{t}</div>
                    </div>
                ))}
            </div>

            {loading ? <p>Loading...</p> : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #334155' }}>
                                {['Node', 'Tier', 'Composite', 'Uptime', 'Latency', 'Reliability', 'Revenue', 'Fraud Penalty'].map(h => (
                                    <th key={h} style={{ padding: '12px 8px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {nodes.map((n, i) => (
                                <tr key={n.node_id} style={{ borderBottom: '1px solid #1e293b' }}>
                                    <td style={{ padding: '10px 8px' }}>
                                        <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{n.node_id.slice(0, 14)}...</div>
                                        <div style={{ color: '#64748b', fontSize: '0.7rem' }}>#{i + 1}</div>
                                    </td>
                                    <td><span style={{ background: tierBg(n.tier), color: tierColor(n.tier), padding: '3px 10px', borderRadius: 12, fontWeight: 600, fontSize: '0.8rem' }}>{n.tier.toUpperCase()}</span></td>
                                    <td style={{ fontWeight: 700, color: n.composite_score >= 85 ? '#a78bfa' : n.composite_score >= 70 ? '#fbbf24' : '#e2e8f0' }}>{n.composite_score}</td>
                                    <td style={{ width: 120 }}>{scoreBar(n.uptime_score, '#22c55e')}<span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{Math.round(n.uptime_score)}</span></td>
                                    <td style={{ width: 120 }}>{scoreBar(n.latency_score, '#3b82f6')}<span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{Math.round(n.latency_score)}</span></td>
                                    <td style={{ width: 120 }}>{scoreBar(n.reliability_score, '#8b5cf6')}<span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{Math.round(n.reliability_score)}</span></td>
                                    <td style={{ width: 120 }}>{scoreBar(n.revenue_score, '#06b6d4')}<span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{Math.round(n.revenue_score)}</span></td>
                                    <td style={{ width: 120 }}>{scoreBar(n.fraud_penalty_score, '#ef4444')}<span style={{ fontSize: '0.7rem', color: n.fraud_penalty_score > 20 ? '#ef4444' : '#94a3b8' }}>{Math.round(n.fraud_penalty_score)}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {nodes.length === 0 && <p style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>No reputation data. Click "Recompute Scores" to generate scores for all registered nodes.</p>}
                </div>
            )}
        </div>
    );
}
