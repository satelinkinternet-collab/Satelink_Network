"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { DeploymentTerminal } from "@/components/satelink/deployment-terminal";
import { OsPageTemplate } from "@/components/satelink/os-page-template";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

export default function DeploymentDetailsPage() {
  const params = useParams<{ id: string }>();
  const deploymentId = params.id;
  const deployment = useInfrastructureStore((state) => state.deployments.find((item) => item.id === deploymentId));
  const logs = useInfrastructureStore((state) => state.terminalLogs.filter((log) => log.deploymentId === deploymentId));

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
      <DeploymentTerminal deploymentId={deploymentId} />
    </OsPageTemplate>
  );
}
