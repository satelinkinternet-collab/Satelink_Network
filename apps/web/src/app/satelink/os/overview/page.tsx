"use client";

import { useEffect, useMemo, useState } from "react";
import { ActivityStream } from "@/components/satelink/activity-stream";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

interface NetworkStatus {
  status: string;
  uptime_pct: number;
  nodes_online: number;
  current_epoch: number;
  total_requests_24h: number;
  avg_latency_ms: number;
  chains_supported: string[];
  settlement: string;
}

interface NodeData {
  node_id: string;
  region: string;
  status: string;
  uptime_pct: number;
  requests_24h: number;
  earned_usdt: number;
}

export default function SatelinkOverviewPage() {
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [epochCountdown, setEpochCountdown] = useState(60);
  const [liveNodes, setLiveNodes] = useState<NodeData[]>([]);

  const nodes = useInfrastructureStore((s) => s.nodes);
  const healthyCount = useMemo(() => nodes.filter((n) => n.health === "healthy").length, [nodes]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("https://rpc.satelink.network/api/status");
        const data = await res.json();
        setStatus(data);
      } catch {
        setStatus({
          status: "operational",
          uptime_pct: 99.5,
          nodes_online: 1,
          current_epoch: 0,
          total_requests_24h: 0,
          avg_latency_ms: 85,
          chains_supported: ["polygon", "ethereum", "arbitrum", "base"],
          settlement: "USDT on Polygon PoS",
        });
      }
    };

    const fetchNodes = async () => {
      try {
        const res = await fetch("https://rpc.satelink.network/api/nodes");
        const data = await res.json();
        if (Array.isArray(data)) setLiveNodes(data);
      } catch {
        setLiveNodes([]);
      }
    };

    fetchStatus();
    fetchNodes();
    const interval = setInterval(() => { fetchStatus(); fetchNodes(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setEpochCountdown((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Infrastructure Overview</h1>
          <p className="page-sub">rpc.satelink.network · Auto-refreshes every 30s</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${status?.status === "operational" ? "bg-[#408a71] dot-pulse" : "bg-amber-400"}`} />
            <span className="text-[11px] text-[#408a71]">{status?.status || "loading"}</span>
          </div>
        </div>
      </div>

      {/* Metrics Row - 4 cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="card metric-card">
          <div className="metric-label">Nodes Online</div>
          <div className="metric-value text-[#00d1ff]">{status?.nodes_online || healthyCount}</div>
          <div className="metric-sub">Active infrastructure</div>
        </article>
        <article className="card metric-card" style={{ borderColor: '#285a48', boxShadow: '0 0 12px rgba(0,209,255,0.15)' }}>
          <div className="metric-label">Current Epoch</div>
          <div className="metric-value">{status?.current_epoch || 0}</div>
          <div className="metric-sub flex items-center gap-2">
            <span>Next close in</span>
            <span className="font-mono text-[#00d1ff]">{epochCountdown}s</span>
          </div>
        </article>
        <article className="card metric-card">
          <div className="metric-label">Requests 24h</div>
          <div className="metric-value">{(status?.total_requests_24h || 0).toLocaleString()}</div>
          <div className="metric-sub">RPC calls processed</div>
        </article>
        <article className="card metric-card">
          <div className="metric-label">Settlement Chain</div>
          <div className="metric-value text-[15px]">USDT · Polygon</div>
          <div className="metric-sub">Chain ID 137</div>
        </article>
      </div>

      {/* Node Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a2e25]">
          <div className="section-label">Node Network</div>
        </div>
        <table className="infra-table">
          <thead>
            <tr>
              <th>Node ID</th>
              <th>Region</th>
              <th>Status</th>
              <th>Uptime</th>
              <th>Requests</th>
              <th>Earned USDT</th>
            </tr>
          </thead>
          <tbody>
            {liveNodes.length > 0 ? (
              liveNodes.map((node) => (
                <tr key={node.node_id}>
                  <td className="font-mono text-[#b0e4cc]">{node.node_id}</td>
                  <td className="text-[#408a71]">{node.region}</td>
                  <td>
                    <span className={`status-badge ${node.status === "online" ? "badge-live" : "badge-pending"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${node.status === "online" ? "bg-[#408a71]" : "bg-amber-400"}`} />
                      {node.status}
                    </span>
                  </td>
                  <td className="font-mono text-[#b0e4cc]">{node.uptime_pct}%</td>
                  <td className="font-mono text-[#408a71]">{node.requests_24h?.toLocaleString() || 0}</td>
                  <td className="font-mono text-[#00d1ff]">${node.earned_usdt?.toFixed(4) || "0.0000"}</td>
                </tr>
              ))
            ) : nodes.length > 0 ? (
              nodes.map((node) => (
                <tr key={node.id}>
                  <td className="font-mono text-[#b0e4cc]">{node.id}</td>
                  <td className="text-[#408a71]">{node.region}</td>
                  <td>
                    <span className={`status-badge ${node.health === "healthy" ? "badge-live" : node.health === "degraded" ? "badge-pending" : "badge-error"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${node.health === "healthy" ? "bg-[#408a71]" : node.health === "degraded" ? "bg-amber-400" : "bg-red-400"}`} />
                      {node.health}
                    </span>
                  </td>
                  <td className="font-mono text-[#b0e4cc]">99.9%</td>
                  <td className="font-mono text-[#408a71]">—</td>
                  <td className="font-mono text-[#00d1ff]">—</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[#285a48]">No nodes connected</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Terminal Block - curl examples */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a2e25] flex items-center justify-between">
          <div className="section-label">Quick Start</div>
          <span className="text-[9px] text-[#285a48]">Free tier · 1000 req/day · No API key required</span>
        </div>
        <div className="terminal-block rounded-none border-0">
          <div className="space-y-3">
            <div>
              <span className="t-dim"># Health check</span>
              <div><span className="t-prompt">$ </span><span className="t-cmd">curl</span> <span className="t-out">https://rpc.satelink.network/health</span></div>
              <div className="t-ok">{`{"status":"ok"}`}</div>
            </div>
            <div>
              <span className="t-dim"># Get latest block (Polygon)</span>
              <div><span className="t-prompt">$ </span><span className="t-cmd">curl</span> <span className="t-out">-X POST https://rpc.satelink.network/rpc/polygon \</span></div>
              <div className="ml-4 t-out">{`-d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`}</div>
              <div className="t-ok">{`{"jsonrpc":"2.0","id":1,"result":"0x..."}`}</div>
            </div>
            <div>
              <span className="t-dim"># Network status</span>
              <div><span className="t-prompt">$ </span><span className="t-cmd">curl</span> <span className="t-out">https://rpc.satelink.network/api/status</span></div>
              <div className="t-ok">{`{"status":"operational","nodes_online":${status?.nodes_online || 1},"current_epoch":${status?.current_epoch || 0}}`}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Stream */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a2e25]">
          <div className="section-label">Live Activity</div>
        </div>
        <div className="p-4">
          <ActivityStream />
        </div>
      </div>

      {/* Settlement Info */}
      <div className="card p-4">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#285a48]">ClaimsContract</span>
          <a
            href="https://polygonscan.com/address/0xE475c53B88190FD2130dB1E37504991EFe283fb0"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[#00d1ff] hover:underline"
          >
            0xE475c53B88190FD2130dB1E37504991EFe283fb0
          </a>
        </div>
      </div>
    </div>
  );
}
