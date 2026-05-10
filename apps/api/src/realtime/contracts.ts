export type DeploymentLifecycleState =
  | "queued"
  | "provisioning"
  | "building"
  | "deploying"
  | "syncing"
  | "routing"
  | "healthcheck"
  | "active"
  | "degraded"
  | "retrying"
  | "failed"
  | "rolled_back";

export interface DeploymentLifecycleEvent {
  id: string;
  deploymentId: string;
  projectId: string;
  environment: "dev" | "staging" | "production";
  state: DeploymentLifecycleState;
  timestamp: string;
}

export interface QueueTelemetryEvent {
  queue: string;
  depth: number;
  processing: number;
  failed: number;
  timestamp: string;
}

export interface NodeTelemetryEvent {
  nodeId: string;
  health: "healthy" | "degraded" | "offline";
  latencyMs: number;
  region: string;
  timestamp: string;
}

export interface TopologyUpdateEvent {
  edgeId: string;
  trafficPct: number;
  queuePressure: number;
  timestamp: string;
}

export interface RevenueEvent {
  amount_usdt: number;
  method: string;
  chain: string;
  epoch_id: number | null;
  client_id: string;
  timestamp: string;
}

export interface EpochClosedEvent {
  epoch_id: number;
  total_revenue: number;
  node_pool: number;
  platform_fee: number;
  distribution_pool: number;
  event_count: number;
  timestamp: string;
}

export interface NodeHeartbeatEvent {
  node_id: string;
  status: "ACTIVE" | "INACTIVE" | "DEGRADED";
  region: string;
  uptime_pct: number;
  latency_ms: number;
  timestamp: string;
}

export interface ClaimGeneratedEvent {
  node_id: string;
  amount_usdt: number;
  wallet: string;
  timestamp: string;
}
