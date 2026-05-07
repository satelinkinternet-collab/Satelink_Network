"use client";

import "@xyflow/react/dist/style.css";

import { useMemo } from "react";
import { Background, Controls, MarkerType, MiniMap, ReactFlow } from "@xyflow/react";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

const edges = [
  { id: "e1", source: "sat-1", target: "api-1", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e2", source: "api-1", target: "gpu-1", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e4", source: "gpu-1", target: "db-1", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
];

export function InfrastructureEditor() {
  const defaultViewport = useMemo(() => ({ x: 10, y: 10, zoom: 0.85 }), []);
  const nodes = useInfrastructureStore((state) =>
    state.nodes.map((node, index) => ({
      id: node.id,
      position: { x: 120 + index * 220, y: index % 2 === 0 ? 70 : 230 },
      data: { label: `${node.name} (${node.health})` },
      type: index === 0 ? "input" : index === state.nodes.length - 1 ? "output" : undefined,
      style: {
        border: "1px solid rgba(176,228,204,0.26)",
        background: node.health === "healthy" ? "rgba(64,138,113,0.2)" : "rgba(180,110,60,0.25)",
        color: "#d8f7e8",
      },
    })),
  );

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
