"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { InfrastructureEditor } from "@/components/satelink/infrastructure-editor";
import { NetworkGlobe } from "@/components/satelink/network-globe";
import { OsPageTemplate } from "@/components/satelink/os-page-template";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

export default function SatelinkOverviewPage() {
  const metrics = useInfrastructureStore((s) => s.metrics);
  const nodes = useInfrastructureStore((s) => s.nodes);
  const queue = useInfrastructureStore((s) => s.queueState);
  const healthy = nodes.filter((n) => n.health === "healthy").length;

  return (
    <OsPageTemplate
      title="Infrastructure Command Center"
      subtitle="Realtime orchestration for decentralized compute and satellite-linked routing."
      metrics={[
        { label: "Healthy Nodes", value: `${healthy}/${nodes.length}` },
        { label: "Queue Depth", value: queue.depth.toLocaleString() },
        { label: "Processing", value: queue.processing.toLocaleString() },
        { label: "Failed Jobs", value: String(queue.failed) },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="mb-3 text-sm text-[#B0E4CC]/70">Deployment topology</p>
          <InfrastructureEditor />
        </div>
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="mb-3 text-sm text-[#B0E4CC]/70">Realtime network globe</p>
            <NetworkGlobe />
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="mb-3 text-sm text-[#B0E4CC]/70">Latency trend</p>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics}>
                  <XAxis dataKey="t" stroke="#5b8073" />
                  <YAxis stroke="#5b8073" />
                  <Tooltip />
                  <Area type="monotone" dataKey="latency" stroke="#00D1FF" fillOpacity={0.15} fill="#00D1FF" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </OsPageTemplate>
  );
}
