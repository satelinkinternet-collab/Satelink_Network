export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

"use client";

"use client";

import { OsPageTemplate } from "@/components/satelink/os-page-template";

const members = [
  { name: "SRE Core", role: "Infrastructure", status: "online" },
  { name: "Platform Ops", role: "Deployments", status: "online" },
  { name: "Network Reliability", role: "Telemetry", status: "away" },
];

export default function SatelinkTeamPage() {
  return (
    <OsPageTemplate
      title="Team"
      subtitle="Collaborative infrastructure operations with role-based command access."
      metrics={[
        { label: "Members", value: "23" },
        { label: "On-call", value: "5" },
        { label: "Teams", value: "4" },
        { label: "RBAC Roles", value: "9" },
      ]}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {members.map((member) => (
          <article key={member.name} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="text-sm font-medium text-white">{member.name}</h3>
            <p className="text-xs text-[#B0E4CC]/65">{member.role}</p>
            <p className="mt-2 text-xs text-[#408A71]">{member.status}</p>
          </article>
        ))}
      </div>
    </OsPageTemplate>
  );
}
