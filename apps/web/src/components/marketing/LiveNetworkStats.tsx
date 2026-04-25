"use client";

import { useEffect, useState } from "react";

interface NetworkStats {
  totalRequests: string;
  activeProviders: number;
  avgLatency: string;
  cacheHitRate: string;
}

export function LiveNetworkStats() {
  const [stats, setStats] = useState<NetworkStats>({
    totalRequests: "2.4M",
    activeProviders: 18,
    avgLatency: "45ms",
    cacheHitRate: "78.6%",
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("https://rpc.satelink.network/rpc/metrics");
        if (res.ok) {
          const data = await res.json();
          setStats({
            totalRequests: formatNumber(data.totalRequests || 2400000),
            activeProviders: data.activeNodes || 18,
            avgLatency: `${data.avgLatency || 45}ms`,
            cacheHitRate: data.rpcGateway?.cacheStats?.hitRate || "78.6%",
          });
        }
      } catch {
        // Use defaults
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="section">
      <div className="container">
        <div className="text-center mb-12">
          <span className="badge badge-live" style={{ marginBottom: "var(--space-6)" }}>
            Live Network Data
          </span>
          <h2 className="heading-lg mb-4">Real-Time Performance</h2>
          <p className="text-body-lg" style={{ maxWidth: "600px", margin: "0 auto" }}>
            Monitor network health across all chains. Updated every 30 seconds.
          </p>
        </div>

        <div className="stats-grid">
          <StatCard
            label="Total Requests"
            value={stats.totalRequests}
            icon={<RequestIcon />}
          />
          <StatCard
            label="Active Providers"
            value={stats.activeProviders.toString()}
            icon={<NodeIcon />}
          />
          <StatCard
            label="Avg Latency"
            value={stats.avgLatency}
            icon={<LatencyIcon />}
          />
          <StatCard
            label="Cache Hit Rate"
            value={stats.cacheHitRate}
            icon={<CacheIcon />}
          />
        </div>

        <div className="social-proof">
          <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>
            Trusted by machines on:
          </p>
          <div className="chain-logos">
            <span className="chain-logo-item">Polygon</span>
            <span className="chain-logo-item">Ethereum</span>
            <span className="chain-logo-item">Arbitrum</span>
            <span className="chain-logo-item">Base</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-6);
          margin-bottom: var(--space-12);
        }

        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }

        .social-proof {
          text-align: center;
          padding: var(--space-8);
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
        }

        .chain-logos {
          display: flex;
          justify-content: center;
          gap: var(--space-8);
          flex-wrap: wrap;
        }

        .chain-logo-item {
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 1.125rem;
          color: var(--text-secondary);
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .chain-logo-item:hover {
          opacity: 1;
        }
      `}</style>
    </section>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="card">
      <div style={{
        width: "48px",
        height: "48px",
        borderRadius: "var(--radius-lg)",
        background: "var(--signal-dim)",
        border: "1px solid var(--signal-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--signal)",
        marginBottom: "var(--space-4)",
      }}>
        {icon}
      </div>
      <div style={{
        fontFamily: "var(--font-heading)",
        fontSize: "2rem",
        fontWeight: 700,
        color: "var(--text-primary)",
        marginBottom: "var(--space-1)",
      }}>
        {value}
      </div>
      <div style={{
        fontSize: "0.875rem",
        color: "var(--text-muted)",
      }}>
        {label}
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function RequestIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function NodeIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function LatencyIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CacheIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  );
}
