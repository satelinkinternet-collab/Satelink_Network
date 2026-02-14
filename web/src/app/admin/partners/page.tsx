'use client';
import { useEffect, useState } from 'react';

interface Partner {
    partner_id: string;
    partner_name: string;
    wallet: string;
    status: string;
    rate_limit_per_min: number;
    revenue_share_percent: number;
    total_revenue: number;
    total_ops: number;
}

export default function PartnersPage() {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRegister, setShowRegister] = useState(false);
    const [newPartner, setNewPartner] = useState({ partner_name: '', wallet: '', rate_limit_per_min: 60, revenue_share_percent: 10 });
    const [apiKeyResult, setApiKeyResult] = useState<string | null>(null);

    const fetchPartners = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch('/api/admin/partners', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.ok) setPartners(data.partners || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchPartners(); }, []);

    const registerPartner = async () => {
        const token = localStorage.getItem('admin_token');
        const res = await fetch('/api/admin/partners/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(newPartner)
        });
        const data = await res.json();
        if (data.api_key) setApiKeyResult(data.api_key);
        setShowRegister(false);
        fetchPartners();
    };

    const action = async (endpoint: string, partner_id: string) => {
        const token = localStorage.getItem('admin_token');
        await fetch(`/api/admin/partners/${endpoint}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ partner_id })
        });
        fetchPartners();
    };

    const statusColor = (s: string) => s === 'active' ? '#22c55e' : s === 'suspended' ? '#ef4444' : '#f59e0b';

    return (
        <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>🤝 Partner Management</h1>
                    <p style={{ color: '#94a3b8' }}>Onboard, approve, and manage API partners.</p>
                </div>
                <button onClick={() => setShowRegister(true)} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>
                    + Register Partner
                </button>
            </div>

            {apiKeyResult && (
                <div style={{ background: '#14532d', border: '1px solid #22c55e', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                    <strong>⚠️ API Key (show once):</strong>
                    <code style={{ display: 'block', marginTop: 8, wordBreak: 'break-all', color: '#86efac' }}>{apiKeyResult}</code>
                    <button onClick={() => setApiKeyResult(null)} style={{ marginTop: 8, background: '#22c55e', color: '#000', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>Dismiss</button>
                </div>
            )}

            {showRegister && (
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Register New Partner</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <input placeholder="Partner Name" value={newPartner.partner_name} onChange={e => setNewPartner({ ...newPartner, partner_name: e.target.value })} style={{ background: '#0f172a', border: '1px solid #475569', borderRadius: 6, padding: '8px 12px', color: '#e2e8f0' }} />
                        <input placeholder="Wallet Address" value={newPartner.wallet} onChange={e => setNewPartner({ ...newPartner, wallet: e.target.value })} style={{ background: '#0f172a', border: '1px solid #475569', borderRadius: 6, padding: '8px 12px', color: '#e2e8f0' }} />
                        <input type="number" placeholder="Rate Limit / min" value={newPartner.rate_limit_per_min} onChange={e => setNewPartner({ ...newPartner, rate_limit_per_min: +e.target.value })} style={{ background: '#0f172a', border: '1px solid #475569', borderRadius: 6, padding: '8px 12px', color: '#e2e8f0' }} />
                        <input type="number" placeholder="Revenue Share %" value={newPartner.revenue_share_percent} onChange={e => setNewPartner({ ...newPartner, revenue_share_percent: +e.target.value })} style={{ background: '#0f172a', border: '1px solid #475569', borderRadius: 6, padding: '8px 12px', color: '#e2e8f0' }} />
                    </div>
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <button onClick={registerPartner} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, padding: '8px 20px', cursor: 'pointer' }}>Submit</button>
                        <button onClick={() => setShowRegister(false)} style={{ background: '#475569', color: 'white', border: 'none', borderRadius: 6, padding: '8px 20px', cursor: 'pointer' }}>Cancel</button>
                    </div>
                </div>
            )}

            {loading ? <p>Loading...</p> : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #334155' }}>
                                {['Partner', 'Status', 'Rate Limit', 'Rev Share', 'Total Ops', 'Total Revenue', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '12px 8px', textAlign: 'left', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {partners.map(p => (
                                <tr key={p.partner_id} style={{ borderBottom: '1px solid #1e293b' }}>
                                    <td style={{ padding: '12px 8px' }}>
                                        <div style={{ fontWeight: 600 }}>{p.partner_name || p.partner_id}</div>
                                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{p.partner_id}</div>
                                    </td>
                                    <td><span style={{ color: statusColor(p.status), fontWeight: 600 }}>{p.status.toUpperCase()}</span></td>
                                    <td>{p.rate_limit_per_min}/min</td>
                                    <td>{p.revenue_share_percent}%</td>
                                    <td>{p.total_ops.toLocaleString()}</td>
                                    <td>${p.total_revenue.toFixed(2)}</td>
                                    <td style={{ display: 'flex', gap: 4 }}>
                                        {p.status === 'pending' && <button onClick={() => action('approve', p.partner_id)} style={{ background: '#22c55e', color: '#000', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem' }}>Approve</button>}
                                        {p.status !== 'suspended' && <button onClick={() => action('suspend', p.partner_id)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem' }}>Suspend</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
