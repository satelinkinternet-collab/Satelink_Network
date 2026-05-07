"use client";

import { ReactNode, useEffect } from "react";
import { createMockRealtimeChannel } from "@/lib/realtime/socket";
import { startInfrastructureMockEngine } from "@/lib/mock-engine/infrastructure-engine";
import { InfrastructureEvent } from "@/lib/events/infrastructure-events";
import { getRuntimeCondition } from "@/lib/runtime/status-layer";
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
    appendActivity,
    advanceDeploymentState,
    patchNodeHealth,
    patchNodeRuntime,
    updateQueue,
    updateRuntime,
    upsertDeployment,
  } = useInfrastructureStore();

  useEffect(() => {
    const onEvent = (event: InfrastructureEvent<unknown>) => {
      appendEvent(event.type);

      if (event.type.startsWith("deploy.")) {
        const payload = event.payload as {
          deploymentId: string;
          name: string;
          environment: "dev" | "staging" | "production";
          projectId: string;
          state?: string;
        };
        const stateMap: Record<string, string> = {
          "deploy.started": "queued",
          "deploy.provisioning": "provisioning",
          "deploy.building": "building",
          "deploy.deploying": "deploying",
          "deploy.syncing": "syncing",
          "deploy.routing": "routing",
          "deploy.healthcheck": "healthcheck",
          "deploy.completed": "active",
          "deploy.retrying": "retrying",
          "deploy.failed": "failed",
          "deploy.rolled_back": "rolled_back",
        };
        const state = (payload.state ?? stateMap[event.type] ?? "queued") as never;
        upsertDeployment({
          id: payload.deploymentId,
          name: payload.name,
          projectId: payload.projectId ?? "proj-core",
          environment: payload.environment,
          state,
          updatedAt: event.timestamp,
          progress: 0,
          region: "Global",
        });
        advanceDeploymentState(payload.deploymentId, state);
        appendLog({
          id: event.id,
          deploymentId: payload.deploymentId,
          timestamp: toClock(event.timestamp),
          level: state === "failed" ? "error" : state === "active" ? "success" : "info",
          line: `\u001b[2m[satelink]\u001b[0m ${payload.name} -> ${state}`,
        });
        if (state === "failed") {
          appendLog({
            id: crypto.randomUUID(),
            deploymentId: payload.deploymentId,
            timestamp: toClock(event.timestamp),
            level: "warn",
            line: "retry controller: scheduling retry attempt in 4.2s",
          });
        }
        if (state === "provisioning") {
          appendLog({
            id: crypto.randomUUID(),
            deploymentId: payload.deploymentId,
            timestamp: toClock(event.timestamp),
            level: "info",
            line: "allocator: reserving relay slots and GPU lanes",
          });
        }
        if (state === "healthcheck") {
          appendLog({
            id: crypto.randomUUID(),
            deploymentId: payload.deploymentId,
            timestamp: toClock(event.timestamp),
            level: "info",
            line: "healthcheck: probing node heartbeat and queue drains",
          });
        }
        appendActivity({
          id: event.id,
          type: event.type,
          severity: state === "failed" ? "critical" : state === "active" ? "success" : "info",
          message: `${payload.name} moved to ${state}`,
          createdAt: event.timestamp,
          projectId: payload.projectId ?? "proj-core",
          environment: payload.environment,
        });
      } else if (event.type === "node.connected" || event.type === "node.degraded") {
        const payload = event.payload as { nodeId: string; health: "healthy" | "degraded" | "offline"; latencyMs: number };
        patchNodeHealth(payload.nodeId, payload.health, payload.latencyMs);
        patchNodeRuntime(payload.nodeId, Math.floor(20 + Math.random() * 70), Math.floor(30 + Math.random() * 92));
      } else if (event.type === "node.disconnected") {
        const payload = event.payload as { nodeId: string; health: "healthy" | "degraded" | "offline"; latencyMs: number };
        patchNodeHealth(payload.nodeId, "offline", payload.latencyMs);
        appendNotification({
          id: event.id,
          title: "Node disconnected",
          description: `${payload.nodeId} has gone offline`,
          level: "critical",
          createdAt: event.timestamp,
        });
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
        appendLog({
          id: crypto.randomUUID(),
          deploymentId: "system",
          timestamp: toClock(event.timestamp),
          level: "warn",
          line: `queue monitor: depth=${payload.depth} processing=${payload.processing} failed=${payload.failed}`,
        });
      } else if (event.type === "queue.spike") {
        const payload = event.payload as { depth: number; processing: number; failed: number };
        updateQueue(payload.depth, payload.processing, payload.failed);
      } else if (
        event.type === "metrics.tick" ||
        event.type === "telemetry.updated" ||
        event.type === "routing.updated" ||
        event.type === "scaling.triggered" ||
        event.type === "region.activated"
      ) {
        const payload = event.payload as { latency?: number; throughput?: number; queueDepth?: number; depth?: number };
        appendMetric({
          t: toClock(event.timestamp),
          latency: payload.latency ?? 35,
          throughput: payload.throughput ?? 12,
          queueDepth: payload.queueDepth ?? payload.depth ?? 1000,
        });

        const queueDepth = payload.queueDepth ?? payload.depth ?? 1000;
        const condition = getRuntimeCondition(queueDepth, Math.floor(queueDepth / 310));
        updateRuntime({
          networkStable: condition === "stable",
          relayLatencyMs: payload.latency ?? 35,
          deploymentThroughput: payload.throughput ?? 12,
          activeRegions: Math.min(12, Math.max(4, Math.floor((payload.throughput ?? 12) / 1.2))),
        });
      }
    };

    const unsubscribe = channel.subscribe(onEvent);
    const stop = startInfrastructureMockEngine(channel);

    return () => {
      unsubscribe();
      stop();
    };
  }, [
    appendActivity,
    appendEvent,
    appendLog,
    appendMetric,
    appendNotification,
    advanceDeploymentState,
    patchNodeHealth,
    patchNodeRuntime,
    updateQueue,
    updateRuntime,
    upsertDeployment,
  ]);

  return <>{children}</>;
}
