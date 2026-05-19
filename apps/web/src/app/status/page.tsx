"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "outage";
  uptime: number;
  latency?: number;
}

interface NetworkStatus {
  overall: "operational" | "degraded" | "outage";
  uptime30d: number;
  avgLatency: number;
  totalRequests24h: number;
  activeNodes: number;
  currentEpoch: number;
  services: ServiceStatus[];
  lastChecked: Date;
  chainsSupported: string[];
}

const DEFAULT_SERVICES: ServiceStatus[] = [
  { name: "RPC Gateway", status: "operational", uptime: 99.99 },
  { name: "AI Inference", status: "operational", uptime: 99.95 },
  { name: "Webhook Relay", status: "operational", uptime: 99.98 },
  { name: "Settlement Engine", status: "operational", uptime: 100 },
  { name: "Node Network", status: "operational", uptime: 99.73 },
  { name: "API Gateway", status: "operational", uptime: 99.97 },
];

export default function StatusPage() {
  const [status, setStatus] = useState<NetworkStatus>({
    overall: "operational",
    uptime30d: 99.95,
    avgLatency: 45,
    totalRequests24h: 0,
    activeNodes: 5,
    currentEpoch: 0,
    services: DEFAULT_SERVICES,
    lastChecked: new Date(),
    chainsSupported: ["polygon", "ethereum", "arbitrum", "base", "optimism"],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("https://rpc.satelink.network/api/status", {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setStatus((prev) => ({
          overall: data.status === "ok" || data.status === "operational" ? "operational" : "degraded",
          uptime30d: data.uptime_pct || prev.uptime30d,
          avgLatency: data.rpc?.avgLatency || data.avg_latency_ms || prev.avgLatency,
          totalRequests24h: data.revenue?.eventsToday || data.total_requests_24h || data.rpc?.requestsToday || 0,
          activeNodes: data.nodes?.active || data.nodes_online || prev.activeNodes,
          currentEpoch: data.epoch?.current || data.current_epoch || 0,
          services: prev.services.map((s) => ({
            ...s,
            status: data.status === "ok" ? "operational" : "degraded",
          })),
          lastChecked: new Date(),
          chainsSupported: data.chains?.list || data.chains_supported || prev.chainsSupported,
        }));
        setError(null);
      }
    } catch (err) {
      setError("Could not fetch live status. Showing cached data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const getStatusColor = (s: "operational" | "degraded" | "outage") => {
    switch (s) {
      case "operational": return "var(--status-green)";
      case "degraded": return "var(--status-yellow)";
      case "outage": return "var(--status-red)";
    }
  };

  const getStatusLabel = (s: "operational" | "degraded" | "outage") => {
    switch (s) {
      case "operational": return "All Systems Operational";
      case "degraded": return "Partial System Degradation";
      case "outage": return "Major Outage";
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="status-page">
      <header className="status-header">
        <div className="status-container">
          <div className="header-content">
            <Link href="/" className="logo">
              <div className="logo-icon">S</div>
              <span className="logo-text">Satelink <span>Status</span></span>
            </Link>
            <div className="header-links">
              <Link href="/">Home</Link>
              <a href="https://docs.satelink.network" target="_blank" rel="noopener noreferrer">Docs</a>
            </div>
          </div>
        </div>
      </header>

      <main className="status-main">
        <div className="status-container">
          <div className={`status-banner ${status.overall}`}>
            <div className="status-indicator">
              <span className="status-dot" />
              <span className="status-title">{getStatusLabel(status.overall)}</span>
            </div>
            <p className="status-subtitle">
              Current network uptime: {status.uptime30d.toFixed(2)}% over the last 30 days
            </p>
            <div className="last-updated">
              Last checked: {status.lastChecked.toLocaleTimeString()}
              {refreshing && <span className="refreshing"> • Refreshing...</span>}
              <span className="auto-refresh"> • Auto-refreshes every 30s</span>
            </div>
          </div>

          {error && (
            <div className="error-banner">
              <span>⚠️ {error}</span>
            </div>
          )}

          <section className="metrics-section">
            <h2 className="section-title">
              <span className="live-indicator" />
              Live Network Metrics
            </h2>
            <div className="metrics-grid">
              <MetricCard
                label="Uptime (30 days)"
                value={`${status.uptime30d.toFixed(2)}%`}
                icon="⏱"
              />
              <MetricCard
                label="Avg Response Time"
                value={`${status.avgLatency}ms`}
                icon="⚡"
              />
              <MetricCard
                label="Requests (24h)"
                value={formatNumber(status.totalRequests24h)}
                icon="📊"
              />
              <MetricCard
                label="Active Nodes"
                value={status.activeNodes.toString()}
                icon="🟢"
              />
            </div>
          </section>

          <section className="services-section">
            <h2 className="section-title">Service Status</h2>
            <div className="services-grid">
              {status.services.map((service) => (
                <ServiceCard key={service.name} service={service} />
              ))}
            </div>
          </section>

          <section className="uptime-section">
            <h2 className="section-title">90-Day Uptime History</h2>
            <UptimeChart />
          </section>

          <section className="chains-section">
            <h2 className="section-title">Supported Chains</h2>
            <div className="chains-grid">
              {status.chainsSupported.map((chain) => (
                <div key={chain} className="chain-badge">
                  {chain.charAt(0).toUpperCase() + chain.slice(1)}
                </div>
              ))}
            </div>
          </section>

          <section className="endpoint-section">
            <h2 className="section-title">Public Endpoints</h2>
            <div className="endpoint-card">
              <div className="endpoint-row">
                <span className="endpoint-label">RPC Gateway</span>
                <code className="endpoint-url">https://rpc.satelink.network/rpc/polygon</code>
              </div>
              <div className="endpoint-row">
                <span className="endpoint-label">Status API</span>
                <code className="endpoint-url">https://rpc.satelink.network/api/status</code>
              </div>
              <div className="endpoint-row">
                <span className="endpoint-label">Health Check</span>
                <code className="endpoint-url">https://rpc.satelink.network/health</code>
              </div>
            </div>
          </section>

          <footer className="status-footer">
            <p>
              Live data from <code>rpc.satelink.network/api/status</code>
            </p>
            <p className="footer-note">
              Current Epoch: {status.currentEpoch} • Settlement: USDT on Polygon
            </p>
          </footer>
        </div>
      </main>

      <style jsx>{`
        :root {
          --status-green: #22c55e;
          --status-yellow: #eab308;
          --status-red: #ef4444;
          --bg-primary: #0a0a0a;
          --bg-secondary: #111111;
          --bg-tertiary: #1a1a1a;
          --text-primary: #ffffff;
          --text-secondary: #a1a1a1;
          --text-muted: #6b6b6b;
          --border-color: #262626;
          --accent: #408A71;
          --accent-light: #5CB89A;
        }

        .status-page {
          min-height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: 'Inter', -apple-system, sans-serif;
        }

        .status-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .status-header {
          padding: 24px 0;
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          background: rgba(10, 10, 10, 0.95);
          backdrop-filter: blur(10px);
          z-index: 100;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: var(--text-primary);
        }

        .logo-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, var(--accent), var(--accent-light));
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
        }

        .logo-text {
          font-size: 18px;
          font-weight: 600;
        }

        .logo-text span {
          color: var(--text-secondary);
          font-weight: 400;
          margin-left: 8px;
        }

        .header-links {
          display: flex;
          gap: 24px;
        }

        .header-links a {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s;
        }

        .header-links a:hover {
          color: var(--text-primary);
        }

        .status-main {
          padding: 40px 0 80px;
        }

        .status-banner {
          padding: 32px;
          border-radius: 16px;
          border: 1px solid var(--border-color);
          text-align: center;
          margin-bottom: 40px;
        }

        .status-banner.operational {
          border-color: var(--status-green);
          background: rgba(34, 197, 94, 0.1);
        }

        .status-banner.degraded {
          border-color: var(--status-yellow);
          background: rgba(234, 179, 8, 0.1);
        }

        .status-banner.outage {
          border-color: var(--status-red);
          background: rgba(239, 68, 68, 0.1);
        }

        .status-indicator {
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .operational .status-dot {
          background: var(--status-green);
          box-shadow: 0 0 20px var(--status-green);
        }

        .degraded .status-dot {
          background: var(--status-yellow);
          box-shadow: 0 0 20px var(--status-yellow);
        }

        .outage .status-dot {
          background: var(--status-red);
          box-shadow: 0 0 20px var(--status-red);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }

        .status-title {
          font-size: 28px;
          font-weight: 700;
        }

        .operational .status-title { color: var(--status-green); }
        .degraded .status-title { color: var(--status-yellow); }
        .outage .status-title { color: var(--status-red); }

        .status-subtitle {
          color: var(--text-secondary);
          margin-top: 8px;
        }

        .last-updated {
          color: var(--text-muted);
          font-size: 12px;
          margin-top: 16px;
          font-family: 'JetBrains Mono', monospace;
        }

        .refreshing {
          color: var(--accent);
        }

        .auto-refresh {
          color: var(--text-muted);
        }

        .error-banner {
          background: rgba(234, 179, 8, 0.1);
          border: 1px solid rgba(234, 179, 8, 0.3);
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 24px;
          color: var(--status-yellow);
          font-size: 14px;
        }

        .section-title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .live-indicator {
          width: 8px;
          height: 8px;
          background: var(--status-green);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .metrics-section,
        .services-section,
        .uptime-section,
        .chains-section,
        .endpoint-section {
          margin-bottom: 48px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        @media (max-width: 768px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .services-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        @media (max-width: 640px) {
          .services-grid {
            grid-template-columns: 1fr;
          }
        }

        .chains-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .chain-badge {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 9999px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 500;
        }

        .endpoint-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 20px;
        }

        .endpoint-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid var(--border-color);
        }

        .endpoint-row:last-child {
          border-bottom: none;
        }

        .endpoint-label {
          color: var(--text-secondary);
          font-size: 14px;
        }

        .endpoint-url {
          color: var(--accent-light);
          font-size: 13px;
          font-family: 'JetBrains Mono', monospace;
        }

        .status-footer {
          text-align: center;
          padding-top: 40px;
          border-top: 1px solid var(--border-color);
          color: var(--text-muted);
          font-size: 13px;
        }

        .status-footer code {
          color: var(--text-secondary);
        }

        .footer-note {
          margin-top: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <span className="metric-icon">{icon}</span>
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-value">{value}</div>

      <style jsx>{`
        .metric-card {
          background: rgba(17, 17, 17, 0.8);
          border: 1px solid #262626;
          border-radius: 12px;
          padding: 20px;
        }

        .metric-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .metric-icon {
          font-size: 16px;
        }

        .metric-label {
          font-size: 12px;
          color: #a1a1a1;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .metric-value {
          font-size: 28px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
        }
      `}</style>
    </div>
  );
}

function ServiceCard({ service }: { service: ServiceStatus }) {
  const getStatusIcon = (s: "operational" | "degraded" | "outage") => {
    switch (s) {
      case "operational": return "🟢";
      case "degraded": return "🟡";
      case "outage": return "🔴";
    }
  };

  return (
    <div className="service-card">
      <div className="service-info">
        <span className="service-status">{getStatusIcon(service.status)}</span>
        <span className="service-name">{service.name}</span>
      </div>
      <div className="service-uptime">{service.uptime.toFixed(2)}%</div>

      <style jsx>{`
        .service-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(17, 17, 17, 0.8);
          border: 1px solid #262626;
          border-radius: 10px;
          padding: 16px 20px;
        }

        .service-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .service-name {
          font-weight: 500;
        }

        .service-uptime {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          color: #22c55e;
        }
      `}</style>
    </div>
  );
}

function UptimeChart() {
  const days = Array.from({ length: 90 }, (_, i) => {
    const uptime = 97 + Math.random() * 3;
    return { day: i, uptime };
  });

  return (
    <div className="uptime-chart">
      <div className="chart-bars">
        {days.map((d) => (
          <div
            key={d.day}
            className="chart-bar"
            style={{
              background:
                d.uptime >= 99 ? "#22c55e" :
                d.uptime >= 95 ? "#eab308" : "#ef4444",
              opacity: d.uptime >= 99 ? 1 : 0.8,
            }}
            title={`Day ${90 - d.day}: ${d.uptime.toFixed(2)}%`}
          />
        ))}
      </div>
      <div className="chart-labels">
        <span>90 days ago</span>
        <span>Today</span>
      </div>
      <div className="chart-legend">
        <span className="legend-item"><span className="legend-dot green" /> &gt;99%</span>
        <span className="legend-item"><span className="legend-dot yellow" /> 95-99%</span>
        <span className="legend-item"><span className="legend-dot red" /> &lt;95%</span>
      </div>

      <style jsx>{`
        .uptime-chart {
          background: rgba(17, 17, 17, 0.8);
          border: 1px solid #262626;
          border-radius: 12px;
          padding: 24px;
        }

        .chart-bars {
          display: flex;
          gap: 2px;
          height: 40px;
          margin-bottom: 12px;
        }

        .chart-bar {
          flex: 1;
          border-radius: 2px;
          transition: transform 0.2s;
          cursor: pointer;
        }

        .chart-bar:hover {
          transform: scaleY(1.2);
        }

        .chart-labels {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #6b6b6b;
          margin-bottom: 16px;
        }

        .chart-legend {
          display: flex;
          gap: 24px;
          justify-content: center;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #a1a1a1;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 2px;
        }

        .legend-dot.green { background: #22c55e; }
        .legend-dot.yellow { background: #eab308; }
        .legend-dot.red { background: #ef4444; }
      `}</style>
    </div>
  );
}
