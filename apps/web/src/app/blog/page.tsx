import { Navigation } from "@/components/marketing/Navigation";
import { Footer } from "@/components/marketing/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | Satelink Network",
  description: "Updates, insights, and announcements from the Satelink team.",
};

const POSTS = [
  {
    title: "Introducing Satelink: Decentralized Infrastructure for Machine Economies",
    date: "May 15, 2026",
    category: "Announcement",
    excerpt: "Today we're publicly launching Satelink, a DePIN network that lets machines pay machines with humans earning from the hardware they contribute.",
    slug: "introducing-satelink",
  },
  {
    title: "How Our RPC Gateway Achieves 99.9% Uptime",
    date: "May 10, 2026",
    category: "Engineering",
    excerpt: "A deep dive into our multi-provider routing strategy, automatic failover, and intelligent caching that keeps Satelink reliable.",
    slug: "rpc-gateway-reliability",
  },
  {
    title: "The Economics of Node Operation",
    date: "May 5, 2026",
    category: "Economics",
    excerpt: "Breaking down the 50/30/20 revenue split, expected earnings, and why running a Satelink node makes financial sense.",
    slug: "node-economics",
  },
  {
    title: "First On-Chain Settlement: $1.29 USDT",
    date: "April 28, 2026",
    category: "Milestone",
    excerpt: "We just completed our first real on-chain settlement on Polygon mainnet. Here's what it means for the network.",
    slug: "first-settlement",
  },
  {
    title: "Why We Chose Polygon for Settlement",
    date: "April 20, 2026",
    category: "Technical",
    excerpt: "Low fees, fast finality, and a thriving DeFi ecosystem. Here's why Polygon is the right home for Satelink settlements.",
    slug: "why-polygon",
  },
];

export default function BlogPage() {
  return (
    <>
      <Navigation />
      <main className="pt-14 min-h-screen" style={{ background: "var(--bg-page)" }}>
        <section className="py-20 text-center border-b" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}>
          <div className="max-w-3xl mx-auto px-6">
            <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
              Blog
            </h1>
            <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
              Updates, insights, and announcements from the Satelink team.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-4xl mx-auto px-6">
            <div className="space-y-8">
              {POSTS.map((post) => (
                <article
                  key={post.slug}
                  className="p-6 rounded-xl border transition-colors hover:border-[var(--brand-primary)]"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ background: "rgba(64, 138, 113, 0.1)", color: "var(--brand-primary)" }}
                    >
                      {post.category}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {post.date}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                    {post.title}
                  </h2>
                  <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
                    {post.excerpt}
                  </p>
                  <span
                    className="text-sm font-medium cursor-pointer"
                    style={{ color: "var(--brand-primary)" }}
                  >
                    Read more →
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 text-center" style={{ background: "var(--bg-card)" }}>
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Subscribe to Updates
            </h2>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
              Get the latest news from Satelink delivered to your inbox. No spam, unsubscribe anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <input
                type="email"
                placeholder="your@email.com"
                className="px-4 py-3 rounded-lg text-sm flex-1 max-w-xs"
                style={{
                  background: "var(--bg-page)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                className="px-6 py-3 rounded-lg font-medium"
                style={{ background: "var(--brand-primary)", color: "white" }}
              >
                Subscribe
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
