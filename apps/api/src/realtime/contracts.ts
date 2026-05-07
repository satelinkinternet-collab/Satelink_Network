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
