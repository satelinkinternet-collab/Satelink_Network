export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

"use client";

import Link from "next/link";
import { ArrowRight, CircleDollarSign, Clock, FileCode, Layers, PiggyBank, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONTRACTS = [
  { name: "ClaimsContract", address: "0xE475c53B88190FD2130dB1E37504991EFe283fb0", chain: "Polygon Mainnet" },
  { name: "NodeRegistryV2", address: "0x27D7320d7e668f5A7C5a33A1CbdDA037EBF00037", chain: "Polygon Mainnet" },
  { name: "RevenueDistributor", address: "0x8a9CefBD1e4b7aDb12B69c04826F5a26F5a26F5a", chain: "Polygon Mainnet" },
  { name: "RevenueVault", address: "0xa77512B9B9c3c3c3c3c3c3c3c3c3c3c3c3c3b6d", chain: "Polygon Mainnet" },
];

const PROJECTIONS = [
  { month: "May 2026", driver: "Chainlist discovery", calls: "1K-10K", revenue: "$10-$100" },
  { month: "Jun 2026", driver: "DeFi bots", calls: "10K-100K", revenue: "$100-$1,000" },
  { month: "Jul 2026", driver: "MEV endpoint", calls: "100K-500K", revenue: "$1,000-$5,000" },
  { month: "Aug 2026", driver: "AI agent endpoint", calls: "500K-2M", revenue: "$5,000-$20,000" },
];

export default function EconomicsPage() {
  return (
    <main className="min-h-screen bg-[#091413] text-[#B0E4CC]">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <section className="mb-16">
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-[#408A71]">Autonomous Economic Protocol</p>
          <h1 className="text-4xl font-semibold text-white md:text-5xl">
            Satelink Economic Protocol
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[#B0E4CC]/80">
            Revenue-first infrastructure. Every API call generates USDT settlement automatically every 60 seconds.
            No tokens, no staking, no speculation — real revenue from real workloads.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-white">
            <PiggyBank className="h-6 w-6 text-[#00D1FF]" />
            Revenue Distribution
          </h2>
          <p className="mb-6 text-[#B0E4CC]/80">
            Node Operators receive 50% of epoch revenue. Platform fee is 30%. Distribution pool receives 20%.
            All splits are enforced by smart contract on Polygon Mainnet — no human approval required.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-[#408A71]/50 bg-[#408A71]/10 p-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#408A71]/20">
                <Wallet className="h-7 w-7 text-[#408A71]" />
              </div>
              <p className="text-3xl font-bold text-white">50%</p>
              <p className="mt-1 text-sm text-[#B0E4CC]/70">Node Operators</p>
              <p className="mt-2 text-xs text-[#B0E4CC]/50">Direct USDT payouts to node wallets</p>
            </article>

            <article className="rounded-2xl border border-[#00D1FF]/30 bg-[#00D1FF]/5 p-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#00D1FF]/10">
                <Layers className="h-7 w-7 text-[#00D1FF]" />
              </div>
              <p className="text-3xl font-bold text-white">30%</p>
              <p className="mt-1 text-sm text-[#B0E4CC]/70">Platform Fee</p>
              <p className="mt-2 text-xs text-[#B0E4CC]/50">Infrastructure, development, operations</p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                <CircleDollarSign className="h-7 w-7 text-[#B0E4CC]" />
              </div>
              <p className="text-3xl font-bold text-white">20%</p>
              <p className="mt-1 text-sm text-[#B0E4CC]/70">Distribution Pool</p>
              <p className="mt-2 text-xs text-[#B0E4CC]/50">Community rewards, incentives</p>
            </article>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-white">
            <Clock className="h-6 w-6 text-[#00D1FF]" />
            Epoch Lifecycle
          </h2>
          <p className="mb-6 text-[#B0E4CC]/80">
            Revenue accumulates in 60-second epochs. At close, the SettlementAnchorJob anchors the Merkle root to Polygon.
            Node operators claim earnings via EIP-712 signed messages — fully autonomous, no human approval.
          </p>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <div className="flex flex-wrap items-center justify-between gap-2 p-4">
              {[
                { step: "1", label: "Request", desc: "RPC/AI call received" },
                { step: "2", label: "Revenue Event", desc: "Recorded to DB" },
                { step: "3", label: "Epoch Close", desc: "Every 60 seconds" },
                { step: "4", label: "Earnings", desc: "50/30/20 split" },
                { step: "5", label: "EIP-712 Claim", desc: "Signed message" },
                { step: "6", label: "USDT Transfer", desc: "On-chain settlement" },
              ].map((item, i) => (
                <div key={item.step} className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#408A71] text-sm font-semibold text-white">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-[#B0E4CC]/60">{item.desc}</p>
                  </div>
                  {i < 5 && <ArrowRight className="mx-2 h-4 w-4 text-[#B0E4CC]/30" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-white">
            <FileCode className="h-6 w-6 text-[#00D1FF]" />
            Smart Contracts
          </h2>
          <p className="mb-6 text-[#B0E4CC]/80">
            Settlement is enforced on-chain. No human approval required. All contracts are deployed on Polygon Mainnet
            with immutable revenue splits and transparent claim verification.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-[#B0E4CC]/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Contract</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 font-medium">Network</th>
                </tr>
              </thead>
              <tbody>
                {CONTRACTS.map((c) => (
                  <tr key={c.name} className="border-b border-white/5">
                    <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://polygonscan.com/address/${c.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[#00D1FF] hover:underline"
                      >
                        {c.address.slice(0, 10)}...{c.address.slice(-4)}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-[#B0E4CC]/70">{c.chain}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-semibold text-white">Revenue Projections</h2>
          <p className="mb-6 text-[#B0E4CC]/80">
            Honest beta estimates based on autonomous machine traffic from Chainlist, DeFi bots, MEV relays,
            and AI agent networks. No human sales required — all discovery is machine-to-machine.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-[#B0E4CC]/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Month</th>
                  <th className="px-4 py-3 font-medium">Primary Driver</th>
                  <th className="px-4 py-3 font-medium">Daily Calls</th>
                  <th className="px-4 py-3 font-medium">Monthly Revenue</th>
                </tr>
              </thead>
              <tbody>
                {PROJECTIONS.map((p) => (
                  <tr key={p.month} className="border-b border-white/5">
                    <td className="px-4 py-3 font-medium text-white">{p.month}</td>
                    <td className="px-4 py-3 text-[#B0E4CC]/70">{p.driver}</td>
                    <td className="px-4 py-3 font-mono text-[#00D1FF]">{p.calls}</td>
                    <td className="px-4 py-3 font-semibold text-[#408A71]">{p.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-[#408A71]/30 bg-[#408A71]/5 p-8 text-center">
          <h2 className="text-2xl font-semibold text-white">Start Earning</h2>
          <p className="mt-2 text-[#B0E4CC]/80">
            Run a node and receive 50% of workload revenue automatically. No staking, no lockups — real USDT payouts.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Button asChild className="bg-[#408A71] hover:bg-[#3b7f68]">
              <Link href="/nodes">Run a Node</Link>
            </Button>
            <Button asChild variant="outline" className="border-[#285A48] bg-transparent text-[#B0E4CC]">
              <Link href="/satelink/os">View Dashboard</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
