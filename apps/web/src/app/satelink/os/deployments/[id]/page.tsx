"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;


import { useMemo } from "react";
import { useParams } from "next/navigation";
import { DeploymentLifecycleTimeline } from "@/components/satelink/deployment-lifecycle-timeline";
import { DeploymentTerminal } from "@/components/satelink/deployment-terminal";
import { OsPageTemplate } from "@/components/satelink/os-page-template";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

export default function DeploymentDetailsPage() {
  const params = useParams<{ id: string }>();
  const deploymentId = params.id;
  const deployments = useInfrastructureStore((state) => state.deployments);
  const terminalLogs = useInfrastructureStore((state) => state.terminalLogs);
  const deployment = useMemo(
    () => deployments.find((item) => item.id === deploymentId),
    [deployments, deploymentId],
  );
  const logs = useMemo(
    () => terminalLogs.filter((log) => log.deploymentId === deploymentId),
    [terminalLogs, deploymentId],
  );

  const title = useMemo(() => deployment?.name ?? "Deployment Not Found", [deployment?.name]);

  return (
    <OsPageTemplate
      title={title}
      subtitle="Live deployment inspector with terminal logs, state transitions, and environment telemetry."
      metrics={[
        { label: "Deployment ID", value: deploymentId },
        { label: "State", value: deployment?.state ?? "unknown" },
        { label: "Environment", value: deployment?.environment ?? "unknown" },
        { label: "Log Lines", value: String(logs.length) },
      ]}
    >
      <DeploymentLifecycleTimeline deploymentId={deploymentId} />
      <DeploymentTerminal deploymentId={deploymentId} />
    </OsPageTemplate>
  );
}
