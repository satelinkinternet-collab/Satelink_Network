export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

"use client";

"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  getStatus,
  getEpochs,
  getNodes,
  getRpcMetrics,
  getSSEUrl,
  type NetworkStatus,
  type EpochData,
  type NodeData,
  type RpcMetrics,
} from "@/lib/api/satelink-api";

interface LiveEvent {
  type: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

export default function AdminCommandCenter() {
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [epochs, setEpochs] = useState<EpochData[]>([]);
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [metrics, setMetrics] = useState<RpcMetrics | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [epochCountdown, setEpochCountdown] = useState(60);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const eventsRef = useRef<LiveEvent[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [s, e, n, m] = await Promise.allSettled([
          getStatus(),
          getEpochs(),
          getNodes(),
          getRpcMetrics(),
        ]);
        if (s.status === "fulfilled") setStatus(s.value);
        if (e.status === "fulfilled") setEpochs(e.value);
        if (n.status === "fulfilled") setNodes(n.value);
        if (m.status === "fulfilled") setMetrics(m.value);
        setLastUpdate(new Date());
      } catch (e) {
        console.error("Failed to load data:", e);
      }
    }
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setEpochCountdown((p) => (p <= 1 ? 60 : p - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const es = new EventSource(getSSEUrl());
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        eventsRef.current = [data, ...eventsRef.current].slice(0, 50);
        setEvents([...eventsRef.current]);
      } catch {}
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  const totalRevenue = epochs.reduce((sum, e) => sum + (e.total || 0), 0);
  const totalRequests = epochs.reduce((sum, e) => sum + parseInt(e.requests || "0"), 0);
  const epochsWithRevenue = epochs.filter((e) => e.total > 0);
  const revenueToday = metrics?.revenue?.usdtToday ? parseFloat(metrics.revenue.usdtToday) : 0;

  return (
    <div className="min-h-screen bg-[#091413] font-['Inter',sans-serif] text-[#B0E4CC]">
      {/* TOP COMMAND BAR */}
      <div className="sticky top-0 z-50 flex items-center h-12 px-4 gap-4 border-b border-[#1a3028] bg-[#091413]/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <div className="w-2 h-2 rounded-full bg-[#408A71] animate-pulse" />
          SATELINK ADMIN
        </div>
        <div className="flex items-center gap-4 text-[11px] ml-4">
          <span className="text-[#285A48]">
            Epoch
            <span className="text-[#00D1FF] font-mono ml-1">#{status?.current_epoch ?? "—"}</span>
          </span>
          <span className="text-[#285A48]">
            Next close
            <span className="text-[#408A71] font-mono ml-1">{epochCountdown}s</span>
          </span>
          <span className="text-[#285A48]">
            Nodes
            <span className="text-[#B0E4CC] font-mono ml-1">{status?.nodes_online ?? "—"}</span>
          </span>
          <span className="text-[#285A48]">
            Status
            <span className={`ml-1 font-medium ${status?.status === "operational" ? "text-[#408A71]" : "text-yellow-500"}`}>
              {status?.status ?? "loading"}
            </span>
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {lastUpdate && (
            <span className="text-[9px] text-[#285A48]">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <span className="text-[9px] px-2 py-0.5 rounded border border-[#285A48] text-[#285A48] font-mono">
            POLYGON 137
          </span>
          <span className="text-[9px] px-2 py-0.5 rounded border border-[#285A48] text-[#408A71]">
            BETA
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* EPOCH PROGRESS BAR */}
        <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#285A48] uppercase tracking-wider">Epoch Progress</span>
            <span className="text-[11px] font-mono text-[#B0E4CC]">
              #{status?.current_epoch ?? "—"} · {epochCountdown}s remaining
            </span>
          </div>
          <div className="h-1.5 bg-[#091413] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#408A71] transition-all duration-1000 rounded-full"
              style={{ width: `${((60 - epochCountdown) / 60) * 100}%` }}
            />
          </div>
        </div>

        {/* KEY METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Revenue", value: `$${totalRevenue.toFixed(6)}`, sub: `${epochs.length} epochs tracked`, glow: true },
            { label: "Revenue Today", value: `$${revenueToday.toFixed(6)}`, sub: `${metrics?.revenue?.eventsToday || 0} events` },
            { label: "Epochs with Revenue", value: `${epochsWithRevenue.length}`, sub: `of ${epochs.length} total` },
            { label: "Total RPC Calls", value: totalRequests.toLocaleString(), sub: "all tracked epochs" },
            { label: "Nodes Online", value: String(status?.nodes_online ?? "—"), sub: `${nodes.length} registered` },
          ].map((m) => (
            <div key={m.label} className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4 hover:border-[#285A48] transition-colors">
              <p className="text-[10px] text-[#285A48] uppercase tracking-wider font-semibold">{m.label}</p>
              <p className={`text-[22px] font-semibold font-mono tracking-tight mt-1.5 mb-0.5 ${m.glow ? "text-[#00D1FF] drop-shadow-[0_0_12px_rgba(0,209,255,0.3)]" : "text-[#B0E4CC]"}`}>
                {m.value}
              </p>
              <p className="text-[10px] text-[#285A48]">{m.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* EPOCH HISTORY TABLE */}
          <div className="lg:col-span-2 bg-[#0c1a17] border border-[#1a3028] rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a3028]">
              <div>
                <p className="text-[12px] font-medium text-[#B0E4CC]">Epoch Revenue History</p>
                <p className="text-[10px] text-[#285A48] mt-0.5">Real-time from /api/epochs · 50/30/20 split</p>
              </div>
              <a
                href="https://polygonscan.com/address/0xE475c53B88190FD2130dB1E37504991EFe283fb0"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#285A48] hover:text-[#408A71] transition-colors"
              >
                ClaimsContract ↗
              </a>
            </div>
            {epochs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#285A48] border-t-[#408A71] rounded-full animate-spin mb-3" />
                <p className="text-[11px] text-[#285A48]">Loading epoch history...</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-[#0c1a17]">
                    <tr className="border-b border-[#1a3028]">
                      {["Epoch", "Revenue", "Node Pool (50%)", "Platform (30%)", "Distrib. (20%)", "Requests", "Status"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[9px] font-semibold text-[#285A48] uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {epochs.map((e, i) => {
                      const rev = e.total || 0;
                      const hasRev = rev > 0;
                      const nodePool = rev * 0.5;
                      const platform = rev * 0.3;
                      const distrib = rev * 0.2;
                      return (
                        <tr key={i} className="border-b border-[#0f1d15] hover:bg-[#0f1e17] transition-colors">
                          <td className="px-3 py-2 font-mono text-[11px] text-[#B0E4CC]">
                            #{e.epoch_id ?? "pending"}
                          </td>
                          <td className={`px-3 py-2 font-mono text-[11px] ${hasRev ? "text-[#00D1FF]" : "text-[#285A48]"}`}>
                            ${rev.toFixed(6)}
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-[#408A71]">${nodePool.toFixed(6)}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-[#408A71]">${platform.toFixed(6)}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-[#408A71]">${distrib.toFixed(6)}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-[#285A48]">{e.requests}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${hasRev ? "bg-[#0f2e1a] text-[#408A71] border border-[#285A48]" : "bg-[#0f1510] text-[#285A48] border border-[#1a2e25]"}`}>
                              {hasRev ? "● REVENUE" : "○ EMPTY"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* LIVE EVENT STREAM */}
          <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a3028]">
              <p className="text-[12px] font-medium text-[#B0E4CC]">Live Events</p>
              <span className="flex items-center gap-1.5 text-[9px] text-[#00D1FF]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D1FF] animate-pulse" />
                SSE
              </span>
            </div>
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-[#285A48] border-t-[#408A71] rounded-full animate-spin mb-2" />
                <p className="text-[10px] text-[#285A48]">Waiting for events...</p>
                <p className="text-[9px] text-[#1a3028] mt-1">Send an RPC request to generate one</p>
              </div>
            ) : (
              <div className="divide-y divide-[#0f1d15] max-h-[400px] overflow-y-auto">
                {events.map((ev, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 text-[10px] hover:bg-[#0f1e17] transition-colors">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ev.type === "revenue:event" ? "bg-[#00D1FF]" : ev.type === "epoch:closed" ? "bg-[#408A71]" : "bg-[#285A48]"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[#408A71] truncate">{ev.type?.replace(":", " · ")}</div>
                      {ev.data && "amount_usdt" in ev.data && (
                        <div className="text-[#00D1FF] font-mono">${parseFloat(String(ev.data.amount_usdt)).toFixed(6)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CHAIN METRICS */}
        {metrics && (
          <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a3028]">
              <div>
                <p className="text-[12px] font-medium text-[#B0E4CC]">Chain Performance</p>
                <p className="text-[10px] text-[#285A48] mt-0.5">Live from /rpc/metrics · Uptime: {Math.floor(metrics.uptimeSeconds / 3600)}h</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4">
              {Object.entries(metrics.chains).map(([chain, data]) => (
                <div key={chain} className="bg-[#091413] border border-[#1a3028] rounded p-3">
                  <p className="text-[10px] font-semibold text-[#B0E4CC] uppercase">{chain}</p>
                  <div className="mt-2 space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-[#285A48]">Providers</span>
                      <span className="text-[#408A71]">{data.providers.healthy}/{data.providers.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#285A48]">Latency</span>
                      <span className="text-[#B0E4CC] font-mono">{data.performance.avgLatencyMs}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#285A48]">Best</span>
                      <span className="text-[#00D1FF] font-mono">{data.performance.bestLatencyMs}ms</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NODE TABLE */}
        <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a3028]">
            <div>
              <p className="text-[12px] font-medium text-[#B0E4CC]">Node Registry</p>
              <p className="text-[10px] text-[#285A48] mt-0.5">Live from /api/nodes</p>
            </div>
            <Link href="/satelink/os/nodes" className="text-[10px] text-[#285A48] hover:text-[#408A71]">
              View all →
            </Link>
          </div>
          {nodes.length === 0 ? (
            <p className="text-center text-[11px] text-[#285A48] py-8">Loading nodes...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1a3028] bg-[#091413]/50">
                    {["Node ID", "Type", "Region", "Chains", "Status", "Tier", "Reputation"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[9px] font-semibold text-[#285A48] uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nodes.map((n, i) => (
                    <tr key={i} className="border-b border-[#0f1d15] hover:bg-[#0f1e17] transition-colors">
                      <td className="px-3 py-2 font-mono text-[10px] text-[#B0E4CC]">{n.nodeId}</td>
                      <td className="px-3 py-2 text-[11px] text-[#408A71]">{n.nodeType}</td>
                      <td className="px-3 py-2 text-[11px] text-[#408A71]">{n.region}</td>
                      <td className="px-3 py-2 text-[10px] text-[#285A48] font-mono">{n.chainIds.join(", ")}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium border inline-flex items-center gap-1 ${n.status === "active" ? "bg-[#0f2e1a] text-[#408A71] border-[#285A48]" : "bg-[#1a1a0f] text-[#a0a030] border-[#3a3a18]"}`}>
                          ● {n.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[10px] text-[#408A71] uppercase">{n.tier}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-[#285A48]">{n.reputationScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* BOTTOM: REVENUE + QUICK ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
            <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-3">Revenue Architecture</p>
            {[
              { label: "Node Operators", pct: 50, color: "#408A71" },
              { label: "Platform Fee", pct: 30, color: "#285A48" },
              { label: "Distribution", pct: 20, color: "#00D1FF" },
            ].map((r) => (
              <div key={r.label} className="mb-3">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#B0E4CC]">{r.label}</span>
                  <span className="font-mono font-semibold" style={{ color: r.color }}>
                    {r.pct}%
                  </span>
                </div>
                <div className="h-1 bg-[#091413] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
                </div>
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-[#1a3028] text-[10px] text-[#285A48]">
              ClaimsContract: <span className="font-mono text-[#408A71]">0xE475c53B...fb0</span> · Polygon
            </div>
          </div>

          <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
            <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-3">Quick Actions</p>
            <div className="space-y-2">
              {[
                { label: "Test RPC endpoint", href: "https://rpc.satelink.network/health", external: true },
                { label: "View Polygonscan", href: "https://polygonscan.com/address/0xE475c53B88190FD2130dB1E37504991EFe283fb0", external: true },
                { label: "Check Chainlist PR", href: "https://github.com/DefiLlama/chainlist/pull/2721", external: true },
                { label: "Node operator dashboard", href: "/satelink/os/billing", external: false },
                { label: "Analytics", href: "/satelink/os/analytics", external: false },
              ].map((a) => (
                <a
                  key={a.label}
                  href={a.href}
                  target={a.external ? "_blank" : undefined}
                  rel={a.external ? "noopener noreferrer" : undefined}
                  className="flex items-center justify-between p-2.5 rounded border border-[#1a3028] hover:border-[#285A48] text-[11px] text-[#408A71] hover:text-[#B0E4CC] transition-all group"
                >
                  {a.label}
                  <span className="text-[#285A48] group-hover:text-[#408A71]">→</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
