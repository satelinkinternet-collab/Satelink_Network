import Link from "next/link";
import { Navigation } from "@/components/marketing/Navigation";
import { Footer } from "@/components/marketing/Footer";

const ROADMAP = [
  { stage: "S0", name: "Security Foundation", status: "complete", description: "Smart contracts, security gates, branch governance" },
  { stage: "S1", name: "RPC Gateway", status: "complete", description: "Multi-provider routing, caching, rate limiting, WebSocket" },
  { stage: "S2", name: "Node Onboarding", status: "current", description: "Self-service node registration, reputation system" },
  { stage: "S3", name: "Settlement", status: "upcoming", description: "On-chain USDT settlement, claims contract" },
  { stage: "S4", name: "AI Workloads", status: "upcoming", description: "Inference routing, GPU node support" },
  { stage: "S5", name: "Automation", status: "upcoming", description: "Webhook triggers, scheduled jobs" },
  { stage: "S6", name: "Bandwidth", status: "upcoming", description: "Proxy nodes, bandwidth marketplace" },
  { stage: "S7", name: "Governance", status: "upcoming", description: "DAO, proposal voting, treasury management" },
  { stage: "S8", name: "SDK & Tools", status: "upcoming", description: "Official SDKs, CLI tools, integrations" },
  { stage: "S9", name: "Mainnet", status: "upcoming", description: "Full production launch" },
];

export default function AboutPage() {
  return (
    <>
      <Navigation />
      <main className="pt-24">
        {/* Hero */}
        <section className="py-16 text-center">
          <div className="container-marketing">
            <h1 className="heading-xl mb-6">
              Building the infrastructure for{" "}
              <span className="text-gradient">machine economies</span>
            </h1>
            <p className="text-body-lg max-w-2xl mx-auto">
              Satelink is decentralized infrastructure that lets machines pay machines,
              with humans earning from the hardware they contribute.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16 bg-[var(--bg-card)]/30">
          <div className="container-marketing">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="heading-lg mb-6">Our Mission</h2>
              <p className="text-body-lg mb-8">
                We believe the future economy will be dominated by autonomous systems—AI agents,
                DeFi bots, and automated workflows—that need reliable infrastructure to operate.
              </p>
              <p className="text-body">
                Satelink provides that infrastructure: decentralized, pay-per-use, and owned by
                the people who run it. No venture capital gatekeepers. No centralized points of failure.
                Just machines serving machines, with transparent economics.
              </p>
            </div>
          </div>
        </section>

        {/* Why DePIN */}
        <section className="py-16">
          <div className="container-marketing">
            <h2 className="heading-lg mb-12 text-center">Why DePIN Infrastructure?</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="glass-card p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 flex items-center justify-center mx-auto mb-4">
                  <DecentralizedIcon />
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">No Single Point of Failure</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  18+ providers across 5 chains. If one goes down, traffic routes automatically.
                </p>
              </div>
              <div className="glass-card p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/20 flex items-center justify-center mx-auto mb-4">
                  <EconomicsIcon />
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">Fair Economics</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  50% of revenue goes directly to node operators. No middlemen taking 80%.
                </p>
              </div>
              <div className="glass-card p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[var(--brand-secondary)]/10 border border-[var(--brand-secondary)]/20 flex items-center justify-center mx-auto mb-4">
                  <TransparencyIcon />
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">On-Chain Transparency</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  All settlements anchored to Polygon. Verify earnings on-chain anytime.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Economic Model */}
        <section className="py-16 bg-[var(--bg-card)]/30">
          <div className="container-marketing">
            <h2 className="heading-lg mb-12 text-center">Economic Model</h2>
            <div className="max-w-3xl mx-auto glass-card p-8">
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-[var(--brand-accent)]/10 border-4 border-[var(--brand-accent)] flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-[var(--brand-accent)]">50%</span>
                  </div>
                  <div className="font-semibold text-[var(--text-primary)]">Node Operators</div>
                  <div className="text-sm text-[var(--text-muted)]">Direct to hardware owners</div>
                </div>
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-[var(--brand-secondary)]/10 border-4 border-[var(--brand-secondary)] flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-[var(--brand-secondary)]">30%</span>
                  </div>
                  <div className="font-semibold text-[var(--text-primary)]">Platform</div>
                  <div className="text-sm text-[var(--text-muted)]">Development & operations</div>
                </div>
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-[var(--brand-primary)]/10 border-4 border-[var(--brand-primary)] flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-[var(--brand-primary)]">20%</span>
                  </div>
                  <div className="font-semibold text-[var(--text-primary)]">Distribution Pool</div>
                  <div className="text-sm text-[var(--text-muted)]">Community incentives</div>
                </div>
              </div>
              <p className="text-center text-sm text-[var(--text-secondary)]">
                All payments settled in USDT on Polygon Network. Minimum claim: 1 USDT.
              </p>
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section className="py-16">
          <div className="container-marketing">
            <h2 className="heading-lg mb-12 text-center">Roadmap</h2>
            <div className="max-w-3xl mx-auto">
              <div className="space-y-4">
                {ROADMAP.map((item) => (
                  <div
                    key={item.stage}
                    className={`glass-card p-4 flex items-center gap-4 ${
                      item.status === "current" ? "border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]" : ""
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        item.status === "complete"
                          ? "bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]"
                          : item.status === "current"
                          ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                          : "bg-[var(--bg-surface)] text-[var(--text-muted)]"
                      }`}
                    >
                      <span className="font-bold">{item.stage}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--text-primary)]">{item.name}</span>
                        {item.status === "complete" && (
                          <span className="px-2 py-0.5 rounded-full bg-[var(--brand-accent)]/10 text-[var(--brand-accent)] text-xs">
                            Complete
                          </span>
                        )}
                        {item.status === "current" && (
                          <span className="px-2 py-0.5 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs animate-pulse">
                            In Progress
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-16 bg-[var(--bg-card)]/30">
          <div className="container-marketing text-center">
            <h2 className="heading-lg mb-4">Get in Touch</h2>
            <p className="text-body mb-8">
              Questions, partnerships, or just want to say hi?
            </p>
            <a
              href="mailto:satelinknetwork@gmail.com"
              className="btn-glow inline-flex"
            >
              satelinknetwork@gmail.com
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function DecentralizedIcon() {
  return (
    <svg className="w-7 h-7 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function EconomicsIcon() {
  return (
    <svg className="w-7 h-7 text-[var(--brand-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TransparencyIcon() {
  return (
    <svg className="w-7 h-7 text-[var(--brand-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
