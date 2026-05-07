"use client";

import Link from "next/link";
import { BadgeCheck, Clock3, XCircle } from "lucide-react";
import { DeploymentTerminal } from "@/components/satelink/deployment-terminal";
import { OsPageTemplate } from "@/components/satelink/os-page-template";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

export default function SatelinkDeploymentsPage() {
  const deployments = useInfrastructureStore((state) => state.deployments);
  const setActiveEnvironment = useInfrastructureStore((state) => state.setActiveEnvironment);
  const activeEnvironment = useInfrastructureStore((state) => state.activeEnvironment);
  const environments = useInfrastructureStore((state) => state.environments);

  return (
    <OsPageTemplate
      title="Deployments"
      subtitle="Railway-style deployment control plane with live logs and state transitions."
      metrics={[
        { label: "Total Deployments", value: String(deployments.length) },
        { label: "Active", value: String(deployments.filter((d) => d.state === "active").length) },
        { label: "Building", value: String(deployments.filter((d) => d.state === "building").length) },
        { label: "Failed", value: String(deployments.filter((d) => d.state === "failed").length) },
      ]}
    >
      <div className="mb-3 flex gap-2">
        {environments.map((env) => (
          <button
            key={env}
            onClick={() => setActiveEnvironment(env)}
            className={`rounded-md px-3 py-1 text-xs uppercase tracking-[0.15em] ${activeEnvironment === env ? "bg-[#285A48] text-white" : "border border-white/10 bg-black/20 hover:bg-white/5"}`}
          >
            {env}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="space-y-3">
          {deployments.map((deployment) => (
            <Link key={deployment.id} href={`/satelink/os/deployments/${deployment.id}`} className="block rounded-xl border border-white/10 bg-black/20 p-4 transition-colors hover:bg-black/30">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">{deployment.name}</h3>
                <span className="text-xs text-[#B0E4CC]/60">{deployment.environment}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                {deployment.state === "active" ? <BadgeCheck className="h-3.5 w-3.5 text-emerald-300" /> : null}
                {deployment.state === "building" || deployment.state === "queued" ? <Clock3 className="h-3.5 w-3.5 text-amber-300" /> : null}
                {deployment.state === "failed" ? <XCircle className="h-3.5 w-3.5 text-rose-300" /> : null}
                <span className="uppercase tracking-[0.12em] text-[#B0E4CC]/70">{deployment.state}</span>
              </div>
            </Link>
          ))}
        </section>
        <DeploymentTerminal />
      </div>
    </OsPageTemplate>
  );
}
