import { Navigation } from "@/components/marketing/Navigation";
import { Footer } from "@/components/marketing/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare | Satelink vs Alternatives",
  description: "See how Satelink compares to Infura, Alchemy, QuickNode, and other RPC providers.",
};

const COMPARISON_DATA = [
  { feature: "Free Tier", satelink: "100 req/day", infura: "100K req/day", alchemy: "300M CU/mo", quicknode: "50 req/s" },
  { feature: "Price Per Call", satelink: "$0.00004", infura: "~$0.00002", alchemy: "~$0.00001", quicknode: "~$0.00003" },
  { feature: "Settlement", satelink: "USDT on Polygon", infura: "Credit Card", alchemy: "Credit Card", quicknode: "Credit Card" },
  { feature: "Node Revenue Share", satelink: "50%", infura: "0%", alchemy: "0%", quicknode: "0%" },
  { feature: "Decentralized", satelink: "Yes", infura: "No", alchemy: "No", quicknode: "No" },
  { feature: "Multi-Chain", satelink: "5 chains", infura: "20+ chains", alchemy: "30+ chains", quicknode: "25+ chains" },
  { feature: "WebSocket", satelink: "Coming Soon", infura: "Yes", alchemy: "Yes", quicknode: "Yes" },
  { feature: "AI Inference", satelink: "Yes", infura: "No", alchemy: "No", quicknode: "No" },
  { feature: "On-Chain Verification", satelink: "Yes", infura: "No", alchemy: "No", quicknode: "No" },
  { feature: "Self-Custody Payments", satelink: "Yes", infura: "No", alchemy: "No", quicknode: "No" },
];

const BENEFITS = [
  {
    title: "Earn While You Use",
    description: "Run a node and earn from the network traffic. Other providers take 100% of revenue.",
    icon: "💰",
  },
  {
    title: "Censorship Resistant",
    description: "No single company can block your access. Traffic routes through multiple independent nodes.",
    icon: "🛡️",
  },
  {
    title: "Crypto-Native Payments",
    description: "Pay with USDT on Polygon. No credit cards, no KYC for the free tier.",
    icon: "🔗",
  },
  {
    title: "Transparent Pricing",
    description: "Every call is metered on-chain. Verify exactly what you're paying for.",
    icon: "👁️",
  },
];

export default function ComparePage() {
  return (
    <>
      <Navigation />
      <main className="pt-14 min-h-screen" style={{ background: "var(--bg-page)" }}>
        <section className="py-20 text-center border-b" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}>
          <div className="max-w-3xl mx-auto px-6">
            <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
              Satelink vs. The Alternatives
            </h1>
            <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
              See how decentralized infrastructure compares to centralized providers.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: "var(--text-primary)" }}>
              Feature Comparison
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th className="text-left p-4 border-b" style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}>
                      Feature
                    </th>
                    <th className="text-center p-4 border-b" style={{ borderColor: "var(--border-subtle)", background: "rgba(64, 138, 113, 0.1)", color: "var(--brand-primary)" }}>
                      Satelink
                    </th>
                    <th className="text-center p-4 border-b" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
                      Infura
                    </th>
                    <th className="text-center p-4 border-b" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
                      Alchemy
                    </th>
                    <th className="text-center p-4 border-b" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
                      QuickNode
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_DATA.map((row, i) => (
                    <tr key={row.feature}>
                      <td className="p-4 border-b font-medium" style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}>
                        {row.feature}
                      </td>
                      <td className="p-4 border-b text-center font-mono text-sm" style={{ borderColor: "var(--border-subtle)", background: "rgba(64, 138, 113, 0.05)", color: "var(--text-primary)" }}>
                        {row.satelink === "Yes" ? "✓" : row.satelink === "No" ? "✗" : row.satelink}
                      </td>
                      <td className="p-4 border-b text-center font-mono text-sm" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
                        {row.infura === "Yes" ? "✓" : row.infura === "No" ? "✗" : row.infura}
                      </td>
                      <td className="p-4 border-b text-center font-mono text-sm" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
                        {row.alchemy === "Yes" ? "✓" : row.alchemy === "No" ? "✗" : row.alchemy}
                      </td>
                      <td className="p-4 border-b text-center font-mono text-sm" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
                        {row.quicknode === "Yes" ? "✓" : row.quicknode === "No" ? "✗" : row.quicknode}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="py-16" style={{ background: "var(--bg-card)" }}>
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: "var(--text-primary)" }}>
              Why Choose Satelink?
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {BENEFITS.map((benefit) => (
                <div
                  key={benefit.title}
                  className="p-6 rounded-xl border"
                  style={{ background: "var(--bg-page)", borderColor: "var(--border-subtle)" }}
                >
                  <div className="text-3xl mb-4">{benefit.icon}</div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                    {benefit.title}
                  </h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 text-center">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Ready to Try Decentralized Infrastructure?
            </h2>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
              Start with 100 free requests per day. No API key required.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-3 rounded-lg font-medium"
                style={{ background: "var(--brand-primary)", color: "white" }}
              >
                Get Started Free
              </Link>
              <Link
                href="/calculator"
                className="px-6 py-3 rounded-lg font-medium border"
                style={{ borderColor: "var(--brand-primary)", color: "var(--brand-primary)" }}
              >
                Calculate Earnings
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
