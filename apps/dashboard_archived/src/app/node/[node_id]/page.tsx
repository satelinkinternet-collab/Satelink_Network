'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function NodeProfilePage() {
    const params = useParams();
    const nodeId = params.node_id as string;
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/node/${nodeId}`);
                const d = await res.json();
                if (d.ok) setData(d);
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
    }, [nodeId]);

    const tierColor = (t: string) => ({ platinum: '#a78bfa', gold: '#fbbf24', silver: '#94a3b8', bronze: '#d97706' }[t] || '#64748b');

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
            <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 2rem' }}>
                {loading ? <p>Loading...</p> : !data ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                        <h1 style={{ fontSize: '2rem' }}>Node not found</h1>
                        <p style={{ color: '#94a3b8' }}>This node has no reputation data yet.</p>
                    </div>
                ) : (
                    <div>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ fontSize: '3rem' }}>{data.tier === 'platinum' ? '💎' : data.tier === 'gold' ? '🥇' : data.tier === 'silver' ? '🥈' : '🥉'}</div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: tierColor(data.tier) }}>{data.tier?.toUpperCase()} NODE</h1>
                            <code style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{data.node_id}</code>
                        </div>

                        {/* Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                            {[
                                { label: 'Composite Score', value: data.composite_score, icon: '⭐' },
                                { label: 'Uptime', value: `${data.uptime_pct}%`, icon: '🟢' },
                                { label: 'Total Ops', value: data.total_ops?.toLocaleString(), icon: '⚡' },
                            ].map((m, i) => (
                                <div key={i} style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem' }}>{m.icon}</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e2e8f0', marginTop: 4 }}>{m.value}</div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{m.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Score Breakdown */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '2rem', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Score Breakdown</h2>
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {[
                                    { label: 'Latency Quality', score: data.avg_latency_score, color: '#3b82f6' },
                                ].map((s, i) => (
                                    <div key={i}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{s.label}</span>
                                            <span style={{ fontWeight: 600, color: s.color }}>{Math.round(s.score)}/100</span>
                                        </div>
                                        <div style={{ height: 8, background: '#334155', borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${s.score}%`, background: s.color, borderRadius: 4 }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sparkline History */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '2rem', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>📈 Reputation History</h2>
                            {(data.history || []).length === 0 ? (
                                <p style={{ color: '#64748b' }}>No history yet.</p>
                            ) : (
                                <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 80 }}>
                                    {(data.history || []).map((h: any, i: number) => {
                                        const max = 100;
                                        return (
                                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <div style={{ width: '100%', background: tierColor(h.tier), borderRadius: 3, height: `${(h.composite_score / max) * 100}%`, minHeight: 2, opacity: 0.8 }} />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Last Active */}
                        {data.last_active && (
                            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                                Last active: {new Date(data.last_active).toLocaleString()}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
