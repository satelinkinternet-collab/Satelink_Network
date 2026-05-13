import {
  machineAccessAgentGuardrails,
  machineAccessApiBoundaries,
  machineAccessSdkExamples,
  machineAccessTokenBlueprints,
} from "@/lib/machine-access";

export default function InternalAccessOverviewPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Token Classes", value: "8", detail: "Audit, deploy, observability, CI, AI, admin, session, project" },
          { label: "Protected Defaults", value: "4", detail: "hashed, scoped, audited, replay-guarded" },
          { label: "AI Sandbox", value: "Enabled", detail: "preview-only mutation lane" },
          { label: "Prod Mutations", value: "Approval", detail: "no autonomous destructive default" },
        ].map((card) => (
          <article key={card.label} className="rounded-2xl border border-[#17342a] bg-[#0b1714]/80 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#5da88d]">{card.label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
            <p className="mt-2 text-sm text-[#8ecfb4]">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <article className="rounded-2xl border border-[#17342a] bg-[#0b1714]/80 p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#5da88d]">Architecture Boundary</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Internal-only machine identity surface</h2>
          <div className="mt-5 space-y-3">
            {machineAccessApiBoundaries.map((boundary) => (
              <div key={boundary.surface} className="rounded-xl border border-[#1d3d32] bg-[#091413] p-4">
                <p className="font-mono text-sm text-[#d8fff1]">{boundary.surface}</p>
                <p className="mt-1 text-sm text-[#86c7ac]">{boundary.purpose}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[#17342a] bg-[#0b1714]/80 p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#5da88d]">Safe Agent Sandbox</p>
          <h2 className="mt-2 text-xl font-semibold text-white">AI assistance without unrestricted infra access</h2>
          <div className="mt-5 space-y-3">
            {machineAccessAgentGuardrails.map((rule) => (
              <div key={rule} className="rounded-xl border border-[#1d3d32] bg-[#091413] px-4 py-3 text-sm text-[#8ecfb4]">
                {rule}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-2xl border border-[#17342a] bg-[#0b1714]/80 p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#5da88d]">Default Token Blueprints</p>
          <div className="mt-4 space-y-3">
            {machineAccessTokenBlueprints.slice(0, 4).map((token) => (
              <div key={token.type} className="rounded-xl border border-[#1d3d32] bg-[#091413] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-sm text-white">{token.type}</p>
                  <span className="rounded-full border border-[#295845] px-2 py-1 text-[11px] text-[#8ecfb4]">{token.defaultTtl}</span>
                </div>
                <p className="mt-2 text-sm text-[#8ecfb4]">{token.primaryUse}</p>
                <p className="mt-2 text-xs text-[#5da88d]">{token.scopeProfile.join(" • ")}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[#17342a] bg-[#0b1714]/80 p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#5da88d]">SDK / CLI Direction</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Machine-operable workflows</h2>
          <div className="mt-5 space-y-3">
            {machineAccessSdkExamples.map((example) => (
              <pre
                key={example}
                className="overflow-x-auto rounded-xl border border-[#1d3d32] bg-[#091413] px-4 py-3 font-mono text-sm text-[#d8fff1]"
              >
                {example}
              </pre>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
