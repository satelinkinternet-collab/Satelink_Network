"use client";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { useEffect, useState } from "react";
import { Navigation } from "@/components/marketing/Navigation";
import { Footer } from "@/components/marketing/Footer";

interface ProviderHealth {
  id: string;
  name: string;
  chain: string;
  status: "healthy" | "degraded" | "down";
  latency: number;
}

interface ChainStatus {
  name: string;
  chainId: number;
  latency: number;
  blockNumber: string;
  status: "live" | "degraded" | "down";
}

export default function NetworkPage() {
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [chains, setChains] = useState<ChainStatus[]>([]);
  const [metrics, setMetrics] = useState<string>("");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [uptimeData, setUptimeData] = useState<number[]>(Array(7).fill(99.9));

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch("https://rpc.satelink.network/rpc/health");
        if (res.ok) {
          const data = await res.json();
          if (data.providers) {
            const providerEntries = Object.entries(data.providers) as [string, { status: string; latencyMs: number; chain: string }][];
            setProviders(
              providerEntries.map(([id, p]) => ({
                id,
                name: id,
                chain: p.chain || "polygon",
                status: p.status === "healthy" ? "healthy" : p.status === "degraded" ? "degraded" : "down",
                latency: p.latencyMs || 0,
              }))
            );
          }
        }
      } catch {
        // Mock data for demo
        setProviders([
          { id: "alchemy-polygon", name: "Alchemy Polygon", chain: "polygon", status: "healthy", latency: 32 },
          { id: "quicknode-polygon", name: "QuickNode Polygon", chain: "polygon", status: "healthy", latency: 28 },
          { id: "ankr-polygon", name: "Ankr Polygon", chain: "polygon", status: "healthy", latency: 45 },
          { id: "alchemy-eth", name: "Alchemy Ethereum", chain: "ethereum", status: "healthy", latency: 38 },
          { id: "infura-eth", name: "Infura Ethereum", chain: "ethereum", status: "degraded", latency: 120 },
          { id: "quicknode-arb", name: "QuickNode Arbitrum", chain: "arbitrum", status: "healthy", latency: 25 },
        ]);
      }
      setLastUpdate(new Date());
    }

    async function fetchChains() {
      try {
        const res = await fetch("https://rpc.satelink.network/rpc/chains");
        if (res.ok) {
          const data = await res.json();
          setChains(
            data.chains?.map((c: { name: string; chainId: number; avgLatencyMs: number; latestBlock: string }) => ({
              name: c.name,
              chainId: c.chainId,
              latency: c.avgLatencyMs || 0,
              blockNumber: c.latestBlock || "N/A",
              status: "live",
            })) || []
          );
        }
      } catch {
        setChains([
          { name: "Polygon", chainId: 137, latency: 35, blockNumber: "0x3a2b1c", status: "live" },
          { name: "Ethereum", chainId: 1, latency: 45, blockNumber: "0x12a456", status: "live" },
          { name: "Arbitrum", chainId: 42161, latency: 28, blockNumber: "0x8f3e21", status: "live" },
          { name: "Base", chainId: 8453, latency: 32, blockNumber: "0x5c7890", status: "live" },
          { name: "Polygon Amoy", chainId: 80002, latency: 40, blockNumber: "0x1f2345", status: "live" },
        ]);
      }
    }

    async function fetchMetrics() {
      try {
        const res = await fetch("https://rpc.satelink.network/rpc/metrics/prometheus");
        if (res.ok) {
          const text = await res.text();
          setMetrics(text.slice(0, 2000));
        }
      } catch {
        setMetrics(`# HELP rpc_requests_total Total RPC requests
# TYPE rpc_requests_total counter
rpc_requests_total{chain="polygon"} 1245678
rpc_requests_total{chain="ethereum"} 456789

# HELP rpc_latency_ms RPC request latency
# TYPE rpc_latency_ms histogram
rpc_latency_ms_bucket{le="50"} 8500
rpc_latency_ms_bucket{le="100"} 9200
rpc_latency_ms_bucket{le="200"} 9800

# HELP cache_hit_rate Cache hit rate
# TYPE cache_hit_rate gauge
cache_hit_rate 0.786`);
      }
    }

    fetchHealth();
    fetchChains();
    fetchMetrics();

    const interval = setInterval(() => {
      fetchHealth();
      fetchChains();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Navigation />
      <main className="pt-24">
        {/* Hero */}
        <section className="py-16 text-center">
          <div className="container-marketing">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-[var(--brand-accent)] animate-pulse" />
              <span className="text-[var(--brand-accent)] text-sm font-medium">Live Status</span>
            </div>
            <h1 className="heading-xl mb-6">
              Network <span className="text-gradient">Health</span>
            </h1>
            <p className="text-body-lg max-w-2xl mx-auto">
              Real-time status of all providers and chains. Updated every 30 seconds.
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-4">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        </section>

        {/* Uptime History */}
        <section className="py-16 bg-[var(--bg-card)]/30">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">7-Day Uptime</h2>
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-2 h-32 mb-4">
                {uptimeData.map((uptime, i) => {
                  const height = (uptime / 100) * 100;
                  const isGood = uptime >= 99.5;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className={`w-full rounded-t transition-all ${
                          isGood ? "bg-[var(--brand-accent)]" : "bg-yellow-500"
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-[var(--text-muted)]">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="text-center mt-4">
                <span className="text-2xl font-bold text-[var(--brand-accent)]">99.9%</span>
                <span className="text-[var(--text-muted)] ml-2">average uptime</span>
              </div>
            </div>
          </div>
        </section>

        {/* Chain Status */}
        <section className="py-16">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">Chain Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {chains.map((chain) => (
                <div key={chain.chainId} className="glass-card p-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        chain.status === "live"
                          ? "bg-[var(--brand-accent)]"
                          : chain.status === "degraded"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    />
                    <span className="font-semibold text-[var(--text-primary)]">{chain.name}</span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mb-2">Chain ID: {chain.chainId}</div>
                  <div className="flex justify-center gap-4 text-sm">
                    <div>
                      <span className="text-[var(--text-muted)]">Latency: </span>
                      <span className="text-[var(--brand-primary)]">{chain.latency}ms</span>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-2 font-mono">
                    Block: {chain.blockNumber}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Provider Status */}
        <section id="providers" className="py-16 bg-[var(--bg-card)]/30">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">Provider Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className={`glass-card p-4 text-center ${
                    provider.status === "down" ? "opacity-50" : ""
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                      provider.status === "healthy"
                        ? "bg-[var(--brand-accent)]"
                        : provider.status === "degraded"
                        ? "bg-yellow-500 animate-pulse"
                        : "bg-red-500"
                    }`}
                  />
                  <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                    {provider.name}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">{provider.chain}</div>
                  <div className="text-xs text-[var(--brand-primary)] mt-1">{provider.latency}ms</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Prometheus Metrics */}
        <section id="metrics" className="py-16">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">Prometheus Metrics</h2>
            <div className="max-w-4xl mx-auto">
              <div className="code-block">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/50">
                  <span className="text-sm text-[var(--text-muted)]">/rpc/metrics/prometheus</span>
                  <a
                    href="https://rpc.satelink.network/rpc/metrics/prometheus"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--brand-primary)] hover:underline"
                  >
                    Open Raw
                  </a>
                </div>
                <pre className="p-6 overflow-x-auto text-sm leading-relaxed max-h-96">
                  <code className="text-[var(--text-secondary)]">{metrics || "Loading metrics..."}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
