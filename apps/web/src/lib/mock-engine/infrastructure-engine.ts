import {
  DeployEventPayload,
  InfrastructureEvent,
  InfrastructureEventType,
  NodeEventPayload,
  QueueEventPayload,
} from "@/lib/events/infrastructure-events";
import { RealtimeChannel } from "@/lib/realtime/socket";

const deploymentStates: InfrastructureEventType[] = [
  "deploy.started",
  "deploy.building",
  "deploy.completed",
  "deploy.failed",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function mkEvent<TPayload>(type: InfrastructureEventType, payload: TPayload): InfrastructureEvent<TPayload> {
  return { id: crypto.randomUUID(), type, payload, timestamp: new Date().toISOString() };
}

export function startInfrastructureMockEngine(channel: RealtimeChannel): () => void {
  channel.connect();

  const interval = window.setInterval(() => {
    const next = Math.random();
    if (next < 0.28) {
      const payload: DeployEventPayload = {
        deploymentId: `dep-${Math.floor(1000 + Math.random() * 9000)}`,
        name: pick(["Global Mesh Rollout", "Queue Expansion", "Edge Gateway Patch", "Inference Fleet Refresh"]),
        environment: pick(["dev", "staging", "production"]),
      };
      channel.emit(mkEvent(pick(deploymentStates), payload));
      return;
    }

    if (next < 0.62) {
      const payload: NodeEventPayload = {
        nodeId: pick(["sat-1", "api-1", "gpu-1", "db-1"]),
        health: pick(["healthy", "degraded", "offline"]),
        latencyMs: Math.floor(14 + Math.random() * 90),
      };
      channel.emit(mkEvent(payload.health === "healthy" ? "node.connected" : "node.degraded", payload));
      return;
    }

    if (next < 0.86) {
      const payload: QueueEventPayload = {
        depth: Math.floor(600 + Math.random() * 2200),
        processing: Math.floor(200 + Math.random() * 700),
        failed: Math.floor(Math.random() * 20),
      };
      channel.emit(mkEvent(payload.depth > 2000 ? "queue.overloaded" : "metrics.tick", payload));
      return;
    }

    channel.emit(
      mkEvent("metrics.tick", {
        latency: Math.round(25 + Math.random() * 45),
        throughput: Number((10 + Math.random() * 5).toFixed(2)),
        queueDepth: Math.floor(800 + Math.random() * 1800),
      }),
    );
  }, 2200);

  return () => {
    window.clearInterval(interval);
    channel.disconnect();
  };
}
