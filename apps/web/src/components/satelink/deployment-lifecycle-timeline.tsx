"use client";

import { useInfrastructureStore } from "@/store/useInfrastructureStore";
import { lifecycleOrder } from "@/lib/deployments/lifecycle";

export function DeploymentLifecycleTimeline({ deploymentId }: { deploymentId: string }) {
  const deployment = useInfrastructureStore((s) => s.deployments.find((d) => d.id === deploymentId));
  if (!deployment) return null;

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="mb-3 text-xs uppercase tracking-[0.12em] text-[#B0E4CC]/70">Lifecycle</p>
      <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {lifecycleOrder.map((state, idx) => {
          const active = lifecycleOrder.indexOf(deployment.state as never) >= idx;
          return (
            <div key={state} className={`rounded-md border px-2 py-1 text-[10px] uppercase ${active ? "border-[#408A71] bg-[#13221f] text-white" : "border-white/10 text-[#B0E4CC]/55"}`}>
              {state}
            </div>
          );
        })}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-[#00D1FF] transition-all duration-500" style={{ width: `${deployment.progress}%` }} />
      </div>
    </section>
  );
}
