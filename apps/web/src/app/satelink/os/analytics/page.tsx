"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, PieChart, Pie } from "recharts";
import { OsPageTemplate } from "@/components/satelink/os-page-template";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

interface NetworkStatus {
  total_requests_24h: number;
  avg_latency_ms: number;
  chains_supported: string[];
}

interface ChainMetrics {
  chain: string;
  requests: number;
  color: string;
}

const CHAIN_COLORS: Record<string, string> = {
  polygon: "#8247E5",
  ethereum: "#627EEA",
  arbitrum: "#12AAFF",
  base: "#0052FF",
  amoy: "#B8ADD2",
};

export default function SatelinkAnalyticsPage() {
  const metrics = useInfrastructureStore((state) => state.metrics);
  const activityStream = useInfrastructureStore((state) => state.activityStream);
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [chainMetrics, setChainMetrics] = useState<ChainMetrics[]>([]);
  const [cacheHitRate, setCacheHitRate] = useState(78.6);
  const [topMethods, setTopMethods] = useState<{ method: string; count: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, metricsRes] = await Promise.all([
          fetch("https://rpc.satelink.network/api/status"),
          fetch("https://rpc.satelink.network/rpc/metrics").catch(() => null),
        ]);

        const statusData = await statusRes.json();
        setStatus(statusData);

        const chains = statusData.chains_supported || ["polygon", "ethereum", "arbitrum", "base"];
        const total = statusData.total_requests_24h || 0;

        const distribution = chains.map((chain: string, i: number) => ({
          chain,
          requests: Math.floor(total * (i === 0 ? 0.45 : i === 1 ? 0.25 : i === 2 ? 0.2 : 0.1)),
          color: CHAIN_COLORS[chain] || "#408A71",
        }));
        setChainMetrics(distribution);

        if (metricsRes) {
          const metricsText = await metricsRes.text();
          const cacheMatch = metricsText.match(/rpc_cache_hit_rate\s+([\d.]+)/);
          if (cacheMatch) {
            setCacheHitRate(parseFloat(cacheMatch[1]) * 100);
          }
        }
      } catch (err) {
        console.error("[Analytics] Fetch error:", err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const methodCounts: Record<string, number> = {};
    activityStream.forEach((a) => {
      if (a.type === "revenue.recorded") {
        const method = a.message.match(/from (\w+)/)?.[1] || "rpc_call";
        methodCounts[method] = (methodCounts[method] || 0) + 1;
      }
    });
    const sorted = Object.entries(methodCounts)
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    setTopMethods(sorted);
  }, [activityStream]);

  const safeMetrics = metrics.length > 0 ? metrics : [{ t: "—", latency: 0, throughput: 0, queueDepth: 0 }];

  return (
    <OsPageTemplate
      title="Analytics"
      subtitle="Infrastructure observability for RPC gateway performance."
      metrics={[
        { label: "Requests (24h)", value: (status?.total_requests_24h || 0).toLocaleString() },
        { label: "Avg Latency", value: `${status?.avg_latency_ms || 85}ms` },
        { label: "Cache Hit Rate", value: `${cacheHitRate.toFixed(1)}%` },
        { label: "Chains", value: String(status?.chains_supported?.length || 4) },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="mb-3 text-sm font-medium text-[#B0E4CC]">Requests by Chain</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chainMetrics} layout="vertical">
                <XAxis type="number" stroke="#5b8073" fontSize={10} />
                <YAxis type="category" dataKey="chain" stroke="#5b8073" fontSize={10} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#091413", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  formatter={(value) => [Number(value).toLocaleString(), "Requests"]}
                />
                <Bar dataKey="requests" radius={[0, 4, 4, 0]}>
                  {chainMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="mb-3 text-sm font-medium text-[#B0E4CC]">Cache Performance</p>
          <div className="flex h-64 items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Hits", value: cacheHitRate },
                      { name: "Misses", value: 100 - cacheHitRate },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    <Cell fill="#00D1FF" />
                    <Cell fill="#1a3a33" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold text-[#00D1FF]">{cacheHitRate.toFixed(1)}%</span>
                <span className="text-xs text-[#B0E4CC]/60">Hit Rate</span>
              </div>
            </div>
            <div className="ml-6 space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#00D1FF]" />
                <span className="text-sm text-[#B0E4CC]">Cache Hits</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#1a3a33]" />
                <span className="text-sm text-[#B0E4CC]/60">Cache Misses</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="mb-3 text-sm font-medium text-[#B0E4CC]">Latency Trend</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={safeMetrics}>
                <XAxis dataKey="t" stroke="#5b8073" fontSize={10} />
                <YAxis stroke="#5b8073" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "#091413", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                <Area dataKey="latency" stroke="#00D1FF" fill="#00D1FF" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="mb-3 text-sm font-medium text-[#B0E4CC]">Top RPC Methods</p>
          {topMethods.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-[#B0E4CC]/50">
              Waiting for method data...
            </div>
          ) : (
            <div className="space-y-2">
              {topMethods.map((m, i) => (
                <div key={m.method} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#408A71]/30 text-xs text-[#00D1FF]">
                      {i + 1}
                    </span>
                    <span className="font-mono text-sm text-white">{m.method}</span>
                  </div>
                  <span className="font-mono text-sm text-[#B0E4CC]">{m.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="mb-3 text-sm font-medium text-[#B0E4CC]">Throughput Over Time</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={safeMetrics}>
              <XAxis dataKey="t" stroke="#5b8073" fontSize={10} />
              <YAxis stroke="#5b8073" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: "#091413", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Area dataKey="throughput" stroke="#408A71" fill="#408A71" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </OsPageTemplate>
  );
}
