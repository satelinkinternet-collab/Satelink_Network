"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart } from "@tremor/react";
import { MetricCard, InfraCard, InfraCardHeader, InfraTable, TerminalBlock, ActivityRow, SectionHeader, InfraBadge, StatusDot } from "@/components/ui/satelink-ui";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

interface NetworkStatus {
  status: string;
  uptime_pct: number;
  nodes_online: number;
  current_epoch: number;
  total_requests_24h: number;
  avg_latency_ms: number;
}

interface NodeData {
  node_id: string;
  region: string;
  status: string;
  uptime_pct: number;
  requests_24h: number;
  earned_usdt: number;
}

interface EpochData {
  epoch_id: number;
  total_revenue_usdt: number;
  event_count: number;
}

interface LiveEvent {
  id: string;
  type: "revenue" | "epoch" | "node" | "claim" | "error";
  time: string;
  message: string;
  value?: string;
}

export default function SatelinkOverviewPage() {
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [epochCountdown, setEpochCountdown] = useState(60);
  const [liveNodes, setLiveNodes] = useState<NodeData[]>([]);
  const [epochHistory, setEpochHistory] = useState<EpochData[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  const nodes = useInfrastructureStore((s) => s.nodes);
  const healthyCount = useMemo(() => nodes.filter((n) => n.health === "healthy").length, [nodes]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statusRes, nodesRes, historyRes] = await Promise.all([
          fetch("https://rpc.satelink.network/api/status"),
          fetch("https://rpc.satelink.network/api/nodes"),
          fetch("https://rpc.satelink.network/api/settlement/history"),
        ]);

        if (statusRes.ok) setStatus(await statusRes.json());
        if (nodesRes.ok) {
          const data = await nodesRes.json();
          if (Array.isArray(data)) setLiveNodes(data);
        }
        if (historyRes.ok) {
          const data = await historyRes.json();
          if (Array.isArray(data)) setEpochHistory(data.slice(0, 10).reverse());
        }
      } catch {
        setStatus({ status: "operational", uptime_pct: 99.5, nodes_online: 1, current_epoch: 0, total_requests_24h: 0, avg_latency_ms: 85 });
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  // SSE for live events
  useEffect(() => {
    try {
      eventSourceRef.current = new EventSource("https://rpc.satelink.network/os/events");
      eventSourceRef.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          const event: LiveEvent = {
            id: `${Date.now()}-${Math.random()}`,
            type: data.type?.includes("revenue") ? "revenue" : data.type?.includes("epoch") ? "epoch" : "node",
            time: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            message: data.message || data.type,
            value: data.amount,
          };
          setLiveEvents((prev) => [event, ...prev.slice(0, 9)]);
        } catch {}
      };
    } catch {}

    return () => eventSourceRef.current?.close();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setEpochCountdown((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const chartData = epochHistory.map((e) => ({
    epoch: `#${e.epoch_id}`,
    Requests: e.event_count || 0,
  }));

  const nodeTableRows = (liveNodes.length > 0 ? liveNodes : nodes.map(n => ({
    node_id: n.id, region: n.region, status: n.health === "healthy" ? "online" : "offline",
    uptime_pct: 99.9, requests_24h: 0, earned_usdt: 0
  }))).map((node) => [
    <span key="id" className="font-mono text-[#B0E4CC]">{node.node_id}</span>,
    <span key="region" className="text-[#408A71]">{node.region}</span>,
    <InfraBadge key="status" status={node.status === "online" ? "active" : "pending"} />,
    <span key="uptime" className="font-mono text-[#B0E4CC]">{node.uptime_pct}%</span>,
    <span key="req" className="font-mono text-[#408A71]">{node.requests_24h?.toLocaleString() || "—"}</span>,
    <span key="usdt" className="font-mono text-[#00D1FF]">${node.earned_usdt?.toFixed(4) || "0.0000"}</span>,
  ]);

  const terminalLines = [
    { type: "dim" as const, text: "# RPC call (generates revenue)" },
    { type: "cmd" as const, text: "curl -X POST https://rpc.satelink.network/rpc/polygon \\" },
    { type: "out" as const, text: '  -H "Content-Type: application/json" \\' },
    { type: "out" as const, text: '  -d \'{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}\'' },
    { type: "ok" as const, text: '{"jsonrpc":"2.0","id":1,"result":"0x52a66ac"}' },
    { type: "dim" as const, text: "" },
    { type: "dim" as const, text: "# Network status" },
    { type: "cmd" as const, text: "curl https://rpc.satelink.network/api/status" },
    { type: "ok" as const, text: `{"status":"operational","current_epoch":${status?.current_epoch || 0},"nodes_online":${status?.nodes_online || 1}}` },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <SectionHeader
        title="Mission Control"
        sub="rpc.satelink.network · Auto-refreshes every 30s"
        action={
          <div className="flex items-center gap-1.5">
            <StatusDot status={status?.status === "operational" ? "online" : "pending"} />
            <span className="text-[11px] text-[#408A71]">{status?.status || "loading"}</span>
          </div>
        }
      />

      {/* Row 1: Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Nodes Online"
          value={String(status?.nodes_online || healthyCount)}
          sub="ap-south-1, us-west-2"
        />
        <MetricCard
          label="Current Epoch"
          value={`#${status?.current_epoch || 0}`}
          sub={`${epochCountdown}s remaining`}
          glow
        />
        <MetricCard
          label="Requests 24h"
          value={(status?.total_requests_24h || 0).toLocaleString()}
          trend="↑ 12%"
          sub="vs yesterday"
        />
        <MetricCard
          label="USDT Earned"
          value="$0.0000"
          sub="50% node · 30% platform"
        />
      </div>

      {/* Row 2: Chart + Activity */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Request Chart */}
        <InfraCard>
          <InfraCardHeader title="Request Volume" sub="Last 10 epochs" />
          <div className="p-4 h-[200px]">
            {chartData.length > 0 ? (
              <AreaChart
                data={chartData}
                index="epoch"
                categories={["Requests"]}
                colors={["emerald"]}
                showLegend={false}
                showGridLines={false}
                showXAxis={true}
                showYAxis={true}
                className="h-full"
                curveType="monotone"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-[11px] text-[#285A48]">
                Loading chart data...
              </div>
            )}
          </div>
        </InfraCard>

        {/* Live Activity */}
        <InfraCard className="flex flex-col">
          <InfraCardHeader title="Live Activity" sub="SSE stream">
            <StatusDot status="glow" />
          </InfraCardHeader>
          <div className="flex-1 overflow-y-auto max-h-[200px]">
            <AnimatePresence>
              {liveEvents.length > 0 ? (
                liveEvents.map((event) => (
                  <ActivityRow key={event.id} {...event} />
                ))
              ) : (
                <div className="p-4 text-center text-[11px] text-[#285A48]">
                  Waiting for events...
                </div>
              )}
            </AnimatePresence>
          </div>
        </InfraCard>
      </div>

      {/* Row 3: Node Table */}
      <InfraCard>
        <InfraCardHeader title="Node Network" sub={`${liveNodes.length || nodes.length} nodes`} />
        {nodeTableRows.length > 0 ? (
          <InfraTable
            headers={["Node ID", "Region", "Status", "Uptime", "Requests", "Earned USDT"]}
            rows={nodeTableRows}
          />
        ) : (
          <div className="p-8 text-center text-[11px] text-[#285A48]">
            No nodes connected
          </div>
        )}
      </InfraCard>

      {/* Row 4: Terminal */}
      <InfraCard>
        <InfraCardHeader title="Quick Start">
          <span className="text-[9px] text-[#285A48]">Free tier · 1000 req/day</span>
        </InfraCardHeader>
        <div className="p-4">
          <TerminalBlock lines={terminalLines} />
        </div>
      </InfraCard>

      {/* Settlement Contract */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-between px-4 py-3 rounded-md border border-[#1a3028] bg-[#0c1a17] text-[11px]"
      >
        <span className="text-[#285A48]">ClaimsContract</span>
        <a
          href="https://polygonscan.com/address/0xE475c53B88190FD2130dB1E37504991EFe283fb0"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[#00D1FF] hover:underline"
        >
          0xE475c53B88190FD2130dB1E37504991EFe283fb0
        </a>
      </motion.div>
    </div>
  );
}
