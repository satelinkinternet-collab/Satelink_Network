"use client";

import "@xyflow/react/dist/style.css";

import { useMemo } from "react";
import { Background, Controls, MarkerType, MiniMap, ReactFlow } from "@xyflow/react";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

export function InfrastructureEditor() {
  const defaultViewport = useMemo(() => ({ x: 10, y: 10, zoom: 0.85 }), []);
  const topology = useInfrastructureStore((state) => state.topology);
  const nodes = useInfrastructureStore((state) =>
    state.nodes.map((node, index) => {
      const runtime = topology.nodes.find((item) => item.id === node.id);
      const pressure = runtime?.queuePressure ?? 22;
      const util = runtime?.gpuUtilization ?? 0;
      return {
      id: node.id,
      position: { x: 120 + index * 220, y: index % 2 === 0 ? 70 : 230 },
      data: { label: `${node.name} | ${node.health} | q:${pressure}%${node.type === "gpu" ? ` gpu:${util}%` : ""}` },
      type: index === 0 ? "input" : index === state.nodes.length - 1 ? "output" : undefined,
      style: {
        border: "1px solid rgba(176,228,204,0.26)",
        boxShadow: node.health === "healthy" ? "0 0 20px rgba(64,138,113,0.18)" : "0 0 20px rgba(220,125,70,0.16)",
        background:
          node.health === "healthy"
            ? "rgba(64,138,113,0.2)"
            : node.health === "degraded"
              ? "rgba(210,140,70,0.28)"
              : "rgba(160,70,80,0.28)",
        color: "#d8f7e8",
      },
      };
    }),
  );
  const edges = topology.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: edge.active,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: edge.traffic > 70 ? "#00D1FF" : "#408A71", strokeWidth: edge.traffic > 70 ? 2.2 : 1.4 },
    label: `${edge.traffic}%`,
  }));

  return (
    <div className="h-[480px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a1413]">
      <ReactFlow nodes={nodes} edges={edges} fitView defaultViewport={defaultViewport}>
        <Background color="#285A48" gap={24} />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
}
