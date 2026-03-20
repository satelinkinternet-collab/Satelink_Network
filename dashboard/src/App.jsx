import React, { useState, useEffect } from 'react';

const API_URL = 'https://stretch-pine-mug-municipality.trycloudflare.com/system/status';
console.log("Using API:", API_URL);

const TrendChart = ({ data, color, label }) => {
    if (!data || data.length === 0) return <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>Gathering data...</div>;

    const max = Math.max(...data, 1);
    
    return (
        <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{label}</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}>{data[data.length - 1]?.toLocaleString()}</span>
            </div>
            <div style={{ height: '120px', display: 'flex', alignItems: 'flex-end', gap: '4px', backgroundColor: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
                {data.map((val, i) => (
                    <div
                        key={i}
                        style={{
                            flex: 1,
                            height: `${(val / max) * 100}%`,
                            backgroundColor: color,
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.3s ease',
                            minHeight: '2px',
                        }}
                        title={val.toLocaleString()}
                    />
                ))}
            </div>
        </div>
    );
};

const App = () => {
    const [data, setData] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showOverlay, setShowOverlay] = useState(false);

    useEffect(() => {
        const hasSeenOverlay = localStorage.getItem('satelink_overlay_seen');
        if (!hasSeenOverlay) {
            setShowOverlay(true);
        }
    }, []);

    const dismissOverlay = () => {
        setShowOverlay(false);
        localStorage.setItem('satelink_overlay_seen', 'true');
    };

    const getSystemStory = () => {
        if (!data) return "System initializing...";
        
        if (data.system_health === 'critical') {
            return "System detected failure — recovery actions in progress.";
        }
        if (data.prediction?.risk_level === 'high') {
            return "Revenue dropping — predictive scaling activated.";
        }
        if (data.revenue_trend === 'growing') {
            return "Network is growing — revenue increasing and system scaling automatically.";
        }
        return "System is stable — monitoring network conditions in real-time.";
    };

    const getStateLabel = () => {
        if (data?.system_health === 'critical') return { label: 'FAILURE 🔴', color: '#ef4444' };
        if (data?.prediction?.risk_level === 'high') return { label: 'RISK ⚠️', color: '#f59e0b' };
        if (data?.revenue_trend === 'growing') return { label: 'GROWING 🚀', color: '#10b981' };
        return { label: 'STABLE 🟢', color: '#3b82f6' };
    };

    const fetchData = async () => {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const jsonData = await response.json();
            setData(jsonData);
            setHistory(prev => {
                const updated = [...prev, jsonData];
                return updated.slice(-20);
            });
            setError(null);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('System Offline or API Error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const triggerDemo = async (type) => {
        try {
            const baseUrl = API_URL.replace('/system/status', '');
            await fetch(`${baseUrl}/demo/${type}`, { method: 'POST' });
            // Immediate fetch to catch the change
            setTimeout(fetchData, 500); 
        } catch (err) {
            console.error('Demo trigger error:', err);
        }
    };

    const styles = {
        wrapper: {
            backgroundColor: '#f5f7fa',
            minHeight: '100vh',
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: '#1e293b',
            padding: '40px 20px',
            paddingBottom: '120px', 
        },
        container: {
            maxWidth: '1100px',
            margin: '0 auto',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
        },
        title: {
            fontSize: '24px',
            fontWeight: '800',
            color: '#0f172a',
            margin: 0,
            letterSpacing: '-0.02em',
        },
        stateLabel: (state) => ({
            fontSize: '12px',
            fontWeight: '900',
            letterSpacing: '0.05em',
            padding: '6px 14px',
            borderRadius: '4px',
            backgroundColor: state.color + '15',
            color: state.color,
            border: `1px solid ${state.color}30`,
        }),
        storyPanel: {
            backgroundColor: '#ffffff',
            padding: '24px 32px',
            borderRadius: '16px',
            marginBottom: '32px',
            boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)',
            borderLeft: `6px solid ${getStateLabel().color}`,
            transition: 'border-color 0.5s ease',
        },
        storyText: {
            fontSize: '20px',
            fontWeight: '600',
            color: '#1e293b',
            margin: 0,
            lineHeight: '1.4',
        },
        kpiGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
            marginBottom: '32px',
        },
        card: (options = {}) => ({
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: options.glow ? '0 0 15px rgba(16, 185, 129, 0.4)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: options.alert ? '2px solid #ef4444' : '2px solid transparent',
            transition: 'all 0.3s ease',
            cursor: 'default',
            animation: options.flash ? 'flash-white 1s ease' : 'none',
        }),
        cardHover: {
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        kpiLabel: {
            fontSize: '13px',
            fontWeight: '700',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '4px',
            display: 'block',
        },
        kpiSubtext: {
            fontSize: '11px',
            color: '#94a3b8',
            marginBottom: '12px',
            display: 'block',
        },
        kpiValue: {
            fontSize: '32px',
            fontWeight: '700',
            color: '#0f172a',
            margin: 0,
        },
        mainGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            marginBottom: '32px',
        },
        sectionTitle: {
            fontSize: '16px',
            fontWeight: '700',
            color: '#64748b',
            textTransform: 'uppercase',
            marginBottom: '16px',
            letterSpacing: '0.05em',
        },
        predictionPanel: {
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: 'white',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            boxShadow: '0 12px 30px -10px rgba(15, 23, 42, 0.5)',
            animation: data?.demo_active ? 'pulse-blue 2s infinite' : 'none',
        },
        predictionValue: (color) => ({
            fontSize: '28px',
            fontWeight: '800',
            color: color || '#818cf8',
            textShadow: '0 0 10px rgba(129, 140, 248, 0.3)',
        }),
        actionCard: (type, status) => ({
            padding: '16px',
            borderRadius: '10px',
            marginBottom: '16px',
            backgroundColor: type === 'RECOVERY_ACTION' ? '#fff1f2' : (type === 'SCALING_ACTION' ? '#f5f3ff' : (type === 'PREVENTIVE_ACTION' ? '#f0fdf4' : '#f0f9ff')),
            border: `2px solid ${type === 'RECOVERY_ACTION' ? '#fda4af' : (type === 'SCALING_ACTION' ? '#ddd6fe' : (type === 'PREVENTIVE_ACTION' ? '#bbf7d0' : '#bae6fd'))}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            animation: status === 'triggered' && type === 'RECOVERY_ACTION' ? 'pulse-red 2s infinite' : (status === 'triggered' ? 'pulse-subtle 2s infinite' : 'none'),
            position: 'relative',
        }),
        demoBar: {
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#ffffff',
            padding: '12px 24px',
            borderRadius: '50px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            zIndex: 1000,
            border: '1px solid #e2e8f0',
        },
        demoBtn: (active) => ({
            padding: '10px 18px',
            borderRadius: '25px',
            border: 'none',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: active ? '#0f172a' : '#f8fafc',
            color: active ? '#ffffff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
        }),
        overlay: {
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
        },
        overlayContent: {
            backgroundColor: 'white',
            padding: '48px',
            borderRadius: '24px',
            maxWidth: '500px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        },
        overlayBtn: {
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '14px 32px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            marginTop: '24px',
            transition: 'transform 0.2s ease',
        },
        demoGuidance: {
            fontSize: '12px',
            fontWeight: '600',
            color: '#3b82f6',
            marginBottom: '8px',
            display: 'block',
        }
    };

    // Injecting keyframes
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes pulse-red {
                0% { border-color: #fda4af; box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.4); }
                70% { border-color: #ef4444; box-shadow: 0 0 0 10px rgba(244, 63, 94, 0); }
                100% { border-color: #fda4af; box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
            }
            @keyframes pulse-blue {
                0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
                70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
                100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
            }
            @keyframes flash-white {
                0% { background-color: #ffffff; }
                50% { background-color: #f0f9ff; }
                100% { background-color: #ffffff; }
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    const [hoveredCard, setHoveredCard] = useState(null);

    if (loading && !data) {
        return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Satelink OS Loading...</div>;
    }

    const state = getStateLabel();
    const revenueDeltas = history.map((h, i) => i === 0 ? 0 : Math.max(0, h.total_revenue - history[i - 1].total_revenue));
    const earningsDeltas = history.map((h, i) => i === 0 ? 0 : Math.max(0, h.total_earnings - history[i - 1].total_earnings));

    return (
        <div style={styles.wrapper}>
            {showOverlay && (
                <div style={styles.overlay}>
                    <div style={styles.overlayContent}>
                        <h2 style={{ fontSize: '28px', color: '#0f172a', marginBottom: '16px' }}>Autonomous Intelligence</h2>
                        <p style={{ fontSize: '16px', color: '#64748b', lineHeight: '1.6' }}>
                            Welcome to the Satelink Network. This system automatically detects, predicts, and responds to network conditions in real time.
                        </p>
                        <button style={styles.overlayBtn} onClick={dismissOverlay}>Explore Dashboard</button>
                    </div>
                </div>
            )}

            <div style={styles.container}>
                <header style={styles.header}>
                    <h1 style={styles.title}>SATELINK OPERATIONAL HUD</h1>
                    <div style={styles.stateLabel(state)}>{state.label}</div>
                </header>

                <div style={styles.storyPanel}>
                    <p style={styles.storyText}>{getSystemStory()}</p>
                </div>

                <div style={styles.kpiGrid}>
                    <div style={styles.card({ alert: data?.total_revenue === 0 })} onMouseEnter={() => setHoveredCard('rev')} onMouseLeave={() => setHoveredCard(null)}>
                        <span style={styles.kpiLabel}>Revenue</span>
                        <span style={styles.kpiSubtext}>Total value generated</span>
                        <p style={styles.kpiValue}>${data?.total_revenue?.toLocaleString() || '0'}</p>
                    </div>
                    <div style={styles.card()} onMouseEnter={() => setHoveredCard('earn')} onMouseLeave={() => setHoveredCard(null)}>
                        <span style={styles.kpiLabel}>Earnings</span>
                        <span style={styles.kpiSubtext}>Distributed to nodes</span>
                        <p style={styles.kpiValue}>${data?.total_earnings?.toLocaleString() || '0'}</p>
                    </div>
                    <div style={styles.card()} onMouseEnter={() => setHoveredCard('bal')} onMouseLeave={() => setHoveredCard(null)}>
                        <span style={styles.kpiLabel}>Balances</span>
                        <span style={styles.kpiSubtext}>Available payouts</span>
                        <p style={styles.kpiValue}>${data?.total_balances?.toLocaleString() || '0'}</p>
                    </div>
                </div>

                <div style={styles.predictionPanel}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '14px', fontWeight: '800', margin: 0, textTransform: 'uppercase', color: '#94a3b8' }}>PREDICEIVE ENGINE</h2>
                        <div style={{ fontSize: '11px', backgroundColor: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '4px' }}>ACTIVE</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                        <div><span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>EST. REVENUE (5M)</span><span style={styles.predictionValue('#818cf8')}>${data.prediction?.revenue_next_5min?.toFixed(2)}</span></div>
                        <div><span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>MODEL CONFIDENCE</span><span style={styles.predictionValue('#34d399')}>{data.prediction?.confidence}%</span></div>
                        <div><span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>RISK THRESHOLD</span><span style={styles.predictionValue('#f472b6')}>{data.prediction?.risk_level?.toUpperCase()}</span></div>
                    </div>
                </div>

                <div style={styles.mainGrid}>
                    <section>
                        <h2 style={styles.sectionTitle}>Real-time Velocity</h2>
                        <div style={styles.card()}>
                            <TrendChart label="Revenue Velocity" data={revenueDeltas} color="#3b82f6" />
                            <div style={{ margin: '24px 0', borderTop: '1px solid #f1f5f9' }}></div>
                            <TrendChart label="Earnings Velocity" data={earningsDeltas} color="#10b981" />
                        </div>
                    </section>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <section>
                            <h2 style={styles.sectionTitle}>Autonomous Response</h2>
                            <div style={styles.card()}>
                                {data.actions && data.actions.length > 0 ? data.actions.map((a, i) => (
                                    <div key={i} style={styles.actionCard(a.type, a.status)}>
                                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800' }}>{a.type.replace('_ACTION','')}</div>
                                        <div style={{ fontSize: '14px', fontWeight: '700' }}>{a.action.replace(/_/g, ' ')}</div>
                                    </div>
                                )) : <div style={{ color: '#94a3b8', fontSize: '13px' }}>Idle - No response needed</div>}
                            </div>
                        </section>
                        <section>
                            <h2 style={styles.sectionTitle}>Anomalies Detected</h2>
                            <div style={styles.card()}>
                                {data.alerts?.length > 0 ? data.alerts.map((a, i) => (
                                    <div key={i} style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', marginBottom: '8px', fontSize: '13px' }}>{a.message}</div>
                                )) : <div style={{ color: '#10b981', fontSize: '13px', fontWeight: '600' }}>✓ Systems Clear</div>}
                            </div>
                        </section>
                    </div>
                </div>

                <div style={styles.demoBar}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {data.demo_active && <span style={styles.demoGuidance}>Switching scenarios...</span>}
                        {!data.demo_active && <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800' }}>SIMULATE CONDITIONS</span>}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button style={styles.demoBtn(data.demo_active === 'spike')} onClick={() => triggerDemo('traffic-spike')}>🚀 Spike</button>
                            <button style={styles.demoBtn(data.demo_active === 'failure')} onClick={() => triggerDemo('failure')}>💥 Failure</button>
                            <button style={styles.demoBtn(data.demo_active === 'drop')} onClick={() => triggerDemo('revenue-drop')}>📉 Drop</button>
                            {data.demo_active && <button style={{ ...styles.demoBtn(false), backgroundColor: '#fee2e2', color: '#ef4444' }} onClick={() => triggerDemo('reset')}>Reset</button>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
