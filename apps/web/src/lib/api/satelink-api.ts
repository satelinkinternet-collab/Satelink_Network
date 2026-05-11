const BASE = "https://rpc.satelink.network";

export interface NetworkStatus {
  status: string;
  uptime_pct: number;
  nodes_online: number;
  current_epoch: number;
  total_requests_24h: number;
  avg_latency_ms: number;
  chains_supported: string[];
  settlement: string;
}

export interface EpochData {
  epoch_id: number | null;
  requests: string;
  total: number;
}

export interface NodeData {
  nodeId: string;
  nodeType: string;
  region: string;
  chainIds: number[];
  status: string;
  tier: string;
  reputationScore: number;
  uptimePct: number;
  registeredAt: string;
}

export interface NodeEarnings {
  total_earned_usdt: number;
  pending_usdt: number;
  epochs_participated: number;
  by_epoch: Array<{
    epoch_id: number;
    earned_usdt: number;
    requests: number;
  }>;
}

export interface ChainMetrics {
  providers: { total: number; healthy: number; degraded: number };
  performance: { bestLatencyMs: number; avgLatencyMs: number; cacheHitRate: string };
  circuitBreakers: { closed: number; open: number; halfOpen: number };
}

export interface RpcMetrics {
  timestamp: string;
  uptimeSeconds: number;
  chains: Record<string, ChainMetrics>;
  revenue: {
    eventsToday: number;
    usdtToday: string;
    activeEpoch: number;
  };
  rpcGateway: {
    totalRequestsToday: number;
    cacheHitsToday: number;
    cacheStats: { hits: number; misses: number; hitRate: string };
    wsConnectionsActive: number;
  };
}

export async function getStatus(): Promise<NetworkStatus> {
  try {
    const r = await fetch(`${BASE}/api/status`, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } catch (err) {
    console.error("[API] /api/status failed:", err);
    throw err;
  }
}

export async function getEpochs(): Promise<EpochData[]> {
  try {
    const r = await fetch(`${BASE}/api/epochs`, { cache: "no-store" });
    if (!r.ok) {
      console.error("[API] /api/epochs HTTP", r.status);
      return [];
    }
    const data = await r.json();
    console.log("[API] /api/epochs:", data.epochs?.length, "epochs");
    return data.ok ? data.epochs : [];
  } catch (err) {
    console.error("[API] /api/epochs failed:", err);
    return [];
  }
}

export async function getNodes(): Promise<NodeData[]> {
  try {
    const r = await fetch(`${BASE}/api/nodes`, { cache: "no-store" });
    if (!r.ok) {
      console.error("[API] /api/nodes HTTP", r.status);
      return [];
    }
    const data = await r.json();
    console.log("[API] /api/nodes:", data.nodes?.length, "nodes");
    return data.ok ? data.nodes : [];
  } catch (err) {
    console.error("[API] /api/nodes failed:", err);
    return [];
  }
}

export async function getNodeEarnings(nodeId: string): Promise<NodeEarnings> {
  const r = await fetch(`${BASE}/api/nodes/${nodeId}/earnings`, { cache: "no-store" });
  if (!r.ok) {
    return { total_earned_usdt: 0, pending_usdt: 0, epochs_participated: 0, by_epoch: [] };
  }
  const data = await r.json();
  return data.ok ? data.earnings : { total_earned_usdt: 0, pending_usdt: 0, epochs_participated: 0, by_epoch: [] };
}

export async function getRpcMetrics(): Promise<RpcMetrics | null> {
  try {
    const r = await fetch(`${BASE}/rpc/metrics`, { cache: "no-store" });
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

export async function claimEarnings(nodeId: string): Promise<{ ok: boolean; txHash?: string; error?: string }> {
  try {
    const r = await fetch(`${BASE}/api/nodes/${nodeId}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return r.json();
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function getSSEUrl(): string {
  return `${BASE}/os/events`;
}
