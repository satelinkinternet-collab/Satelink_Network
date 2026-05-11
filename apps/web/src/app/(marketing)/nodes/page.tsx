"use client";

import { useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/marketing/Navigation";
import { Footer } from "@/components/marketing/Footer";

const HARDWARE_REQUIREMENTS = [
  { spec: "CPU", minimum: "2 cores", recommended: "4+ cores" },
  { spec: "RAM", minimum: "4 GB", recommended: "8+ GB" },
  { spec: "Storage", minimum: "50 GB SSD", recommended: "100+ GB NVMe" },
  { spec: "Network", minimum: "100 Mbps", recommended: "1 Gbps" },
  { spec: "Uptime", minimum: "95%", recommended: "99%+" },
];

const SETUP_STEPS = [
  {
    step: 1,
    title: "Install Docker",
    description: "Docker is required to run the Satelink node container.",
    code: "curl -fsSL https://get.docker.com | sh",
  },
  {
    step: 2,
    title: "Pull Node Image",
    description: "Download the latest Satelink node image from Docker Hub.",
    code: "docker pull satelink/node:latest",
  },
  {
    step: 3,
    title: "Configure Environment",
    description: "Set your wallet address for USDT payouts.",
    code: 'export WALLET_ADDRESS="0x..."',
  },
  {
    step: 4,
    title: "Start Node",
    description: "Run the node container with your configuration.",
    code: `docker run -d \\
  --name satelink-node \\
  -e WALLET_ADDRESS=$WALLET_ADDRESS \\
  -e RPC_ENDPOINT=http://localhost:8545 \\
  -p 8080:8080 \\
  satelink/node:latest`,
  },
  {
    step: 5,
    title: "Register Node",
    description: "Complete registration in the dashboard to start earning.",
    code: "# Visit https://satelink.network/dashboard/node-setup",
  },
];

const FAQ_ITEMS = [
  {
    question: "What chains does Satelink support?",
    answer:
      "Polygon Mainnet (chain 137) is our primary network. Ethereum and Arbitrum support is coming in Stage S3.",
  },
  {
    question: "Is Satelink production ready?",
    answer:
      "Satelink is currently in public beta. The RPC gateway, epoch settlement, and claim infrastructure are live. Use in production at your own discretion.",
  },
  {
    question: "How does revenue settlement work?",
    answer:
      "Revenue from RPC calls is recorded per epoch (60s windows). Node operators earn 50% of epoch revenue, claimable as USDT on Polygon after the epoch closes. Claims are processed via ClaimsContract at 0xE475c53B88190FD2130dB1E37504991EFe283fb0.",
  },
  {
    question: "How do I start as a node operator?",
    answer:
      "Register at satelink.network/node/setup. The node agent connects your infrastructure to the Satelink network.",
  },
  {
    question: "Is there a free tier?",
    answer:
      "Yes. The public RPC endpoint at rpc.satelink.network/rpc/polygon is free up to 1,000 requests/day with no API key required.",
  },
];

export default function NodesPage() {
  const [dailyRequests, setDailyRequests] = useState(100000);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const costPerRequest = 0.00003;
  const operatorShare = 0.50;
  const dailyEarnings = dailyRequests * costPerRequest * operatorShare;
  const monthlyEarnings = dailyEarnings * 30;

  return (
    <>
      <Navigation />
      <main className="pt-24">
        {/* Hero */}
        <section className="py-16 text-center">
          <div className="container-marketing">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/20 mb-6">
              <span className="text-[var(--brand-accent)] text-sm font-medium">
                Node Operators
              </span>
            </div>
            <h1 className="heading-xl mb-6">
              Earn <span className="text-[var(--brand-accent)]">USDT</span> running
              infrastructure
            </h1>
            <p className="text-body-lg max-w-2xl mx-auto">
              Turn your hardware into a revenue stream. Process RPC requests and earn
              50% of every transaction your node handles.
            </p>
          </div>
        </section>

        {/* Earnings Calculator */}
        <section id="calculator" className="py-16 bg-[var(--bg-card)]/30">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">Earnings Calculator</h2>

            <div className="max-w-2xl mx-auto glass-card p-8">
              <div className="mb-8">
                <label className="block text-sm text-[var(--text-muted)] mb-2">
                  Daily Requests Processed
                </label>
                <input
                  type="range"
                  min="10000"
                  max="1000000"
                  step="10000"
                  value={dailyRequests}
                  onChange={(e) => setDailyRequests(Number(e.target.value))}
                  className="w-full h-2 bg-[var(--bg-surface)] rounded-lg appearance-none cursor-pointer accent-[var(--brand-accent)]"
                />
                <div className="flex justify-between mt-2 text-sm text-[var(--text-muted)]">
                  <span>10K</span>
                  <span className="text-[var(--brand-primary)] font-semibold">
                    {(dailyRequests / 1000).toFixed(0)}K requests/day
                  </span>
                  <span>1M</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="text-center p-4 bg-[var(--bg-surface)]/50 rounded-xl border border-[var(--border-subtle)]">
                  <div className="text-sm text-[var(--text-muted)] mb-1">Daily Earnings</div>
                  <div
                    className="text-2xl font-bold text-[var(--text-primary)]"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    ${dailyEarnings.toFixed(2)}
                  </div>
                </div>
                <div className="text-center p-4 bg-[var(--brand-accent)]/10 rounded-xl border border-[var(--brand-accent)]/20">
                  <div className="text-sm text-[var(--text-muted)] mb-1">Monthly Earnings</div>
                  <div
                    className="text-2xl font-bold text-[var(--brand-accent)]"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    ${monthlyEarnings.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-[var(--text-muted)]">
                <p>Formula: {dailyRequests.toLocaleString()} × $0.00003 × 50% × 30 days</p>
              </div>
            </div>
          </div>
        </section>

        {/* Revenue Split Diagram */}
        <section className="py-16">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">How Rewards Work</h2>

            <div className="max-w-3xl mx-auto">
              <div className="glass-card p-8">
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                  {/* Total */}
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-[var(--bg-surface)] border-2 border-[var(--brand-primary)] flex items-center justify-center mb-3 mx-auto">
                      <span className="text-xl font-bold text-[var(--brand-primary)]">100%</span>
                    </div>
                    <div className="text-sm text-[var(--text-muted)]">RPC Revenue</div>
                  </div>

                  <ArrowIcon />

                  {/* Split */}
                  <div className="flex gap-6">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-[var(--brand-accent)]/10 border-2 border-[var(--brand-accent)] flex items-center justify-center mb-3">
                        <span className="text-xl font-bold text-[var(--brand-accent)]">50%</span>
                      </div>
                      <div className="text-sm text-[var(--text-muted)]">Node Operators</div>
                    </div>
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-[var(--brand-secondary)]/10 border-2 border-[var(--brand-secondary)] flex items-center justify-center mb-3">
                        <span className="text-xl font-bold text-[var(--brand-secondary)]">30%</span>
                      </div>
                      <div className="text-sm text-[var(--text-muted)]">Platform</div>
                    </div>
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-[var(--brand-primary)]/10 border-2 border-[var(--brand-primary)] flex items-center justify-center mb-3">
                        <span className="text-xl font-bold text-[var(--brand-primary)]">20%</span>
                      </div>
                      <div className="text-sm text-[var(--text-muted)]">Distribution Pool</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Hardware Requirements */}
        <section className="py-16 bg-[var(--bg-card)]/30">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">Hardware Requirements</h2>

            <div className="overflow-x-auto">
              <table className="w-full max-w-3xl mx-auto">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[var(--text-primary)]">Specification</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[var(--text-primary)]">Minimum</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[var(--text-primary)]">Recommended</th>
                  </tr>
                </thead>
                <tbody>
                  {HARDWARE_REQUIREMENTS.map((req) => (
                    <tr key={req.spec} className="border-b border-[var(--border-subtle)]/50">
                      <td className="py-4 px-4 font-medium text-[var(--text-primary)]">{req.spec}</td>
                      <td className="py-4 px-4 text-[var(--text-secondary)]">{req.minimum}</td>
                      <td className="py-4 px-4 text-[var(--brand-accent)]">{req.recommended}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Setup Guide */}
        <section id="setup" className="py-16">
          <div className="container-marketing">
            <h2 className="heading-lg mb-12 text-center">Setup Guide</h2>

            <div className="max-w-3xl mx-auto space-y-6">
              {SETUP_STEPS.map((step) => (
                <div key={step.step} className="glass-card p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--brand-primary)] flex items-center justify-center shrink-0">
                      <span className="text-[var(--bg-deep)] font-bold">{step.step}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[var(--text-primary)] mb-1">{step.title}</h3>
                      <p className="text-sm text-[var(--text-secondary)] mb-3">{step.description}</p>
                      <div className="bg-[var(--bg-surface)] rounded-lg p-3 overflow-x-auto">
                        <code className="text-sm text-[var(--brand-primary)] whitespace-pre">{step.code}</code>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href="/dashboard/node-setup" className="btn-glow inline-flex">
                Register Your Node
              </Link>
            </div>
          </div>
        </section>

        {/* Smart Contracts */}
        <section className="py-16 bg-[var(--bg-card)]/30">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">Smart Contracts</h2>
            <p className="text-body text-center mb-8 max-w-2xl mx-auto">
              All Satelink contracts are deployed on Polygon Mainnet (Chain ID: 137).
            </p>

            <div className="max-w-3xl mx-auto space-y-4">
              <ContractCard
                name="ClaimsContract"
                address="0xE475c53B88190FD2130dB1E37504991EFe283fb0"
                description="Node operators claim USDT earnings from this contract. Minimum claim: 1 USDT."
              />
              <ContractCard
                name="NodeRegistryV2"
                address="0x27D7320d5786D5B4B4dE8aAAC6cf62338ADeC037"
                description="Stores registered node metadata, reputation scores, and status."
              />
              <ContractCard
                name="RevenueDistributor"
                address="0x8a9CefBD801574806a634aF179f538ABB5926F5a"
                description="Handles 50/30/20 split distribution at epoch close."
              />
              <ContractCard
                name="RevenueVault"
                address="0xa77512B9255D504B3fD450037f1448D4df6A1b6d"
                description="Holds accumulated USDT revenue before distribution."
              />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">Frequently Asked Questions</h2>

            <div className="max-w-3xl mx-auto space-y-3">
              {FAQ_ITEMS.map((faq, index) => (
                <div key={index} className="glass-card overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <span className="font-medium text-[var(--text-primary)]">{faq.question}</span>
                    <ChevronIcon expanded={expandedFaq === index} />
                  </button>
                  {expandedFaq === index && (
                    <div className="px-4 pb-4">
                      <p className="text-sm text-[var(--text-secondary)]">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function ContractCard({ name, address, description }: { name: string; address: string; description: string }) {
  return (
    <div className="glass-card p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">{name}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{description}</p>
        </div>
        <a
          href={`https://polygonscan.com/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-[var(--brand-primary)] hover:underline shrink-0"
        >
          {address.slice(0, 10)}...{address.slice(-8)}
        </a>
      </div>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg className="w-8 h-8 text-[var(--text-muted)] hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}
