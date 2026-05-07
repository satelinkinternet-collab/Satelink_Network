"use client";

import { OsPageTemplate } from "@/components/satelink/os-page-template";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

export default function SatelinkNodesPage() {
  const nodes = useInfrastructureStore((state) => state.nodes);

  return (
    <OsPageTemplate
      title="Nodes"
      subtitle="Global node fleet health, latency posture, and active load."
      metrics={[
        { label: "Total Nodes", value: String(nodes.length) },
        { label: "Healthy", value: String(nodes.filter((n) => n.health === "healthy").length) },
        { label: "Degraded", value: String(nodes.filter((n) => n.health === "degraded").length) },
        { label: "Offline", value: String(nodes.filter((n) => n.health === "offline").length) },
      ]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {nodes.map((node) => (
          <article key={node.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">{node.name}</h3>
              <span className="text-xs uppercase text-[#B0E4CC]/65">{node.type}</span>
            </div>
            <p className="mt-1 text-xs text-[#B0E4CC]/60">{node.region}</p>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className={node.health === "healthy" ? "text-emerald-300" : node.health === "degraded" ? "text-amber-300" : "text-rose-300"}>{node.health}</span>
              <span>{node.latencyMs}ms</span>
            </div>
          </article>
        ))}
      </div>
    </OsPageTemplate>
  );
}
