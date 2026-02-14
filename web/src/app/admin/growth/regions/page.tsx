'use client';
import { useEffect, useState } from 'react';

interface Region {
    region_code: string;
    region_name: string;
    status: string;
    node_cap: number;
    active_nodes_count: number;
    revenue_cap_usdt_daily: number;
    rewards_cap_usdt_daily: number;
}

export default function RegionsPage() {
    const [regions, setRegions] = useState<Region[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCode, setEditingCode] = useState<string | null>(null);
    const [form, setForm] = useState({ status: '', node_cap: 0, revenue_cap_usdt_daily: 0, rewards_cap_usdt_daily: 0 });

    const fetchRegions = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch('/api/admin/growth/regions', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.ok) setRegions(data.regions || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchRegions(); }, []);

    const updateRegion = async (code: string) => {
        const token = localStorage.getItem('admin_token');
        await fetch(`/api/admin/growth/regions/${code}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(form)
        });
        setEditingCode(null);
        fetchRegions();
    };

    const statusColor = (s: string) => {
        switch (s) {
            case 'active': return '#22c55e';
            case 'pilot': return '#f59e0b';
            case 'paused': return '#ef4444';
            default: return '#6b7280';
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>🌍 Region Activation Control</h1>
            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Manage region-by-region node expansion with caps and status controls.</p>

            {loading ? <p>Loading...</p> : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {regions.map(r => (
                        <div key={r.region_code} style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', border: '1px solid #334155' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{r.region_name || r.region_code}</h3>
                                    <code style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{r.region_code}</code>
                                </div>
                                <span style={{ background: statusColor(r.status) + '22', color: statusColor(r.status), padding: '4px 12px', borderRadius: 20, fontWeight: 600, fontSize: '0.85rem' }}>
                                    {r.status.toUpperCase()}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                                {[
                                    { label: 'Nodes', value: `${r.active_nodes_count} / ${r.node_cap}`, pct: (r.active_nodes_count / r.node_cap) * 100 },
                                    { label: 'Rev Cap', value: `$${r.revenue_cap_usdt_daily}/day` },
                                    { label: 'Reward Cap', value: `$${r.rewards_cap_usdt_daily}/day` },
                                    { label: 'Status', value: r.status },
                                ].map((m, i) => (
                                    <div key={i} style={{ background: '#0f172a', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
                                        <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4 }}>{m.label}</div>
                                        <div style={{ fontWeight: 600, fontSize: '1rem' }}>{m.value}</div>
                                        {m.pct !== undefined && (
                                            <div style={{ marginTop: 4, height: 4, background: '#334155', borderRadius: 2, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${Math.min(m.pct, 100)}%`, background: m.pct > 90 ? '#ef4444' : '#22c55e', borderRadius: 2 }} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {editingCode === r.region_code ? (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ background: '#0f172a', border: '1px solid #475569', borderRadius: 6, padding: '6px 10px', color: '#e2e8f0' }}>
                                        <option value="inactive">Inactive</option>
                                        <option value="pilot">Pilot</option>
                                        <option value="active">Active</option>
                                        <option value="paused">Paused</option>
                                    </select>
                                    <input type="number" placeholder="Node Cap" value={form.node_cap} onChange={e => setForm({ ...form, node_cap: +e.target.value })} style={{ background: '#0f172a', border: '1px solid #475569', borderRadius: 6, padding: '6px 10px', color: '#e2e8f0', width: 100 }} />
                                    <button onClick={() => updateRegion(r.region_code)} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer' }}>Save</button>
                                    <button onClick={() => setEditingCode(null)} style={{ background: '#475569', color: 'white', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer' }}>Cancel</button>
                                </div>
                            ) : (
                                <button onClick={() => { setEditingCode(r.region_code); setForm({ status: r.status, node_cap: r.node_cap, revenue_cap_usdt_daily: r.revenue_cap_usdt_daily, rewards_cap_usdt_daily: r.rewards_cap_usdt_daily }); }} style={{ background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer' }}>
                                    ✏️ Edit
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
