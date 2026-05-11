"use client";

import { OsPageTemplate } from "@/components/satelink/os-page-template";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

export default function SatelinkProjectsPage() {
  const projects = useInfrastructureStore((state) => state.projects);
  const activeProjectId = useInfrastructureStore((state) => state.activeProjectId);
  const setActiveProject = useInfrastructureStore((state) => state.setActiveProject);
  const deployments = useInfrastructureStore((state) => state.deployments);

  return (
    <OsPageTemplate
      title="Projects"
      subtitle="Switch active projects and environments for infrastructure orchestration."
      metrics={[
        { label: "Projects", value: String(projects.length) },
        { label: "Active Project", value: activeProjectId },
        { label: "Environments", value: "3" },
        { label: "Members", value: "18" },
      ]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => setActiveProject(project.id)}
            className={`rounded-xl border p-4 text-left transition-colors ${activeProjectId === project.id ? "border-[#408A71] bg-[#10201d]" : "border-white/10 bg-black/20 hover:bg-black/30"}`}
          >
            <p className="text-sm font-medium text-white">{project.name}</p>
            <p className="mt-1 text-xs text-[#B0E4CC]/65">{project.id}</p>
            <p className="mt-2 text-xs text-[#408A71]">
              {deployments.filter((deployment) => deployment.projectId === project.id).length} deployments
            </p>
          </button>
        ))}
      </div>
    </OsPageTemplate>
  );
}
