import { Navigation } from "@/components/marketing/Navigation";
import { Footer } from "@/components/marketing/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Press | Satelink Network",
  description: "Press resources, brand assets, and media inquiries for Satelink Network.",
};

const PRESS_RELEASES = [
  {
    title: "Satelink Announces Public Beta Launch",
    date: "May 15, 2026",
    excerpt: "Decentralized infrastructure network opens to public beta with USDT settlement on Polygon.",
  },
  {
    title: "Satelink Completes First On-Chain Settlement",
    date: "April 28, 2026",
    excerpt: "First automated USDT payment to node operators marks protocol milestone.",
  },
];

const STATS = [
  { label: "API Calls Processed", value: "1.7M+" },
  { label: "USDT Distributed", value: "$53+" },
  { label: "Active Nodes", value: "5+" },
  { label: "Chains Supported", value: "5" },
];

export default function PressPage() {
  return (
    <>
      <Navigation />
      <main className="pt-14 min-h-screen" style={{ background: "var(--bg-page)" }}>
        <section className="py-20 text-center border-b" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}>
          <div className="max-w-3xl mx-auto px-6">
            <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
              Press & Media
            </h1>
            <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
              Resources for journalists, analysts, and content creators covering Satelink.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-8" style={{ color: "var(--text-primary)" }}>
              Key Metrics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="p-6 rounded-xl border text-center"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
                >
                  <div className="text-3xl font-bold mb-2" style={{ color: "var(--brand-primary)" }}>
                    {stat.value}
                  </div>
                  <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <h2 className="text-2xl font-bold mb-8" style={{ color: "var(--text-primary)" }}>
              Press Releases
            </h2>
            <div className="space-y-4 mb-16">
              {PRESS_RELEASES.map((release) => (
                <div
                  key={release.title}
                  className="p-6 rounded-xl border"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
                >
                  <div className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                    {release.date}
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                    {release.title}
                  </h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {release.excerpt}
                  </p>
                </div>
              ))}
            </div>

            <h2 className="text-2xl font-bold mb-8" style={{ color: "var(--text-primary)" }}>
              Brand Assets
            </h2>
            <div
              className="p-8 rounded-xl border"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
            >
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                    Logo
                  </h3>
                  <div
                    className="p-8 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: "var(--bg-page)" }}
                  >
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold"
                      style={{ background: "linear-gradient(135deg, #5CB89A, #408A71)", color: "white" }}
                    >
                      S
                    </div>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Use on dark backgrounds. Maintain clear space around the logo.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                    Brand Colors
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded" style={{ background: "#408A71" }} />
                      <div>
                        <div className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>#408A71</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>Primary Green</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded" style={{ background: "#5CB89A" }} />
                      <div>
                        <div className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>#5CB89A</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>Accent Green</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded" style={{ background: "#00D1FF" }} />
                      <div>
                        <div className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>#00D1FF</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>Signal Cyan</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 text-center" style={{ background: "var(--bg-card)" }}>
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Media Inquiries
            </h2>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
              For press inquiries, interviews, or additional assets, please contact us.
            </p>
            <a
              href="mailto:press@satelink.network"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium"
              style={{ background: "var(--brand-primary)", color: "white" }}
            >
              press@satelink.network
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
