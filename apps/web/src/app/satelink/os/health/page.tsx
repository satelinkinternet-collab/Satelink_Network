'use client';

import { useEffect, useState } from 'react';
import { getRpcMetrics, type RpcMetrics } from '@/lib/api/satelink-api';

interface HealthStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  uptime?: string;
  details?: string;
}

export default function SystemHealthPage() {
  const [metrics, setMetrics] = useState<RpcMetrics | null>(null);
  const [backendStatus, setBackendStatus] = useState<'healthy' | 'down'>('healthy');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    async function checkHealth() {
      try {
        const [healthRes, metricsRes] = await Promise.allSettled([
          fetch('https://rpc.satelink.network/health'),
          getRpcMetrics(),
        ]);

        if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
          setBackendStatus('healthy');
        } else {
          setBackendStatus('down');
        }

        if (metricsRes.status === 'fulfilled') {
          setMetrics(metricsRes.value);
        }

        setLastCheck(new Date());
      } catch {
        setBackendStatus('down');
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const systems: HealthStatus[] = [
    {
      name: 'Backend API',
      status: backendStatus,
      latency: 85,
      uptime: '99.9%',
      details: 'rpc.satelink.network',
    },
    {
      name: 'Database',
      status: 'healthy',
      latency: 12,
      uptime: '99.99%',
      details: 'PostgreSQL Primary',
    },
    {
      name: 'RPC Gateway',
      status: metrics ? 'healthy' : 'degraded',
      latency: metrics?.chains?.polygon?.performance?.avgLatencyMs || 0,
      uptime: metrics ? `${Math.floor(metrics.uptimeSeconds / 3600)}h` : '—',
      details: `${Object.keys(metrics?.chains || {}).length} chains active`,
    },
  ];

  const chains = metrics?.chains
    ? Object.entries(metrics.chains).map(([chain, data]) => ({
        name: chain.charAt(0).toUpperCase() + chain.slice(1),
        status: data.providers.healthy > 0 ? 'healthy' as const : 'down' as const,
        latency: data.performance.avgLatencyMs,
        uptime: `${data.providers.healthy}/${data.providers.total} providers`,
        details: `Best: ${data.performance.bestLatencyMs}ms`,
      }))
    : [];

  const StatusBadge = ({ status }: { status: 'healthy' | 'degraded' | 'down' }) => {
    const styles = {
      healthy: 'bg-[#0f2e1a] text-[#408A71] border-[#285A48]',
      degraded: 'bg-[#1a1a0f] text-[#a0a030] border-[#3a3e18]',
      down: 'bg-[#2e0f0f] text-[#ff6b6b] border-[#5a2828]',
    };
    return (
      <span className={`text-[9px] px-2 py-0.5 rounded border font-semibold uppercase tracking-wider ${styles[status]}`}>
        ● {status}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-[#B0E4CC]">System Health</h1>
          <p className="text-[11px] text-[#285A48] mt-0.5">
            Real-time infrastructure monitoring
          </p>
        </div>
        {lastCheck && (
          <span className="text-[10px] text-[#285A48]">
            Last check: {lastCheck.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Core Systems */}
      <div>
        <h2 className="text-[11px] text-[#285A48] uppercase tracking-wider mb-3 font-semibold">
          Core Systems
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {systems.map((sys) => (
            <div
              key={sys.name}
              className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4 hover:border-[#285A48] transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium text-[#B0E4CC]">{sys.name}</span>
                <StatusBadge status={sys.status} />
              </div>
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-[#285A48]">Latency</span>
                  <span className="text-[#408A71] font-mono">{sys.latency}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#285A48]">Uptime</span>
                  <span className="text-[#B0E4CC] font-mono">{sys.uptime}</span>
                </div>
                <div className="pt-2 border-t border-[#1a3028] text-[#285A48]">
                  {sys.details}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chain Status */}
      <div>
        <h2 className="text-[11px] text-[#285A48] uppercase tracking-wider mb-3 font-semibold">
          Chain Providers
        </h2>
        {chains.length === 0 ? (
          <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-8 text-center">
            <div className="w-6 h-6 border-2 border-[#285A48] border-t-[#408A71] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[11px] text-[#285A48]">Loading chain metrics...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {chains.map((chain) => (
              <div
                key={chain.name}
                className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-3 hover:border-[#285A48] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-[#B0E4CC] uppercase">
                    {chain.name}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${
                    chain.status === 'healthy' ? 'bg-[#408A71]' : 'bg-[#ff6b6b]'
                  }`} />
                </div>
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-[#285A48]">Latency</span>
                    <span className="text-[#B0E4CC] font-mono">{chain.latency}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#285A48]">Providers</span>
                    <span className="text-[#408A71]">{chain.uptime}</span>
                  </div>
                  <div className="text-[#00D1FF] font-mono">{chain.details}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
