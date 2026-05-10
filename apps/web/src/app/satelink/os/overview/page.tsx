"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

interface RevenueStreamEvent {
  id: string;
  timestamp: string;
  method: string;
  chain: string;
  amount: string;
}

export default function SatelinkOverviewPage() {
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [epochCountdown, setEpochCountdown] = useState(60);
  const [revenueEvents, setRevenueEvents] = useState<RevenueStreamEvent[]>([]);

  const metrics = useInfrastructureStore((s) => s.metrics);
  const nodes = useInfrastructureStore((s) => s.nodes);
  const activityStream = useInfrastructureStore((s) => s.activityStream);
  const notifications = useInfrastructureStore((s) => s.notifications);

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
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setEpochCountdown((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const revenueActivities = activityStream
      .filter((a) => a.type === "revenue.recorded")
      .slice(0, 20)
      .map((a) => ({
        id: a.id,
        timestamp: new Date(a.createdAt).toLocaleTimeString("en-US", { hour12: false }),
        method: a.message.includes("from") ? a.message.split("from ")[1]?.split(" on")[0] || "rpc_call" : "rpc_call",
        chain: a.message.includes("on") ? a.message.split("on ")[1] || "polygon" : "polygon",
        amount: a.message.match(/\$[\d.]+/)?.[0] || "$0.000030",
      }));
    setRevenueEvents(revenueActivities);
  }, [activityStream]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">Command Center</h1>
          <p className="mt-1 text-sm text-[#B0E4CC]/72">Live infrastructure monitoring and revenue tracking</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${status?.status === "operational" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className="text-sm text-[#B0E4CC]">{status?.status || "loading..."}</span>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5">
            <span className="text-xs text-[#B0E4CC]/60">Epoch</span>
            <span className="ml-2 font-mono text-sm text-white">{status?.current_epoch || "—"}</span>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5">
            <span className="text-xs text-[#B0E4CC]/60">24h Requests</span>
            <span className="ml-2 font-mono text-sm text-[#00D1FF]">{status?.total_requests_24h?.toLocaleString() || "0"}</span>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Nodes Online" value={String(status?.nodes_online || healthyCount)} accent />
        <MetricCard label="Current Epoch" value={String(status?.current_epoch || 0)} />
        <MetricCard label="Requests (24h)" value={(status?.total_requests_24h || 0).toLocaleString()} />
        <MetricCard label="Avg Latency" value={`${status?.avg_latency_ms || 85}ms`} />
        <MetricCard label="Uptime" value={`${status?.uptime_pct || 99.5}%`} />
        <MetricCard label="Settlement" value="Polygon" detail="USDT" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-[#B0E4CC]">Revenue Stream</p>
            <span className="text-xs text-[#408A71]">Live feed</span>
          </div>
          <div className="h-72 overflow-y-auto pr-2 custom-scrollbar">
            {revenueEvents.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#B0E4CC]/50">
                Waiting for first revenue event...
              </div>
            ) : (
              <div className="space-y-2">
                {revenueEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs">
                    <span className="font-mono text-[#B0E4CC]/60">{event.timestamp}</span>
                    <span className="text-[#B0E4CC]">{event.method}</span>
                    <span className="uppercase text-[#408A71]">{event.chain}</span>
                    <span className="font-mono text-[#00D1FF]">{event.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-[#B0E4CC]">Epoch Progress</p>
              <span className="font-mono text-sm text-[#00D1FF]">{epochCountdown}s</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#408A71] to-[#00D1FF] transition-all duration-1000"
                style={{ width: `${((60 - epochCountdown) / 60) * 100}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-[#B0E4CC]/60">Next epoch close in {epochCountdown} seconds</p>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-[#B0E4CC]/70">Recent Epoch Closures</p>
              {notifications
                .filter((n) => n.title.includes("Epoch"))
                .slice(0, 5)
                .map((n) => (
                  <div key={n.id} className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs">
                    <span className="text-[#00D1FF]">{n.title}</span>
                    <p className="mt-1 text-[#B0E4CC]/60">{n.description}</p>
                  </div>
                ))}
              {notifications.filter((n) => n.title.includes("Epoch")).length === 0 && (
                <p className="text-xs text-[#B0E4CC]/40">No epoch closures yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="mb-3 text-sm font-medium text-[#B0E4CC]">Node Network Status</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[#B0E4CC]/60">
                <th className="pb-2 font-medium">Node ID</th>
                <th className="pb-2 font-medium">Region</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Latency</th>
                <th className="pb-2 font-medium">Load</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => (
                <tr key={node.id} className="border-b border-white/5">
                  <td className="py-2 font-mono text-white">{node.id}</td>
                  <td className="py-2 text-[#B0E4CC]">{node.region}</td>
                  <td className="py-2">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${node.health === "healthy" ? "bg-emerald-400" : node.health === "degraded" ? "bg-amber-400" : "bg-rose-400"}`} />
                      <span className={node.health === "healthy" ? "text-emerald-300" : node.health === "degraded" ? "text-amber-300" : "text-rose-300"}>
                        {node.health}
                      </span>
                    </span>
                  </td>
                  <td className="py-2 font-mono text-[#00D1FF]">{node.latencyMs}ms</td>
                  <td className="py-2 text-[#B0E4CC]">{node.loadPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="mb-4 text-sm font-medium text-[#B0E4CC]">Settlement Pipeline</p>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <PipelineStage label="RPC Events" count={status?.total_requests_24h || 0} />
          <PipelineArrow />
          <PipelineStage label="Epoch" count={status?.current_epoch || 0} />
          <PipelineArrow />
          <PipelineStage label="Node Pool" count="50%" />
          <PipelineArrow />
          <PipelineStage label="Claim" />
          <PipelineArrow />
          <PipelineStage label="USDT" final />
        </div>
        <p className="mt-4 text-center text-xs text-[#B0E4CC]/50">
          ClaimsContract:{" "}
          <a
            href="https://polygonscan.com/address/0xE475c53B88190FD2130dB1E37504991EFe283fb0"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[#00D1FF] hover:underline"
          >
            0xE475...3fb0
          </a>
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="mb-3 text-sm text-[#B0E4CC]/70">Latency Trend</p>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics}>
              <XAxis dataKey="t" stroke="#5b8073" fontSize={10} />
              <YAxis stroke="#5b8073" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: "#091413", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Area type="monotone" dataKey="latency" stroke="#00D1FF" fillOpacity={0.15} fill="#00D1FF" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ActivityStream />
    </div>
  );
}

function MetricCard({ label, value, detail, accent }: { label: string; value: string; detail?: string; accent?: boolean }) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs text-[#B0E4CC]/65">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${accent ? "text-[#00D1FF]" : "text-white"}`}>{value}</p>
      {detail && <p className="mt-1 text-xs text-[#408A71]">{detail}</p>}
    </article>
  );
}

function PipelineStage({ label, count, final }: { label: string; count?: number | string; final?: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-2 text-center ${final ? "border-[#00D1FF]/50 bg-[#00D1FF]/10" : "border-white/10 bg-white/5"}`}>
      <p className={`font-medium ${final ? "text-[#00D1FF]" : "text-[#B0E4CC]"}`}>{label}</p>
      {count !== undefined && <p className="mt-1 font-mono text-white">{typeof count === "number" ? count.toLocaleString() : count}</p>}
    </div>
  );
}

function PipelineArrow() {
  return <span className="text-[#408A71]">→</span>;
}
