# Satelink Distributed Job Queue System

## Overview
The Satelink Job Queue is a backpressure-resilient task distribution system built on **Redis Streams**. It ensures that high-priority workloads are processed first and that the network remains stable even during massive traffic spikes.

## Architecture
- **Storage**: Redis Streams (`satelink_jobs`).
- **Submission API**: `POST /v1/jobs`.
- **Dispatcher**: Background worker loop pulling from Redis Streams.
- **Node Management**: `node_capacity` table tracks real-time slots.
- **Backpressure**: Multilayer throttling (Global, Priority-switch, Reject).

## Backpressure Safety Triggers
- **10k jobs**: Global throttling (logging & slow-down).
- **50k jobs**: Accept **HIGH** priority only.
- **100k jobs**: Reject all new jobs (HTTP 429).

## Retry Policy
1. **Retry 1**: Same node (assumes transient network blip).
2. **Retry 2**: Different node (assumes node-specific failure).
3. **Retry 3**: Highest reputation node (failsafe).
4. **Final**: Mark job as `FAILED`.

## Monitoring
- **Endpoint**: `/health/queue`.
- **Metrics**:
    - `queue_depth`: Total jobs buffered.
    - `pricing_multiplier`: Adaptive price based on load.
    - `capacity_usage`: Aggregate node slot saturation.
