"use client";

import { ReactNode, useEffect, useRef } from "react";
import { createHybridRealtimeChannel, createMockRealtimeChannel } from "@/lib/realtime/socket";
import { startInfrastructureMockEngine } from "@/lib/mock-engine/infrastructure-engine";
import { InfrastructureEvent } from "@/lib/events/infrastructure-events";
import { getRuntimeCondition } from "@/lib/runtime/status-layer";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

const channel = createHybridRealtimeChannel();
const mockChannel = createMockRealtimeChannel();

function toClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour12: false });
}

export function SatelinkRealtimeProvider({ children }: { children: ReactNode }) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const onEvent = (event: InfrastructureEvent<unknown>) => {
      const store = useInfrastructureStore.getState();
      store.appendEvent(event.type);

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
        const deploymentState = (payload.state ?? stateMap[event.type] ?? "queued") as never;
        store.upsertDeployment({
          id: payload.deploymentId,
          name: payload.name,
          projectId: payload.projectId ?? "proj-core",
          environment: payload.environment,
          state: deploymentState,
          updatedAt: event.timestamp,
          progress: 0,
          region: "Global",
        });
        store.advanceDeploymentState(payload.deploymentId, deploymentState);
        store.appendLog({
          id: event.id,
          deploymentId: payload.deploymentId,
          timestamp: toClock(event.timestamp),
          level: deploymentState === "failed" ? "error" : deploymentState === "active" ? "success" : "info",
          line: `\u001b[2m[satelink]\u001b[0m ${payload.name} -> ${deploymentState}`,
        });
        if (deploymentState === "failed") {
          store.appendLog({
            id: crypto.randomUUID(),
            deploymentId: payload.deploymentId,
            timestamp: toClock(event.timestamp),
            level: "warn",
            line: "retry controller: scheduling retry attempt in 4.2s",
          });
        }
        if (deploymentState === "provisioning") {
          store.appendLog({
            id: crypto.randomUUID(),
            deploymentId: payload.deploymentId,
            timestamp: toClock(event.timestamp),
            level: "info",
            line: "allocator: reserving relay slots and GPU lanes",
          });
        }
        if (deploymentState === "healthcheck") {
          store.appendLog({
            id: crypto.randomUUID(),
            deploymentId: payload.deploymentId,
            timestamp: toClock(event.timestamp),
            level: "info",
            line: "healthcheck: probing node heartbeat and queue drains",
          });
        }
        store.appendActivity({
          id: event.id,
          type: event.type,
          severity: deploymentState === "failed" ? "critical" : deploymentState === "active" ? "success" : "info",
          message: `${payload.name} moved to ${deploymentState}`,
          createdAt: event.timestamp,
          projectId: payload.projectId ?? "proj-core",
          environment: payload.environment,
        });
      } else if (event.type === "node.connected" || event.type === "node.degraded") {
        const payload = event.payload as { nodeId: string; health: "healthy" | "degraded" | "offline"; latencyMs: number };
        store.patchNodeHealth(payload.nodeId, payload.health, payload.latencyMs);
        store.patchNodeRuntime(payload.nodeId, Math.floor(20 + Math.random() * 70), Math.floor(30 + Math.random() * 92));
      } else if (event.type === "node.disconnected") {
        const payload = event.payload as { nodeId: string; health: "healthy" | "degraded" | "offline"; latencyMs: number };
        store.patchNodeHealth(payload.nodeId, "offline", payload.latencyMs);
        store.appendNotification({
          id: event.id,
          title: "Node disconnected",
          description: `${payload.nodeId} has gone offline`,
          level: "critical",
          createdAt: event.timestamp,
        });
      } else if (event.type === "queue.overloaded") {
        const payload = event.payload as { depth: number; processing: number; failed: number };
        store.updateQueue(payload.depth, payload.processing, payload.failed);
        store.appendNotification({
          id: event.id,
          title: "Queue overload detected",
          description: `Depth ${payload.depth}, processing ${payload.processing}`,
          level: "warning",
          createdAt: event.timestamp,
        });
        store.appendLog({
          id: crypto.randomUUID(),
          deploymentId: "system",
          timestamp: toClock(event.timestamp),
          level: "warn",
          line: `queue monitor: depth=${payload.depth} processing=${payload.processing} failed=${payload.failed}`,
        });
      } else if (event.type === "queue.spike") {
        const payload = event.payload as { depth: number; processing: number; failed: number };
        store.updateQueue(payload.depth, payload.processing, payload.failed);
      } else if (
        event.type === "metrics.tick" ||
        event.type === "telemetry.updated" ||
        event.type === "routing.updated" ||
        event.type === "scaling.triggered" ||
        event.type === "region.activated"
      ) {
        const payload = event.payload as { latency?: number; throughput?: number; queueDepth?: number; depth?: number };
        store.appendMetric({
          t: toClock(event.timestamp),
          latency: payload.latency ?? 35,
          throughput: payload.throughput ?? 12,
          queueDepth: payload.queueDepth ?? payload.depth ?? 1000,
        });

        const queueDepth = payload.queueDepth ?? payload.depth ?? 1000;
        const condition = getRuntimeCondition(queueDepth, Math.floor(queueDepth / 310));
        store.updateRuntime({
          networkStable: condition === "stable",
          relayLatencyMs: payload.latency ?? 35,
          deploymentThroughput: payload.throughput ?? 12,
          activeRegions: Math.min(12, Math.max(4, Math.floor((payload.throughput ?? 12) / 1.2))),
        });
      } else if (event.type === "revenue:event") {
        const payload = event.payload as { amount_usdt: number; method: string; chain: string; client_id: string };
        store.appendActivity({
          id: event.id,
          type: "revenue.recorded",
          severity: "success",
          message: `Revenue: $${payload.amount_usdt.toFixed(6)} from ${payload.method} on ${payload.chain}`,
          createdAt: event.timestamp,
          projectId: "proj-core",
          environment: "production",
        });
        store.appendMetric({
          t: toClock(event.timestamp),
          latency: 35,
          throughput: 1,
          queueDepth: 100,
        });
      } else if (event.type === "epoch:closed") {
        const payload = event.payload as { epoch_id: number; total_revenue: number; node_pool: number; event_count: number };
        store.appendNotification({
          id: event.id,
          title: `Epoch ${payload.epoch_id} Closed`,
          description: `Revenue: $${payload.total_revenue.toFixed(4)} | Node Pool: $${payload.node_pool.toFixed(4)} | ${payload.event_count} events`,
          level: "success",
          createdAt: event.timestamp,
        });
        store.appendActivity({
          id: event.id,
          type: "epoch.closed",
          severity: "success",
          message: `Epoch ${payload.epoch_id} closed with $${payload.total_revenue.toFixed(4)} revenue`,
          createdAt: event.timestamp,
          projectId: "proj-core",
          environment: "production",
        });
      } else if (event.type === "node:heartbeat") {
        const payload = event.payload as { node_id: string; status: string; region: string; latency_ms: number };
        store.patchNodeHealth(
          payload.node_id,
          payload.status === "ACTIVE" ? "healthy" : payload.status === "DEGRADED" ? "degraded" : "offline",
          payload.latency_ms
        );
      } else if (event.type === "claim:generated") {
        const payload = event.payload as { node_id: string; amount_usdt: number; wallet: string };
        store.appendNotification({
          id: event.id,
          title: "Claim Generated",
          description: `Node ${payload.node_id}: $${payload.amount_usdt?.toFixed(4) || "0"} USDT ready for ${payload.wallet.slice(0, 8)}...`,
          level: "success",
          createdAt: event.timestamp,
        });
      }
    };

    const unsubscribe = channel.subscribe(onEvent);
    channel.connect();

    const unsubscribeMock = mockChannel.subscribe(onEvent);
    const stopMock = startInfrastructureMockEngine(mockChannel);

    return () => {
      unsubscribe();
      unsubscribeMock();
      stopMock();
      channel.disconnect();
      startedRef.current = false;
    };
  }, []);

  return <>{children}</>;
}
