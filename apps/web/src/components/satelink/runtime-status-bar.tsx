"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";
import { getRuntimeCondition, runtimeConditionColor } from "@/lib/runtime/status-layer";

export function RuntimeStatusBar() {
  const runtime = useInfrastructureStore((s) => s.runtime);
  const nodes = useInfrastructureStore((s) => s.nodes);
  const queue = useInfrastructureStore((s) => s.queueState);
  const condition = getRuntimeCondition(queue.depth, queue.failed);
  const dot = runtimeConditionColor(condition);
  const healthyCount = useMemo(() => nodes.filter((n) => n.health === "healthy").length, [nodes]);

  return (
    <div className="sticky top-0 z-20 mb-4 rounded-xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur">
      <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
        <div className="flex items-center gap-2">
          <motion.span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: dot }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.4 }}
          />
          <span>Network {condition === "stable" ? "Stable" : condition === "warning" ? "Warning" : "Critical"}</span>
        </div>
        <span>Active Nodes {healthyCount}</span>
        <span>Queue Pressure {queue.depth}</span>
        <span>Relay Latency {runtime.relayLatencyMs}ms</span>
        <span>Deploy Throughput {runtime.deploymentThroughput.toFixed(1)}/m</span>
        <span>Active Regions {runtime.activeRegions}</span>
      </div>
    </div>
  );
}
