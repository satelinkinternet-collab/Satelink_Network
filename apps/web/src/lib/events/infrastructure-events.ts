export type InfrastructureEventType =
  | "deploy.started"
  | "deploy.building"
  | "deploy.completed"
  | "deploy.failed"
  | "node.connected"
  | "node.degraded"
  | "queue.overloaded"
  | "metrics.tick";

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
