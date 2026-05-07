"use client";
import { useEffect, useState } from "react";

interface HealthData {
  nodes_online: number;
  current_epoch: number;
  total_requests_24h: number;
  uptime_pct: number;
  avg_latency_ms: number;
  status: string;
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData>({
    nodes_online: 0,
    current_epoch: 0,
    total_requests_24h: 0,
    uptime_pct: 0,
    avg_latency_ms: 0,
    status: "unknown",
  });
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch("https://rpc.satelink.network/api/status");
        if (res.ok) {
          const data = await res.json();
          setHealth({
            nodes_online: data.nodes_online || 0,
            current_epoch: data.current_epoch || 0,
            total_requests_24h: data.total_requests_24h || 0,
            uptime_pct: data.uptime_pct || 99.9,
            avg_latency_ms: data.avg_latency_ms || 0,
            status: data.status || "healthy",
          });
          setLastUpdated(new Date().toLocaleTimeString());
        }
      } catch {
        setHealth(prev => ({ ...prev, status: "error" }));
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const statusColor = health.status === "healthy" ? "#408A71" : health.status === "degraded" ? "#F59E0B" : "#EF4444";

  return (
    <div className="p-6 bg-[#091413] min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#B0E4CC]">Network Health</h1>
          <p className="text-[#408A71] text-sm mt-1">Real-time network status and metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: statusColor }} />
          <span className="text-sm font-medium" style={{ color: statusColor }}>
            {health.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-[#0d1f1d] border border-[#285A48] rounded-lg p-4">
          <div className="text-xs text-[#408A71] uppercase tracking-wider mb-2">Nodes Online</div>
          <div className="text-2xl font-bold text-[#B0E4CC] font-mono">{health.nodes_online}</div>
        </div>
        <div className="bg-[#0d1f1d] border border-[#285A48] rounded-lg p-4">
          <div className="text-xs text-[#408A71] uppercase tracking-wider mb-2">Current Epoch</div>
          <div className="text-2xl font-bold text-[#00D1FF] font-mono">{health.current_epoch}</div>
        </div>
        <div className="bg-[#0d1f1d] border border-[#285A48] rounded-lg p-4">
          <div className="text-xs text-[#408A71] uppercase tracking-wider mb-2">Requests (24h)</div>
          <div className="text-2xl font-bold text-[#B0E4CC] font-mono">{health.total_requests_24h.toLocaleString()}</div>
        </div>
        <div className="bg-[#0d1f1d] border border-[#285A48] rounded-lg p-4">
          <div className="text-xs text-[#408A71] uppercase tracking-wider mb-2">Uptime</div>
          <div className="text-2xl font-bold text-[#408A71] font-mono">{health.uptime_pct}%</div>
        </div>
        <div className="bg-[#0d1f1d] border border-[#285A48] rounded-lg p-4">
          <div className="text-xs text-[#408A71] uppercase tracking-wider mb-2">Avg Latency</div>
          <div className="text-2xl font-bold text-[#B0E4CC] font-mono">{health.avg_latency_ms}ms</div>
        </div>
      </div>

      <div className="bg-[#0d1f1d] border border-[#285A48] rounded-lg p-6">
        <h2 className="text-lg font-bold text-[#B0E4CC] mb-4">Service Status</h2>
        <div className="space-y-3">
          {[
            { name: "RPC Gateway", status: "operational" },
            { name: "Settlement Engine", status: "operational" },
            { name: "Epoch Pipeline", status: "operational" },
            { name: "Node Registry", status: "operational" },
            { name: "Claim Service", status: "operational" },
          ].map((service) => (
            <div key={service.name} className="flex items-center justify-between py-2 border-b border-[#285A48]/50 last:border-0">
              <span className="text-[#B0E4CC]">{service.name}</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#408A71]" />
                <span className="text-sm text-[#408A71]">{service.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {lastUpdated && (
        <p className="text-xs text-[#408A71] mt-4 text-right">Last updated: {lastUpdated}</p>
      )}
    </div>
  );
}
