"use client";

import { AlertTriangle, CheckCircle, Key, Lock, Server, Shield, ShieldCheck, Wallet } from "lucide-react";

const SECURITY_FEATURES = [
  {
    icon: Key,
    title: "API Security",
    description: "All API endpoints are protected with industry-standard security measures.",
    items: [
      "JWT authentication with 24-hour token expiry",
      "API key tiers with configurable rate limits",
      "Per-key request quotas (1K-1M requests/day)",
      "IP-based rate limiting for abuse prevention",
      "Request signing for sensitive operations",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Revenue Integrity",
    description: "Every revenue event is validated and auditable on-chain.",
    items: [
      "is_test_data filter prevents test traffic from affecting real revenue",
      "Epoch validation ensures accurate revenue aggregation",
      "Immutable revenue_events_v2 table with audit trail",
      "Merkle root anchoring for settlement proof",
      "Real-time revenue monitoring via Revenue Sentinel",
    ],
  },
  {
    icon: Lock,
    title: "Smart Contract Security",
    description: "Settlement contracts follow Ethereum security best practices.",
    items: [
      "EIP-712 typed data signing for claim verification",
      "Nonce-based replay protection on all claims",
      "OpenZeppelin ReentrancyGuard on all payable functions",
      "AccessControl for admin operations",
      "Timelock on critical parameter changes",
    ],
  },
  {
    icon: Server,
    title: "Node Reputation",
    description: "Multi-dimensional scoring system prevents bad actors from earning rewards.",
    items: [
      "Uptime monitoring with heartbeat verification",
      "Latency scoring based on execution performance",
      "Fraud detection with automatic reputation penalties",
      "Geographic validation for declared regions",
      "Workload verification to prevent fake execution",
    ],
  },
  {
    icon: Wallet,
    title: "Settlement Integrity",
    description: "On-chain settlement provides transparent, auditable payouts.",
    items: [
      "All settlements recorded on Polygon Mainnet",
      "Merkle proofs for batch settlement verification",
      "Public audit trail via Polygonscan",
      "Automated settlement anchor jobs",
      "Multi-signature treasury for platform funds",
    ],
  },
];

const CERTIFICATIONS = [
  { name: "SOC 2 Type I", status: "In Progress", note: "Targeting Q3 2026" },
  { name: "GDPR Compliant", status: "Complete", note: "Privacy-first design" },
  { name: "No Wallet Logging", status: "Complete", note: "Zero address retention" },
  { name: "No IP Logging", status: "Complete", note: "Privacy by default" },
];

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-[#091413] text-[#B0E4CC]">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <section className="mb-16">
          <div className="mb-6 flex items-center gap-3">
            <Shield className="h-10 w-10 text-[#00D1FF]" />
            <p className="text-sm uppercase tracking-[0.2em] text-[#408A71]">Security</p>
          </div>
          <h1 className="text-4xl font-semibold text-white md:text-5xl">
            Infrastructure Security
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[#B0E4CC]/80">
            Satelink is built with security-first principles. Every layer of the protocol — from API
            authentication to on-chain settlement — is designed to protect infrastructure integrity
            and user privacy.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="mb-8 text-2xl font-semibold text-white">Security Architecture</h2>
          <div className="space-y-6">
            {SECURITY_FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-black/20 p-6"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#408A71]/20">
                    <feature.icon className="h-5 w-5 text-[#00D1FF]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                    <p className="text-sm text-[#B0E4CC]/60">{feature.description}</p>
                  </div>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {feature.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[#B0E4CC]/80">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#408A71]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-semibold text-white">Compliance & Certifications</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {CERTIFICATIONS.map((cert) => (
              <article
                key={cert.name}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-center gap-3">
                  {cert.status === "Complete" ? (
                    <CheckCircle className="h-5 w-5 text-[#408A71]" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                  <div>
                    <p className="font-medium text-white">{cert.name}</p>
                    <p className="text-xs text-[#B0E4CC]/60">{cert.note}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    cert.status === "Complete"
                      ? "bg-[#408A71]/20 text-[#408A71]"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {cert.status}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-semibold text-white">Vulnerability Disclosure</h2>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
            <p className="mb-4 text-[#B0E4CC]/80">
              We take security seriously. If you discover a vulnerability in Satelink infrastructure,
              please report it responsibly.
            </p>
            <div className="rounded-xl bg-[#0d1716] p-4">
              <p className="text-sm text-[#B0E4CC]/60">Contact for security issues:</p>
              <p className="mt-1 font-mono text-[#00D1FF]">security@satelink.network</p>
            </div>
            <p className="mt-4 text-sm text-[#B0E4CC]/60">
              We aim to respond to all security reports within 24 hours and work with researchers
              to coordinate responsible disclosure.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-[#00D1FF]/20 bg-[#00D1FF]/5 p-8">
          <div className="flex items-start gap-4">
            <Shield className="h-8 w-8 shrink-0 text-[#00D1FF]" />
            <div>
              <h3 className="text-xl font-semibold text-white">Security by Design</h3>
              <p className="mt-2 text-[#B0E4CC]/80">
                Satelink was built from the ground up with security as a core principle, not an afterthought.
                Our decentralized architecture means there is no single point of failure, and on-chain
                settlement provides transparent, auditable revenue distribution.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
