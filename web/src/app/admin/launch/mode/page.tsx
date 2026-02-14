'use client';
import { useEffect, useState } from 'react';

export default function LaunchModePage() {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    const fetchStatus = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch('/api/admin/launch/mode', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.ok) setStatus(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchStatus(); }, []);

    const toggle = async () => {
        setToggling(true);
        const token = localStorage.getItem('admin_token');
        await fetch('/api/admin/launch/mode/toggle', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        await fetchStatus();
        setToggling(false);
    };

    const enabled = status?.launch_mode_enabled;

    return (
        <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>🚀 Launch Mode Control</h1>
            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Marketing surge protection — tightens all safety parameters when enabled.</p>

            {loading ? <p>Loading...</p> : status && (
                <div>
                    <div style={{ background: enabled ? '#7c2d1222' : '#1e293b', border: `2px solid ${enabled ? '#ef4444' : '#334155'}`, borderRadius: 16, padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{enabled ? '🔴' : '🟢'}</div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: enabled ? '#ef4444' : '#22c55e' }}>
                            Launch Mode: {enabled ? 'ACTIVE' : 'OFF'}
                        </h2>
                        {enabled && status.activated_at && (
                            <p style={{ color: '#94a3b8', marginTop: 4, fontSize: '0.85rem' }}>
                                Activated: {new Date(status.activated_at).toLocaleString()}
                            </p>
                        )}
                        <button onClick={toggle} disabled={toggling}
                            style={{ marginTop: '1.5rem', background: enabled ? '#22c55e' : '#ef4444', color: enabled ? '#000' : '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', opacity: toggling ? 0.5 : 1 }}>
                            {toggling ? 'Toggling...' : enabled ? '✅ Disable Launch Mode' : '🚨 Enable Launch Mode'}
                        </button>
                    </div>

                    <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>When enabled, Launch Mode will:</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        {[
                            { icon: '🛡️', label: 'Increase abuse sensitivity', detail: 'Set to HIGH' },
                            { icon: '💰', label: 'Increase surge pricing', detail: '2x boost' },
                            { icon: '⬇️', label: 'Lower rewards caps', detail: '50% reduction' },
                            { icon: '📝', label: 'Enhanced logging', detail: 'All events captured' },
                        ].map((item, i) => (
                            <div key={i} style={{ background: '#1e293b', borderRadius: 8, padding: '1rem', border: '1px solid #334155' }}>
                                <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                                <div style={{ fontWeight: 600, marginTop: 4 }}>{item.label}</div>
                                <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{item.detail}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', marginTop: '1.5rem', border: '1px solid #334155' }}>
                        <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Current Status</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>Rewards Mode: <strong>{status.rewards_mode}</strong></div>
                            <div>Abuse Sensitivity: <strong>{status.abuse_sensitivity}</strong></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
