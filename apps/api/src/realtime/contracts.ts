export type DeploymentLifecycleState = "queued" | "building" | "routing" | "active" | "failed";

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
  timestamp: string;
}
