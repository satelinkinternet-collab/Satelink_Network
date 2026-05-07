"use client";

import { OsPageTemplate } from "@/components/satelink/os-page-template";

export default function SatelinkBillingPage() {
  return (
    <OsPageTemplate
      title="Billing"
      subtitle="Infrastructure economics and utilization costs across environments."
      metrics={[
        { label: "Current Spend", value: "$48,291" },
        { label: "Projected Month", value: "$63,200" },
        { label: "Node Payout", value: "$24,145" },
        { label: "Platform Share", value: "$14,487" },
      ]}
    >
      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-sm text-[#B0E4CC]/75">Billing explorer scaffolding ready for live economics integration.</p>
      </section>
    </OsPageTemplate>
  );
}
