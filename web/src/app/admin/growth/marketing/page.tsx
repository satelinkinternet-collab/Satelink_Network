'use client';
import { useEffect, useState } from 'react';

export default function MarketingDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const token = localStorage.getItem('admin_token');
                const res = await fetch('/api/admin/growth/marketing', { headers: { Authorization: `Bearer ${token}` } });
                const d = await res.json();
                if (d.ok) setData(d);
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
    }, []);

    return (
        <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>📈 Marketing Performance Dashboard</h1>
            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Scale based on data, not emotion.</p>

            {loading ? <p>Loading...</p> : data && (
                <div>
                    {/* Alerts */}
                    {data.alerts?.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            {data.alerts.map((a: any, i: number) => (
                                <div key={i} style={{ background: a.level === 'critical' ? '#7f1d1d' : a.level === 'warning' ? '#78350f' : '#1e293b', border: `1px solid ${a.level === 'critical' ? '#ef4444' : a.level === 'warning' ? '#f59e0b' : '#334155'}`, borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
                                    <strong>{a.level === 'critical' ? '🚨' : '⚠️'} {a.level.toUpperCase()}:</strong> {a.message}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Metrics Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                        {[
                            { label: 'Active Nodes', value: data.active_nodes, color: '#3b82f6' },
                            { label: 'Churn Rate', value: `${data.churn_rate?.toFixed(1)}%`, color: data.churn_rate > 10 ? '#ef4444' : '#22c55e' },
                            { label: 'Ops This Week', value: data.ops_this_week?.toLocaleString(), color: '#8b5cf6' },
                            { label: 'Ops Growth', value: `${data.ops_growth_rate > 0 ? '+' : ''}${data.ops_growth_rate?.toFixed(1)}%`, color: data.ops_growth_rate >= 0 ? '#22c55e' : '#ef4444' },
                        ].map((m, i) => (
                            <div key={i} style={{ background: '#1e293b', borderRadius: 12, padding: '1.25rem', border: '1px solid #334155', textAlign: 'center' }}>
                                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4 }}>{m.label}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: m.color }}>{m.value}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        {/* Nodes Per Day */}
                        <div style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', border: '1px solid #334155' }}>
                            <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>📊 New Nodes / Day</h3>
                            {(data.nodes_per_day || []).length === 0 ? (
                                <p style={{ color: '#64748b' }}>No node data yet</p>
                            ) : (
                                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 120 }}>
                                    {(data.nodes_per_day || []).map((d: any, i: number) => {
                                        const max = Math.max(...data.nodes_per_day.map((x: any) => x.count), 1);
                                        return (
                                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <div style={{ width: '100%', background: '#3b82f6', borderRadius: 4, height: `${(d.count / max) * 100}px`, minHeight: 4 }} />
                                                <div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: 4 }}>{d.day?.slice(5)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Partner Usage */}
                        <div style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', border: '1px solid #334155' }}>
                            <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>🤝 Partner Usage</h3>
                            {(data.partner_usage || []).length === 0 ? (
                                <p style={{ color: '#64748b' }}>No active partners yet</p>
                            ) : (
                                <div>
                                    {(data.partner_usage || []).map((p: any, i: number) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #334155' }}>
                                            <span>{p.partner_name || p.partner_id}</span>
                                            <span style={{ color: '#22c55e' }}>{p.total_ops} ops / ${p.total_revenue?.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
