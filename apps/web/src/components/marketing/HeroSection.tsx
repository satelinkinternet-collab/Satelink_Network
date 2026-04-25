"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LiveStats {
  chains: number;
  cacheHitRate: string;
  uptime: string;
  revenue: string;
}

export function HeroSection() {
  const [stats, setStats] = useState<LiveStats>({
    chains: 5,
    cacheHitRate: "78.6%",
    uptime: "99.9%",
    revenue: "$0.00",
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("https://rpc.satelink.network/rpc/metrics", {
          next: { revalidate: 60 },
        });
        if (res.ok) {
          const data = await res.json();
          setStats({
            chains: Object.keys(data.chains || {}).length || 5,
            cacheHitRate: data.rpcGateway?.cacheStats?.hitRate || "78.6%",
            uptime: "99.9%",
            revenue: `$${parseFloat(data.revenue?.usdtToday || 0).toFixed(4)}`,
          });
        }
      } catch {
        // Use defaults
      }
    }
    fetchStats();
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "var(--gradient-hero)" }}
      />

      {/* Particle network - CSS only */}
      <ParticleNetwork />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(var(--brand-primary) 1px, transparent 1px),
                            linear-gradient(90deg, var(--brand-primary) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="container-marketing relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] mb-8 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-[var(--brand-accent)] animate-pulse" />
            <span className="text-sm text-[var(--text-secondary)]">
              Live on Polygon Mainnet
            </span>
          </div>

          {/* Headline */}
          <h1 className="heading-xl mb-6 animate-fade-in-up delay-100">
            The Infrastructure Layer for{" "}
            <span className="text-gradient">Autonomous Machine Economies</span>
          </h1>

          {/* Subheadline */}
          <p className="text-body-lg max-w-2xl mx-auto mb-10 animate-fade-in-up delay-200">
            Decentralized RPC. Real-time settlement. USDT rewards. Powered by
            distributed nodes across 5 chains.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up delay-300">
            <Link
              href="#developers"
              className="btn-glow text-base px-8 py-4 w-full sm:w-auto"
            >
              Start Building Free
            </Link>
            <Link
              href="#nodes"
              className="btn-outline text-base px-8 py-4 w-full sm:w-auto"
            >
              Earn as Node Operator
            </Link>
          </div>

          {/* Live Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up delay-400">
            <StatBadge label="Active Chains" value={stats.chains.toString()} />
            <StatBadge label="Cache Hit Rate" value={stats.cacheHitRate} />
            <StatBadge label="Uptime" value={stats.uptime} />
            <StatBadge label="Revenue Today" value={stats.revenue} accent />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
        <div className="w-6 h-10 rounded-full border-2 border-[var(--border-default)] flex items-start justify-center p-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-pulse" />
        </div>
      </div>
    </section>
  );
}

function StatBadge({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="glass-card p-4 text-center">
      <div
        className={`text-2xl font-bold mb-1 ${
          accent ? "text-[var(--brand-accent)]" : "text-[var(--text-primary)]"
        }`}
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value}
      </div>
      <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

function ParticleNetwork() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 5}s`,
    duration: `${6 + Math.random() * 4}s`,
  }));

  return (
    <div className="particle-network">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            top: p.top,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
      {/* Connection lines - SVG */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--brand-primary)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="10%" y1="20%" x2="30%" y2="40%" stroke="url(#lineGradient)" strokeWidth="1" />
        <line x1="30%" y1="40%" x2="60%" y2="30%" stroke="url(#lineGradient)" strokeWidth="1" />
        <line x1="60%" y1="30%" x2="80%" y2="50%" stroke="url(#lineGradient)" strokeWidth="1" />
        <line x1="20%" y1="60%" x2="50%" y2="70%" stroke="url(#lineGradient)" strokeWidth="1" />
        <line x1="50%" y1="70%" x2="85%" y2="60%" stroke="url(#lineGradient)" strokeWidth="1" />
        <line x1="40%" y1="20%" x2="70%" y2="80%" stroke="url(#lineGradient)" strokeWidth="1" />
      </svg>
    </div>
  );
}
