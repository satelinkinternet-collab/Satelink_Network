'use client';
import { useEffect, useState } from 'react';

export default function ReferralsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const token = localStorage.getItem('admin_token');
                const res = await fetch('/api/admin/growth/referrals', { headers: { Authorization: `Bearer ${token}` } });
                const d = await res.json();
                if (d.ok) setData(d);
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
    }, []);

    return (
        <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>🌳 Referral & Growth Incentive Engine</h1>
            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Tiered commissions, fraud detection, and referral tree analytics.</p>

            {loading ? <p>Loading...</p> : data && (
                <div>
                    {/* Fraud Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                        {[
                            { label: 'Total Fraud Flags', value: data.fraud?.total_flags || 0, color: data.fraud?.total_flags > 0 ? '#ef4444' : '#22c55e' },
                            { label: 'Commission Total', value: `$${(data.commissions?.total || 0).toFixed(2)}`, color: '#3b82f6' },
                            { label: 'Multi-Wallet Alerts', value: data.fraud?.multi_wallet_alerts || 0, color: '#f59e0b' },
                        ].map((m, i) => (
                            <div key={i} style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', border: '1px solid #334155', textAlign: 'center' }}>
                                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 4 }}>{m.label}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: m.color }}>{m.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Referral Tree */}
                    <div style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', border: '1px solid #334155' }}>
                        <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Top Distributors</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #334155' }}>
                                    {['Wallet', 'Tier', 'Depth', 'Decay (days)', 'Total Earned'].map(h => (
                                        <th key={h} style={{ padding: '10px 8px', textAlign: 'left', color: '#94a3b8', fontSize: '0.8rem' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(data.referralTree || []).map((r: any, i: number) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                                        <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.distributor_wallet?.slice(0, 12)}...</td>
                                        <td style={{ padding: '10px 8px' }}>
                                            <span style={{ background: r.tier_level === 1 ? '#3b82f622' : '#8b5cf622', color: r.tier_level === 1 ? '#3b82f6' : '#8b5cf6', padding: '2px 8px', borderRadius: 10, fontSize: '0.8rem' }}>
                                                L{r.tier_level || 1}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 8px' }}>{r.referral_depth || 0}</td>
                                        <td style={{ padding: '10px 8px' }}>{r.decay_days || 90}</td>
                                        <td style={{ padding: '10px 8px', fontWeight: 600, color: '#22c55e' }}>${(r.total_earned || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
