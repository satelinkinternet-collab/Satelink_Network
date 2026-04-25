"use client";

import Link from "next/link";

export function NodeOperatorTeaser() {
  return (
    <section id="nodes" className="py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0, 255, 148, 0.08) 0%, transparent 60%)",
        }}
      />

      <div className="container-marketing relative z-10">
        <div className="glass-card p-12 lg:p-16 text-center relative overflow-hidden">
          {/* Animated border */}
          <div className="absolute inset-0 rounded-2xl border border-[var(--brand-accent)]/20 animate-pulse-glow" />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/20 mb-8">
            <ServerIcon />
            <span className="text-[var(--brand-accent)] text-sm font-medium">
              Node Operators
            </span>
          </div>

          <h2 className="heading-lg mb-6">
            Turn idle hardware into{" "}
            <span className="text-[var(--brand-accent)]">passive USDT income</span>
          </h2>

          <p className="text-body-lg max-w-2xl mx-auto mb-12">
            Run a Satelink node and earn a share of every RPC request you process.
            Automatic settlement in USDT on Polygon Network.
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
            <StatItem
              value="50%"
              label="Revenue Share"
              sublabel="Operators keep half"
              accent
            />
            <StatItem
              value="1 USDT"
              label="Min Claim"
              sublabel="Low withdrawal threshold"
            />
            <StatItem
              value="Polygon"
              label="Settlement"
              sublabel="Fast, low-fee transfers"
            />
          </div>

          {/* Earnings preview */}
          <div className="bg-[var(--bg-surface)]/50 rounded-xl p-6 mb-10 max-w-xl mx-auto border border-[var(--border-subtle)]">
            <div className="text-sm text-[var(--text-muted)] mb-2">
              Example: 100K requests/day
            </div>
            <div className="flex items-baseline justify-center gap-2">
              <span
                className="text-4xl font-bold text-[var(--brand-accent)]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                $45
              </span>
              <span className="text-[var(--text-secondary)]">USDT/month</span>
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-2">
              (100,000 × $0.00003 × 0.50 × 30 days)
            </div>
          </div>

          <Link href="/nodes" className="btn-glow inline-flex">
            Calculate Your Earnings
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}

function StatItem({
  value,
  label,
  sublabel,
  accent,
}: {
  value: string;
  label: string;
  sublabel: string;
  accent?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`text-3xl font-bold mb-1 ${
          accent ? "text-[var(--brand-accent)]" : "text-[var(--text-primary)]"
        }`}
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value}
      </div>
      <div className="text-sm font-medium text-[var(--text-primary)]">{label}</div>
      <div className="text-xs text-[var(--text-muted)]">{sublabel}</div>
    </div>
  );
}

function ServerIcon() {
  return (
    <svg
      className="w-4 h-4 text-[var(--brand-accent)]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      className="w-4 h-4 ml-2"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}
