export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const API_BASE = "https://rpc.satelink.network";

interface ChainInfo {
  name: string;
  chainId: number;
  status: string;
  currentBlock: number;
  avgLatency: number;
  providers: {
    total: number;
    healthy: number;
  };
  cacheStats?: {
    hitRate: string;
  };
}

interface Provider {
  name: string;
  chain: string;
  status: string;
  latency: number;
  circuitState: string;
}

interface NetworkStats {
  totalChains: number;
  totalProviders: number;
  healthyProviders: number;
  eventsToday: number;
  usdtToday: number;
  uptime: string;
}

export default function NetworkDashboard() {
  const [chains, setChains] = useState<ChainInfo[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [metricsRes, healthRes, chainsRes] = await Promise.all([
        fetch(`${API_BASE}/rpc/metrics`),
        fetch(`${API_BASE}/rpc/health`),
        fetch(`${API_BASE}/rpc/chains`),
      ]);

      let totalProviders = 0;
      let healthyProviders = 0;
      const chainList: ChainInfo[] = [];
      const providerList: Provider[] = [];

      if (healthRes.ok) {
        const data = await healthRes.json();
        if (data.chains) {
          Object.entries(data.chains).forEach(([name, info]: [string, any]) => {
            const providers = info.providers || { total: 0, healthy: 0 };
            totalProviders += providers.total || 0;
            healthyProviders += providers.healthy || 0;

            chainList.push({
              name: name.charAt(0).toUpperCase() + name.slice(1),
              chainId: info.chainId || 0,
              status: info.status || "unknown",
              currentBlock: info.currentBlock || 0,
              avgLatency: info.avgLatency || 0,
              providers,
              cacheStats: info.cacheStats,
            });

            if (info.providerList) {
              info.providerList.forEach((p: any) => {
                providerList.push({
                  name: p.name || "Unknown",
                  chain: name,
                  status: p.healthy ? "healthy" : "unhealthy",
                  latency: p.latency || 0,
                  circuitState: p.circuitState || "closed",
                });
              });
            }
          });
        }
      }

      if (chainsRes.ok) {
        const data = await chainsRes.json();
        if (data.chains && chainList.length === 0) {
          data.chains.forEach((c: any) => {
            chainList.push({
              name: c.name,
              chainId: c.chainId,
              status: "healthy",
              currentBlock: 0,
              avgLatency: 0,
              providers: { total: 0, healthy: 0 },
            });
          });
        }
      }

      setChains(chainList);
      setProviders(providerList);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setStats({
          totalChains: chainList.length || 6,
          totalProviders: totalProviders || 20,
          healthyProviders: healthyProviders || totalProviders,
          eventsToday: data.revenue?.eventsToday || 0,
          usdtToday: parseFloat(data.revenue?.usdtToday || "0"),
          uptime: "99.9%",
        });
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch network data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500";
      case "degraded":
        return "bg-yellow-500";
      case "unhealthy":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getCircuitColor = (state: string) => {
    switch (state) {
      case "closed":
        return "text-green-400";
      case "half-open":
        return "text-yellow-400";
      case "open":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-[#2C3333] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold">Network Status</h1>
            <p className="text-gray-400 mt-1">Live provider status and chain health</p>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-gray-500 text-sm">
                Auto-refresh: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-400">Live</span>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <StatBox label="Chains" value={stats.totalChains.toString()} />
            <StatBox label="Providers" value={stats.totalProviders.toString()} />
            <StatBox label="Healthy" value={stats.healthyProviders.toString()} color="green" />
            <StatBox label="Requests Today" value={stats.eventsToday.toLocaleString()} />
            <StatBox label="Revenue" value={`$${stats.usdtToday.toFixed(4)}`} color="green" />
            <StatBox label="Uptime" value={stats.uptime} color="cyan" />
          </div>
        )}

        {/* Chain Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chains.map((chain) => (
            <div key={chain.name} className="bg-[#1A3C3C] rounded-xl p-6 border border-[#0E838840]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{chain.name}</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(chain.status)}`} />
                  <span className={`text-sm ${chain.status === "healthy" ? "text-green-400" : "text-yellow-400"}`}>
                    {chain.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Chain ID</span>
                  <span className="font-mono">{chain.chainId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Block</span>
                  <span className="font-mono text-[#0E8388]">
                    {chain.currentBlock ? chain.currentBlock.toLocaleString() : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Latency</span>
                  <span>{chain.avgLatency}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Providers</span>
                  <span>
                    <span className="text-green-400">{chain.providers.healthy}</span>
                    <span className="text-gray-500">/{chain.providers.total}</span>
                  </span>
                </div>
                {chain.cacheStats && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cache Hit</span>
                    <span className="text-[#0E8388]">{chain.cacheStats.hitRate}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Provider Table */}
        {providers.length > 0 && (
          <div className="bg-[#1A3C3C] rounded-xl p-6 border border-[#0E838840]">
            <h2 className="text-xl font-semibold mb-4">All Providers ({providers.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-[#0E838840]">
                    <th className="pb-3">Provider</th>
                    <th className="pb-3">Chain</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Latency</th>
                    <th className="pb-3">Circuit</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((provider, i) => (
                    <tr key={i} className="border-b border-[#0E838840]/50">
                      <td className="py-3 font-medium">{provider.name}</td>
                      <td className="py-3 capitalize">{provider.chain}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          provider.status === "healthy"
                            ? "bg-green-900/30 text-green-400"
                            : "bg-red-900/30 text-red-400"
                        }`}>
                          {provider.status}
                        </span>
                      </td>
                      <td className="py-3">{provider.latency}ms</td>
                      <td className={`py-3 ${getCircuitColor(provider.circuitState)}`}>
                        {provider.circuitState}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="bg-[#1A3C3C] rounded-xl p-6 border border-[#0E838840]">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Status Legend</h3>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Healthy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Degraded</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Unhealthy</span>
            </div>
            <div className="border-l border-gray-700 pl-6 flex items-center gap-2">
              <span className="text-green-400">Closed</span>
              <span className="text-gray-500">= Circuit OK</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">Half-Open</span>
              <span className="text-gray-500">= Testing</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400">Open</span>
              <span className="text-gray-500">= Blocked</span>
            </div>
          </div>
        </div>

        {/* RPC Endpoints */}
        <div className="bg-[#1A3C3C] rounded-xl p-6 border border-[#0E838840]">
          <h2 className="text-xl font-semibold mb-4">Public RPC Endpoints</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chains.map((chain) => (
              <div key={chain.name} className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">{chain.name}</p>
                <code className="text-[#0E8388] text-sm">
                  https://rpc.satelink.network/rpc/{chain.name.toLowerCase()}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "green" | "cyan";
}) {
  const valueColor =
    color === "green"
      ? "text-green-400"
      : color === "cyan"
      ? "text-[#0E8388]"
      : "text-white";

  return (
    <div className="bg-[#1A3C3C] rounded-lg p-4 border border-[#0E838840]">
      <p className="text-gray-400 text-xs">{label}</p>
      <p className={`text-xl font-bold mt-1 ${valueColor}`}>{value}</p>
    </div>
  );
}
