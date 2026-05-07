"use client";

import { OsPageTemplate } from "@/components/satelink/os-page-template";

const rows = [
  { key: "Auto-heal routing", value: "Enabled" },
  { key: "Realtime telemetry", value: "Enabled" },
  { key: "Queue overload alerts", value: "Enabled" },
  { key: "Deployment rollback policy", value: "Conservative" },
];

export default function SatelinkSettingsPage() {
  return (
    <OsPageTemplate
      title="Settings"
      subtitle="Global Satelink OS controls for infra behavior and deployment safety."
      metrics={[
        { label: "Policies", value: "12" },
        { label: "Feature Flags", value: "7" },
        { label: "Alert Channels", value: "3" },
        { label: "Compliance", value: "SOC2-ready" },
      ]}
    >
      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0d1716] px-3 py-2 text-sm">
              <span className="text-[#B0E4CC]/75">{row.key}</span>
              <span className="text-white">{row.value}</span>
            </div>
          ))}
        </div>
      </section>
    </OsPageTemplate>
  );
}
