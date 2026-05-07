# Event Specification

Satelink OS infrastructure protocol for frontend simulation and backend websocket integration.

## `deployment.started`
- **Payload**: `{ deploymentId, name, environment, projectId, state }`
- **Source**: deployment lifecycle engine
- **Lifecycle**: first transition after queue intake
- **Propagation**: realtime channel -> store -> activity stream + terminal

## `deployment.completed`
- **Payload**: `{ deploymentId, name, environment, projectId, state: "active" }`
- **Source**: lifecycle engine after healthcheck pass
- **Lifecycle**: terminal success + deployment throughput bump
- **Propagation**: realtime channel -> store + runtime bar

## `deployment.failed`
- **Payload**: `{ deploymentId, name, environment, projectId, state: "failed" }`
- **Source**: lifecycle engine probabilistic failure branch
- **Lifecycle**: warning notification + retry scheduling
- **Propagation**: realtime channel -> store -> terminal + activity

## `node.connected`
- **Payload**: `{ nodeId, health, latencyMs }`
- **Source**: node telemetry simulator
- **Lifecycle**: node state set healthy
- **Propagation**: realtime channel -> topology + globe

## `node.disconnected`
- **Payload**: `{ nodeId, health: "offline", latencyMs }`
- **Source**: node telemetry simulator
- **Lifecycle**: node state set offline + critical notice
- **Propagation**: realtime channel -> notifications + topology

## `queue.spike`
- **Payload**: `{ depth, processing, failed }`
- **Source**: queue simulation path
- **Lifecycle**: queue state update and pressure visuals
- **Propagation**: realtime channel -> runtime bar + metrics

## `telemetry.updated`
- **Payload**: `{ latency, throughput, queueDepth }`
- **Source**: runtime telemetry tick
- **Lifecycle**: metrics append and runtime recalculation
- **Propagation**: realtime channel -> charts + runtime bar

## `region.activated`
- **Payload**: `{ latency, throughput, queueDepth }` (current mock shape)
- **Source**: simulated route scaling path
- **Lifecycle**: active region recalculation
- **Propagation**: realtime channel -> runtime bar + globe pulse

## `topology.updated`
- **Payload**: `{ edgeId, trafficPct, queuePressure, timestamp }`
- **Source**: backend broadcaster scaffold (future live source)
- **Lifecycle**: edge traffic visuals update
- **Propagation**: websocket gateway -> frontend topology renderer

## Future Backend Integration
- Route all event types through `RealtimeEventBroadcaster`.
- Mirror event names between frontend and backend contracts.
- Add Redis pub/sub transport for horizontal fan-out.
