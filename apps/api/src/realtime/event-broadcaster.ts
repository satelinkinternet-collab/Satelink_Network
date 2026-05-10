import { EventEmitter } from "node:events";
import {
  DeploymentLifecycleEvent,
  NodeTelemetryEvent,
  QueueTelemetryEvent,
  TopologyUpdateEvent,
  RevenueEvent,
  EpochClosedEvent,
  NodeHeartbeatEvent,
  ClaimGeneratedEvent,
} from "./contracts";

export type RealtimeEventMap = {
  "deployment.lifecycle": DeploymentLifecycleEvent;
  "queue.telemetry": QueueTelemetryEvent;
  "node.telemetry": NodeTelemetryEvent;
  "topology.updated": TopologyUpdateEvent;
  "revenue:event": RevenueEvent;
  "epoch:closed": EpochClosedEvent;
  "node:heartbeat": NodeHeartbeatEvent;
  "claim:generated": ClaimGeneratedEvent;
};

export class RealtimeEventBroadcaster {
  private readonly emitter = new EventEmitter();

  publish<K extends keyof RealtimeEventMap>(topic: K, payload: RealtimeEventMap[K]): void {
    this.emitter.emit(topic, payload);
  }

  subscribe<K extends keyof RealtimeEventMap>(
    topic: K,
    listener: (payload: RealtimeEventMap[K]) => void,
  ): () => void {
    this.emitter.on(topic, listener);
    return () => this.emitter.off(topic, listener);
  }
}
