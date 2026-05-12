export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

"use client";

"use client";

import { useEffect, useState } from "react";
import { OsPageTemplate } from "@/components/satelink/os-page-template";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

interface ApiNode {
  id: string;
  node_id: string;
  wallet_address: string;
  region: string;
  status: string;
  reputation_score: number;
  uptime_pct: number;
  total_earned_usdt: number;
  created_at: string;
  last_heartbeat: string;
}

export default function SatelinkNodesPage() {
  const storeNodes = useInfrastructureStore((state) => state.nodes);
  const [apiNodes, setApiNodes] = useState<ApiNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const res = await fetch("https://rpc.satelink.network/api/nodes");
        const data = await res.json();
        if (data.nodes) {
          setApiNodes(data.nodes);
        }
      } catch (err) {
        console.error("[Nodes] Failed to fetch:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNodes();
    const interval = setInterval(fetchNodes, 30000);
    return () => clearInterval(interval);
  }, []);

  const displayNodes = apiNodes.length > 0 ? apiNodes : [];
  const healthyCount = displayNodes.filter((n) => n.status === "active").length;
  const degradedCount = displayNodes.filter((n) => n.status === "degraded").length;
  const offlineCount = displayNodes.filter((n) => n.status === "offline" || n.status === "inactive").length;

  return (
    <OsPageTemplate
      title="Node Network"
      subtitle="Live node fleet status, reputation scores, and earnings."
      metrics={[
        { label: "Total Nodes", value: String(displayNodes.length || storeNodes.length) },
        { label: "Active", value: String(healthyCount) },
        { label: "Degraded", value: String(degradedCount) },
        { label: "Offline", value: String(offlineCount) },
      ]}
    >
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00D1FF] border-t-transparent" />
        </div>
      ) : displayNodes.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center">
          <p className="text-[#B0E4CC]/60">No nodes registered yet.</p>
          <p className="mt-2 text-sm text-[#408A71]">
            Nodes will appear here once they register and send heartbeats.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {storeNodes.map((node) => (
              <NodeCard
                key={node.id}
                nodeId={node.id}
                region={node.region}
                status={node.health === "healthy" ? "active" : node.health}
                uptime={100}
                reputation={85}
                earned={0}
                lastHeartbeat="Mock data"
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[#B0E4CC]/60">
                <th className="px-4 py-3 font-medium">Node ID</th>
                <th className="px-4 py-3 font-medium">Region</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Uptime</th>
                <th className="px-4 py-3 font-medium">Reputation</th>
                <th className="px-4 py-3 font-medium">Earned</th>
                <th className="px-4 py-3 font-medium">Last Heartbeat</th>
              </tr>
            </thead>
            <tbody>
              {displayNodes.map((node) => (
                <tr key={node.id || node.node_id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-white">{node.node_id || node.id}</td>
                  <td className="px-4 py-3 text-[#B0E4CC]">{node.region || "Global"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={node.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-[#00D1FF]">{(node.uptime_pct || 0).toFixed(1)}%</td>
                  <td className="px-4 py-3">
                    <ReputationBar score={node.reputation_score || 0} />
                  </td>
                  <td className="px-4 py-3 font-mono text-emerald-300">${(node.total_earned_usdt || 0).toFixed(4)}</td>
                  <td className="px-4 py-3 text-xs text-[#B0E4CC]/60">
                    {node.last_heartbeat ? new Date(node.last_heartbeat).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </OsPageTemplate>
  );
}

function NodeCard({
  nodeId,
  region,
  status,
  uptime,
  reputation,
  earned,
  lastHeartbeat,
}: {
  nodeId: string;
  region: string;
  status: string;
  uptime: number;
  reputation: number;
  earned: number;
  lastHeartbeat: string;
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-sm font-medium text-white">{nodeId}</h3>
        <StatusBadge status={status} />
      </div>
      <p className="mt-1 text-xs text-[#B0E4CC]/60">{region}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-[#B0E4CC]/50">Uptime</p>
          <p className="font-mono text-[#00D1FF]">{uptime}%</p>
        </div>
        <div>
          <p className="text-[#B0E4CC]/50">Rep</p>
          <p className="font-mono text-white">{reputation}</p>
        </div>
        <div>
          <p className="text-[#B0E4CC]/50">Earned</p>
          <p className="font-mono text-emerald-300">${earned.toFixed(2)}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-[#B0E4CC]/40">{lastHeartbeat}</p>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-400/20 text-emerald-300 border-emerald-400/30",
    healthy: "bg-emerald-400/20 text-emerald-300 border-emerald-400/30",
    degraded: "bg-amber-400/20 text-amber-300 border-amber-400/30",
    offline: "bg-rose-400/20 text-rose-300 border-rose-400/30",
    inactive: "bg-rose-400/20 text-rose-300 border-rose-400/30",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${colors[status] || colors.offline}`}>
      {status}
    </span>
  );
}

function ReputationBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 80 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-white">{score}</span>
    </div>
  );
}
