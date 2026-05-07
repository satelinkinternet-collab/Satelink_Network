"use client";

import { ReactNode, useEffect } from "react";
import { createMockRealtimeChannel } from "@/lib/realtime/socket";
import { startInfrastructureMockEngine } from "@/lib/mock-engine/infrastructure-engine";
import { InfrastructureEvent } from "@/lib/events/infrastructure-events";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

const channel = createMockRealtimeChannel();

function toClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour12: false });
}

export function SatelinkRealtimeProvider({ children }: { children: ReactNode }) {
  const {
    appendEvent,
    appendLog,
    appendMetric,
    appendNotification,
    patchNodeHealth,
    updateQueue,
    upsertDeployment,
  } = useInfrastructureStore();

  useEffect(() => {
    const onEvent = (event: InfrastructureEvent<unknown>) => {
      appendEvent(event.type);

      if (event.type.startsWith("deploy.")) {
        const payload = event.payload as { deploymentId: string; name: string; environment: "dev" | "staging" | "production" };
        const state = event.type === "deploy.completed" ? "active" : event.type === "deploy.failed" ? "failed" : event.type === "deploy.building" ? "building" : "queued";
        upsertDeployment({
          id: payload.deploymentId,
          name: payload.name,
          projectId: "proj-core",
          environment: payload.environment,
          state,
          updatedAt: event.timestamp,
        });
        appendLog({
          id: event.id,
          deploymentId: payload.deploymentId,
          timestamp: toClock(event.timestamp),
          level: state === "failed" ? "error" : state === "active" ? "success" : "info",
          line: `${payload.name} -> ${state}`,
        });
      } else if (event.type === "node.connected" || event.type === "node.degraded") {
        const payload = event.payload as { nodeId: string; health: "healthy" | "degraded" | "offline"; latencyMs: number };
        patchNodeHealth(payload.nodeId, payload.health, payload.latencyMs);
      } else if (event.type === "queue.overloaded") {
        const payload = event.payload as { depth: number; processing: number; failed: number };
        updateQueue(payload.depth, payload.processing, payload.failed);
        appendNotification({
          id: event.id,
          title: "Queue overload detected",
          description: `Depth ${payload.depth}, processing ${payload.processing}`,
          level: "warning",
          createdAt: event.timestamp,
        });
      } else if (event.type === "metrics.tick") {
        const payload = event.payload as { latency?: number; throughput?: number; queueDepth?: number; depth?: number };
        appendMetric({
          t: toClock(event.timestamp),
          latency: payload.latency ?? 35,
          throughput: payload.throughput ?? 12,
          queueDepth: payload.queueDepth ?? payload.depth ?? 1000,
        });
      }
    };

    const unsubscribe = channel.subscribe(onEvent);
    const stop = startInfrastructureMockEngine(channel);

    return () => {
      unsubscribe();
      stop();
    };
  }, [appendEvent, appendLog, appendMetric, appendNotification, patchNodeHealth, updateQueue, upsertDeployment]);

  return <>{children}</>;
}
