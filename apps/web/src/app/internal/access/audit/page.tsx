import { machineAccessAuditExamples } from "@/lib/machine-access";

export default function InternalAccessAuditPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#17342a] bg-[#0b1714]/80 p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#5da88d]">Immutable Audit Architecture</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Every machine action becomes evidence</h2>
        <p className="mt-3 max-w-3xl text-sm text-[#8ecfb4]">
          Machine identity, token ID, scope, environment, project, status, IP metadata, and execution metadata are written into a
          chained audit stream so access can be reconstructed without trusting mutable runtime logs.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#17342a] bg-[#0b1714]/80">
        <div className="border-b border-[#17342a] px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#5da88d]">Sample Event Stream</p>
        </div>
        <div className="divide-y divide-[#17342a]">
          {machineAccessAuditExamples.map((entry) => (
            <article key={`${entry.action}-${entry.actor}`} className="grid gap-3 px-5 py-4 md:grid-cols-[1.15fr_0.75fr_0.55fr]">
              <div>
                <p className="font-mono text-sm text-white">{entry.action}</p>
                <p className="mt-1 text-sm text-[#8ecfb4]">{entry.note}</p>
              </div>
              <div className="text-sm text-[#8ecfb4]">
                <p>{entry.actor}</p>
                <p className="mt-1 text-[#5da88d]">{entry.project}</p>
              </div>
              <div className="flex items-start justify-between gap-3 text-sm md:block">
                <p className="text-[#d8fff1]">{entry.environment}</p>
                <span className="mt-1 inline-flex rounded-full border border-[#295845] px-2 py-1 text-[11px] text-[#8ecfb4]">
                  {entry.status}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {[
          "Token issuance, revoke, rotate, preview deploy, restart request, diagnostics, websocket session, and auth failure all create audit entries.",
          "Sensitive request metadata is redacted before persistence so the audit plane is useful without becoming a shadow secret store.",
          "Production write attempts can be observed even when blocked, preserving incident and approval visibility.",
        ].map((point) => (
          <article key={point} className="rounded-2xl border border-[#17342a] bg-[#0b1714]/80 p-5 text-sm text-[#8ecfb4]">
            {point}
          </article>
        ))}
      </section>
    </div>
  );
}
