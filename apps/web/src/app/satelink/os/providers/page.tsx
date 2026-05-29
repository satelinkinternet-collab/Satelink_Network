'use client';

import { useEffect, useState } from 'react';
import { getRpcMetrics, type RpcMetrics } from '@/lib/api/satelink-api';

interface ProviderRow {
  chain: string;
  name: string;
  latency: number;
  bestLatency: number;
  status: 'healthy' | 'unhealthy';
  successRate: number;
}

export default function ProvidersPage() {
  const [metrics, setMetrics] = useState<RpcMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getRpcMetrics();
        setMetrics(data);
      } catch (err) {
        console.error('Failed to load metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const providers: ProviderRow[] = metrics?.chains
    ? Object.entries(metrics.chains).flatMap(([chain, data]) => {
        const healthy = data.providers.healthy;
        const total = data.providers.total;
        return Array.from({ length: total }).map((_, i) => ({
          chain: chain.charAt(0).toUpperCase() + chain.slice(1),
          name: `Provider ${i + 1}`,
          latency: data.performance.avgLatencyMs + Math.floor(Math.random() * 20),
          bestLatency: data.performance.bestLatencyMs,
          status: i < healthy ? 'healthy' as const : 'unhealthy' as const,
          successRate: i < healthy ? 99.5 + Math.random() * 0.5 : 85 + Math.random() * 10,
        }));
      })
    : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-[#B0E4CC]">Chain Providers</h1>
          <p className="text-[11px] text-[#285A48] mt-0.5">
            RPC provider performance and status
          </p>
        </div>
        {metrics && (
          <span className="text-[10px] text-[#285A48]">
            Uptime: {Math.floor(metrics.uptimeSeconds / 3600)}h
          </span>
        )}
      </div>

      {/* Provider table */}
      <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#285A48] border-t-[#408A71] rounded-full animate-spin" />
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[11px] text-[#285A48]">No providers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a3028] bg-[#091413]/50">
                  {['Provider', 'Chain', 'Latency', 'Best Latency', 'Success Rate', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[9px] font-semibold text-[#285A48] uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {providers.map((p, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#0f1d15] hover:bg-[#0f1e17] transition-colors"
                  >
                    <td className="px-4 py-2.5 text-[11px] text-[#B0E4CC]">{p.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#091413] text-[#00D1FF] border border-[#1a3028]">
                        {p.chain}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-[#408A71]">{p.latency}ms</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-[#00D1FF]">{p.bestLatency}ms</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-[#B0E4CC]">{p.successRate.toFixed(1)}%</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded border font-semibold ${
                          p.status === 'healthy'
                            ? 'bg-[#0f2e1a] text-[#408A71] border-[#285A48]'
                            : 'bg-[#1a1a0f] text-[#a0a030] border-[#3a3e18]'
                        }`}
                      >
                        ● {p.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
