import { machineAccessAgentGuardrails, machineAccessSdkExamples } from "@/lib/machine-access";

export default function InternalAccessAgentsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#17342a] bg-[#0b1714]/80 p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#5da88d]">Agent Policy</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Safe AI infrastructure interaction model</h2>
        <p className="mt-3 max-w-3xl text-sm text-[#8ecfb4]">
          Satelink agents inspect runtime systems with readonly scopes first, recommend changes from evidence, and only request
          preview-environment mutations inside a nonce-protected, fully audited sandbox.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-2xl border border-[#17342a] bg-[#0b1714]/80 p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#5da88d]">Guardrails</p>
          <div className="mt-4 space-y-3">
            {machineAccessAgentGuardrails.map((rule) => (
              <div key={rule} className="rounded-xl border border-[#1d3d32] bg-[#091413] p-4 text-sm text-[#8ecfb4]">
                {rule}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[#17342a] bg-[#0b1714]/80 p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#5da88d]">Workflow Direction</p>
          <div className="mt-4 space-y-3">
            {[
              "1. Receive scoped ai-agent-token with environment + project envelope.",
              "2. Inspect deployments, logs, metrics, topology, queues, and websocket health.",
              "3. Produce remediation suggestions and confidence-ranked diagnostics.",
              "4. Trigger preview build or preview deploy request when scopes allow.",
              "5. Hand production promotion to a human approval boundary.",
            ].map((step) => (
              <div key={step} className="rounded-xl border border-[#1d3d32] bg-[#091413] p-4 text-sm text-[#8ecfb4]">
                {step}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-[#17342a] bg-[#0b1714]/80 p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#5da88d]">Future CLI / SDK</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {machineAccessSdkExamples.map((example) => (
            <pre
              key={example}
              className="overflow-x-auto rounded-xl border border-[#1d3d32] bg-[#091413] px-4 py-3 font-mono text-sm text-[#d8fff1]"
            >
              {example}
            </pre>
          ))}
        </div>
      </section>
    </div>
  );
}
