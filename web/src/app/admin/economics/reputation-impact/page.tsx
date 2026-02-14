'use client';
import { useEffect, useState } from 'react';

export default function ReputationImpactPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const token = localStorage.getItem('admin_token');
                const res = await fetch('/api/admin/economics/reputation-impact', { headers: { Authorization: `Bearer ${token}` } });
                const d = await res.json();
                if (d.ok) setData(d);
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
    }, []);

    const tierColor = (t: string) => ({ platinum: '#a78bfa', gold: '#fbbf24', silver: '#94a3b8', bronze: '#d97706' }[t] || '#64748b');

    return (
        <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>💰 Reputation Impact on Rewards</h1>
            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>How tier multipliers affect the treasury and node payouts.</p>

            {loading ? <p>Loading...</p> : data && (
                <div>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                        {[
                            { label: 'Current Daily Rewards', value: `$${data.current_daily_rewards}`, color: '#3b82f6' },
                            { label: 'Projected w/ Multipliers', value: `$${data.projected_with_multipliers}`, color: '#22c55e' },
                            { label: 'Treasury Delta', value: `${data.delta >= 0 ? '+' : ''}$${data.delta} (${data.delta_pct}%)`, color: data.delta >= 0 ? '#ef4444' : '#22c55e' },
                        ].map((m, i) => (
                            <div key={i} style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', border: '1px solid #334155', textAlign: 'center' }}>
                                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 4 }}>{m.label}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: m.color }}>{m.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Multiplier Table */}
                    <div style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', border: '1px solid #334155', marginBottom: '2rem' }}>
                        <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Tier Multiplier Configuration</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #334155' }}>
                                    {['Tier', 'Threshold', 'Multiplier', 'Node Count', 'Projected Daily'].map(h => (
                                        <th key={h} style={{ padding: '10px 8px', textAlign: 'left', color: '#94a3b8', fontSize: '0.8rem' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {['platinum', 'gold', 'silver', 'bronze'].map(t => (
                                    <tr key={t} style={{ borderBottom: '1px solid #1e293b' }}>
                                        <td style={{ padding: '10px 8px' }}>
                                            <span style={{ color: tierColor(t), fontWeight: 600 }}>{t === 'platinum' ? '💎' : t === 'gold' ? '🥇' : t === 'silver' ? '🥈' : '🥉'} {t.toUpperCase()}</span>
                                        </td>
                                        <td>≥ {data.tier_thresholds?.[t] || (t === 'bronze' ? '0' : '—')}</td>
                                        <td style={{ fontWeight: 600 }}>{data.multipliers?.[t]}x</td>
                                        <td>{data.tiers?.[t]?.count || data.tier_distribution?.[t] || 0}</td>
                                        <td style={{ color: '#22c55e' }}>${data.tiers?.[t]?.projected_daily || '0.00'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Safety Notice */}
                    <div style={{ background: '#1e3a5f', borderRadius: 12, padding: '1.5rem', border: '1px solid #2563eb' }}>
                        <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>⚠️ Safety Constraints</h3>
                        <ul style={{ color: '#94a3b8', margin: 0, paddingLeft: '1.5rem' }}>
                            <li>Total daily rewards cap <strong>still enforced</strong> — multipliers cannot push above cap</li>
                            <li>Rewards throttle remains active</li>
                            <li>No unlimited payouts — bronze nodes earn less, not zero</li>
                            <li>Multiplier can be disabled via <code>reputation_multiplier_enabled</code> system flag</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
