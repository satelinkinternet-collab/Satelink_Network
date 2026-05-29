import { machineAccessScopes, machineAccessTokenBlueprints } from "@/lib/machine-access";

export default function InternalAccessTokensPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#17342a] bg-[#0b1714]/80 p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#5da88d]">Token Lifecycle</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Issue, scope, isolate, revoke, rotate</h2>
        <p className="mt-3 max-w-3xl text-sm text-[#8ecfb4]">
          Raw tokens are returned once, then only the salted hash, prefix, scope envelope, environment access, project access,
          rate limit, expiry, and audit trail remain in storage.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#17342a] bg-[#0b1714]/80">
        <div className="border-b border-[#17342a] px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#5da88d]">Blueprint Matrix</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#0d1d19] text-[#6eb69b]">
              <tr>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Scopes</th>
                <th className="px-5 py-3 font-medium">TTL</th>
                <th className="px-5 py-3 font-medium">Environment</th>
                <th className="px-5 py-3 font-medium">Rate Limit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#17342a]">
              {machineAccessTokenBlueprints.map((token) => (
                <tr key={token.type} className="align-top">
                  <td className="px-5 py-4 font-mono text-white">{token.type}</td>
                  <td className="px-5 py-4 text-[#8ecfb4]">{token.scopeProfile.join(", ")}</td>
                  <td className="px-5 py-4 text-[#8ecfb4]">{token.defaultTtl}</td>
                  <td className="px-5 py-4 text-[#8ecfb4]">{token.environments}</td>
                  <td className="px-5 py-4 text-[#8ecfb4]">{token.rateLimit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-2xl border border-[#17342a] bg-[#0b1714]/80 p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#5da88d]">Available Permissions</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {machineAccessScopes.map((scope) => (
              <span key={scope} className="rounded-full border border-[#295845] bg-[#091413] px-3 py-1.5 font-mono text-xs text-[#d8fff1]">
                {scope}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[#17342a] bg-[#0b1714]/80 p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#5da88d]">Admin UX Targets</p>
          <div className="mt-4 space-y-3 text-sm text-[#8ecfb4]">
            <div className="rounded-xl border border-[#1d3d32] bg-[#091413] p-4">Create token with scope, project, environment, TTL, and rate-limit controls.</div>
            <div className="rounded-xl border border-[#1d3d32] bg-[#091413] p-4">Rotate token with one-time secret disclosure and immediate predecessor revocation.</div>
            <div className="rounded-xl border border-[#1d3d32] bg-[#091413] p-4">Inspect last-used timestamp, audit history, project isolation, and future IP restrictions.</div>
          </div>
        </article>
      </section>
    </div>
  );
}
