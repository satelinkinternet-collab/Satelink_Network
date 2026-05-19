import { Navigation } from "@/components/marketing/Navigation";
import { Footer } from "@/components/marketing/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers | Satelink Network",
  description: "Join Satelink and build decentralized infrastructure for the machine economy. Remote-first, async culture.",
};

const POSITIONS = [
  {
    title: "Senior Backend Engineer",
    type: "Full-time",
    location: "Remote",
    description: "Build the core infrastructure powering our DePIN network. Node.js, PostgreSQL, Redis experience required.",
  },
  {
    title: "Smart Contract Developer",
    type: "Full-time",
    location: "Remote",
    description: "Design and audit settlement contracts on Polygon. Solidity, Foundry, and security experience required.",
  },
  {
    title: "Developer Relations",
    type: "Full-time",
    location: "Remote",
    description: "Help developers integrate Satelink. Create docs, tutorials, and SDKs. Strong writing skills required.",
  },
  {
    title: "Community Manager",
    type: "Part-time",
    location: "Remote",
    description: "Grow our Discord and Twitter communities. Node operator support and engagement.",
  },
];

const VALUES = [
  { icon: "🌍", title: "Remote-First", description: "Work from anywhere. Async communication. Results over hours." },
  { icon: "🔓", title: "Open Source", description: "Our code is public. Transparency in everything we do." },
  { icon: "💰", title: "Equity + Tokens", description: "Competitive pay plus protocol token allocation." },
  { icon: "🚀", title: "Ship Fast", description: "Small team, big impact. Your work goes live within days." },
];

export default function CareersPage() {
  return (
    <>
      <Navigation />
      <main className="pt-14 min-h-screen" style={{ background: "var(--bg-page)" }}>
        <section className="py-20 text-center border-b" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}>
          <div className="max-w-3xl mx-auto px-6">
            <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
              Build the Future of Infrastructure
            </h1>
            <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
              Join a small team building decentralized infrastructure for AI agents, DeFi bots, and the machine economy.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: "var(--text-primary)" }}>
              Why Satelink?
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {VALUES.map((value) => (
                <div
                  key={value.title}
                  className="p-6 rounded-xl border"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
                >
                  <div className="text-3xl mb-4">{value.icon}</div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                    {value.title}
                  </h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16" style={{ background: "var(--bg-card)" }}>
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: "var(--text-primary)" }}>
              Open Positions
            </h2>
            <div className="space-y-4">
              {POSITIONS.map((position) => (
                <div
                  key={position.title}
                  className="p-6 rounded-xl border transition-colors hover:border-[var(--brand-primary)]"
                  style={{ background: "var(--bg-page)", borderColor: "var(--border-subtle)" }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                        {position.title}
                      </h3>
                      <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
                        {position.description}
                      </p>
                      <div className="flex gap-3">
                        <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}>
                          {position.type}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}>
                          {position.location}
                        </span>
                      </div>
                    </div>
                    <a
                      href="mailto:satelinknetwork@gmail.com?subject=Application: {position.title}"
                      className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      style={{ background: "var(--brand-primary)", color: "white" }}
                    >
                      Apply
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 text-center">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Don't See Your Role?
            </h2>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
              We're always looking for talented people. Send us your profile and tell us what you'd bring to Satelink.
            </p>
            <a
              href="mailto:satelinknetwork@gmail.com?subject=General Application"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors"
              style={{ background: "var(--brand-primary)", color: "white" }}
            >
              Get in Touch
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
