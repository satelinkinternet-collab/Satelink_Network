export type InfrastructureEventType =
  | "deploy.started"
  | "deploy.provisioning"
  | "deploy.building"
  | "deploy.deploying"
  | "deploy.syncing"
  | "deploy.routing"
  | "deploy.healthcheck"
  | "deploy.completed"
  | "deploy.failed"
  | "deploy.retrying"
  | "deploy.rolled_back"
  | "node.connected"
  | "node.disconnected"
  | "node.degraded"
  | "queue.overloaded"
  | "queue.spike"
  | "routing.updated"
  | "scaling.triggered"
  | "telemetry.updated"
  | "region.activated"
  | "topology.updated"
  | "metrics.tick"
  | "revenue:event"
  | "epoch:closed"
  | "node:heartbeat"
  | "claim:generated"
  | "revenue.recorded"
  | "epoch.closed";

export interface InfrastructureEvent<TPayload = Record<string, unknown>> {
  id: string;
  type: InfrastructureEventType;
  timestamp: string;
  payload: TPayload;
}

export interface DeployEventPayload {
  deploymentId: string;
  name: string;
  environment: "dev" | "staging" | "production";
  projectId: string;
  state?: string;
}

export interface NodeEventPayload {
  nodeId: string;
  health: "healthy" | "degraded" | "offline";
  latencyMs: number;
}

export interface QueueEventPayload {
  depth: number;
  processing: number;
  failed: number;
}
