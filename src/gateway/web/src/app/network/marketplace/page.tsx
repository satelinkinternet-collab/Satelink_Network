'use client';
import { useEffect, useState } from 'react';

export default function MarketplacePage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/network/marketplace');
                const d = await res.json();
                if (d.ok) setData(d);
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
    }, []);

    const tierColor = (t: string) => ({ platinum: '#a78bfa', gold: '#fbbf24', silver: '#94a3b8', bronze: '#d97706' }[t] || '#64748b');
    const tierIcon = (t: string) => ({ platinum: '💎', gold: '🥇', silver: '🥈', bronze: '🥉' }[t] || '🔹');

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1a1a2e 50%, #0f172a 100%)' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '3rem 2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Network Quality Marketplace
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.5rem' }}>
                        {data?.total_ranked || 0} nodes ranked by performance. Quality wins.
                    </p>
                </div>

                {loading ? <p>Loading...</p> : data && (
                    <div>
                        {/* Tier Distribution */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
                            {(['platinum', 'gold', 'silver', 'bronze'] as const).map(t => {
                                const count = data.tier_distribution?.[t] || 0;
                                const total = data.total_ranked || 1;
                                return (
                                    <div key={t} style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: '1.5rem', border: `1px solid ${tierColor(t)}33`, textAlign: 'center' }}>
                                        <div style={{ fontSize: '2rem' }}>{tierIcon(t)}</div>
                                        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: tierColor(t) }}>{count}</div>
                                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>{t}</div>
                                        <div style={{ marginTop: 8, height: 4, background: '#334155', borderRadius: 2, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${(count / total) * 100}%`, background: tierColor(t), borderRadius: 2 }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            {/* Top 20 */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.5rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>🏆 Top 20 Nodes</h2>
                                {(data.top_nodes || []).length === 0 ? (
                                    <p style={{ color: '#64748b' }}>No ranked nodes yet.</p>
                                ) : (
                                    <div>
                                        {(data.top_nodes || []).map((n: any, i: number) => (
                                            <div key={n.node_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ color: '#64748b', fontSize: '0.8rem', width: 24 }}>#{i + 1}</span>
                                                    <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{n.node_id?.slice(0, 12)}...</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontWeight: 600 }}>{n.composite_score}</span>
                                                    <span style={{ fontSize: '0.9rem' }}>{tierIcon(n.tier)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Rising Stars */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.5rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>🚀 Rising Stars (7d)</h2>
                                {(data.rising_nodes || []).length === 0 ? (
                                    <p style={{ color: '#64748b' }}>No improvement data yet.</p>
                                ) : (
                                    <div>
                                        {(data.rising_nodes || []).map((n: any, i: number) => (
                                            <div key={n.node_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{n.node_id?.slice(0, 12)}...</span>
                                                <span style={{ color: '#22c55e', fontWeight: 600 }}>+{Math.round(n.improvement)} pts</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Most Reliable */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.5rem', border: '1px solid rgba(255,255,255,0.08)', gridColumn: 'span 2' }}>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>🛡️ Most Reliable Nodes</h2>
                                {(data.most_reliable || []).length === 0 ? (
                                    <p style={{ color: '#64748b' }}>No reliability data yet.</p>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' }}>
                                        {(data.most_reliable || []).map((n: any) => (
                                            <div key={n.node_id} style={{ background: '#0f172a', borderRadius: 10, padding: '1rem', border: '1px solid #334155' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{n.node_id?.slice(0, 14)}...</span>
                                                    <span>{tierIcon(n.tier)}</span>
                                                </div>
                                                <div style={{ marginTop: 8 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8' }}>
                                                        <span>Reliability</span>
                                                        <span style={{ color: '#22c55e', fontWeight: 600 }}>{Math.round(n.reliability_score)}%</span>
                                                    </div>
                                                    <div style={{ height: 6, background: '#334155', borderRadius: 3, marginTop: 4 }}>
                                                        <div style={{ height: '100%', width: `${n.reliability_score}%`, background: '#22c55e', borderRadius: 3 }} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
