export type SatelinkModuleName =
  | "auth"
  | "projects"
  | "nodes"
  | "deployments"
  | "metrics"
  | "analytics"
  | "notifications"
  | "billing"
  | "websocket";

export type PlatformEventName =
  | "deployment.created"
  | "deployment.state.changed"
  | "node.health.changed"
  | "queue.depth.changed"
  | "metrics.snapshot.generated"
  | "billing.usage.metered"
  | "notification.queued";

export interface EventEnvelope<TPayload> {
  id: string;
  event: PlatformEventName;
  timestamp: string;
  projectId: string;
  payload: TPayload;
}

export interface DeploymentStateChangedPayload {
  deploymentId: string;
  environment: "dev" | "staging" | "production";
  state: "queued" | "building" | "routing" | "active" | "failed";
  durationMs?: number;
}

export interface NodeHealthChangedPayload {
  nodeId: string;
  region: string;
  health: "healthy" | "degraded" | "offline";
  latencyMs: number;
  packetLossPct: number;
}

export interface QueueDepthChangedPayload {
  queue: string;
  depth: number;
  processing: number;
  failed: number;
}
