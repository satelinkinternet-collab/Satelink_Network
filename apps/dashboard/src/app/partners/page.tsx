'use client';
import { useEffect, useState } from 'react';

interface PartnerPublic {
    partner_id: string;
    partner_name: string;
    total_ops: number;
}

interface SLA {
    uptime_pct: number;
    total_operations: number;
    response_time_avg_ms: number;
}

export default function PublicPartnersPage() {
    const [partners, setPartners] = useState<PartnerPublic[]>([]);
    const [sla, setSla] = useState<SLA | null>(null);
    const [ops, setOps] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/partners');
                const data = await res.json();
                if (data.ok) {
                    setPartners(data.partners || []);
                    setSla(data.sla);
                    setOps(data.supported_ops || []);
                }
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
            <div style={{ maxWidth: 960, margin: '0 auto', padding: '3rem 2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Satelink Partners
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.5rem' }}>
                        Enterprise-grade DePIN infrastructure, powered by a global node network.
                    </p>
                </div>

                {/* SLA Stats */}
                {sla && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
                        {[
                            { label: 'Network Uptime', value: `${sla.uptime_pct.toFixed(1)}%`, icon: '🟢' },
                            { label: 'Total Operations', value: sla.total_operations.toLocaleString(), icon: '⚡' },
                            { label: 'Avg Response', value: `${sla.response_time_avg_ms}ms`, icon: '🚀' },
                        ].map((m, i) => (
                            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem' }}>{m.icon}</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#e2e8f0', marginTop: 4 }}>{m.value}</div>
                                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{m.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Supported Ops */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '2rem', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>Supported Operation Types</h2>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {ops.map(op => (
                            <span key={op} style={{ background: '#3b82f622', color: '#60a5fa', padding: '6px 16px', borderRadius: 20, fontWeight: 600, fontSize: '0.9rem', border: '1px solid #3b82f644' }}>
                                {op}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Partners */}
                {loading ? <p>Loading...</p> : (
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '2rem', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>Approved Partners</h2>
                        {partners.length === 0 ? (
                            <p style={{ color: '#64748b' }}>Partner ecosystem growing — contact us to apply.</p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                                {partners.map(p => (
                                    <div key={p.partner_id} style={{ background: '#0f172a', borderRadius: 12, padding: '1.25rem', border: '1px solid #334155' }}>
                                        <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>{p.partner_name || 'Partner'}</h3>
                                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 4 }}>
                                            {p.total_ops.toLocaleString()} operations processed
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Contact */}
                <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #312e81 100%)', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>Become a Partner</h2>
                    <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>Integrate with Satelink&apos;s DePIN infrastructure for your applications.</p>
                    <a href="mailto:partners@satelink.io" style={{ display: 'inline-block', background: '#3b82f6', color: 'white', padding: '10px 28px', borderRadius: 8, fontWeight: 600, textDecoration: 'none' }}>
                        Contact Us →
                    </a>
                </div>
            </div>
        </div>
    );
}
