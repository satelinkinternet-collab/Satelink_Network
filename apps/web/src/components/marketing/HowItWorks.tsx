"use client";

export function HowItWorks() {
  return (
    <section id="network" className="py-24 relative overflow-hidden">
      {/* Background accent */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5 pointer-events-none"
        style={{
          background: "radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)",
        }}
      />

      <div className="container-marketing relative z-10">
        <div className="text-center mb-16">
          <h2 className="heading-lg mb-4">
            How <span className="text-gradient">Satelink</span> Works
          </h2>
          <p className="text-body-lg max-w-2xl mx-auto">
            Machine-to-machine infrastructure with automatic revenue distribution
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting lines for desktop */}
          <div className="hidden md:block absolute top-24 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-0.5">
            <div className="w-full h-full bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-secondary)] to-[var(--brand-accent)] opacity-30" />
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-3 h-3 rotate-45 border-t-2 border-r-2 border-[var(--brand-primary)]" />
            <div className="absolute top-1/2 left-3/4 -translate-y-1/2 w-3 h-3 rotate-45 border-t-2 border-r-2 border-[var(--brand-accent)]" />
          </div>

          <Step
            number={1}
            icon={<SendIcon />}
            title="Machine Sends Request"
            description="DeFi bots, AI agents, and dApps send RPC calls to Satelink endpoints. No API key required for free tier."
            color="primary"
          />
          <Step
            number={2}
            icon={<RouteIcon />}
            title="Smart Routing"
            description="Gateway routes to the fastest available provider using latency-based selection and circuit breaker failover."
            color="secondary"
          />
          <Step
            number={3}
            icon={<SplitIcon />}
            title="Revenue Split"
            description="Every call generates USDT revenue. 50% to node operators, 30% platform, 20% distribution pool."
            color="accent"
          />
        </div>

        {/* Visual flow diagram */}
        <div className="mt-20 glass-card p-8 overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center">
            <FlowItem
              label="Request"
              sublabel="JSON-RPC"
              icon={<CodeIcon />}
            />
            <FlowArrow />
            <FlowItem
              label="Gateway"
              sublabel="Latency Router"
              icon={<ServerIcon />}
              highlight
            />
            <FlowArrow />
            <FlowItem
              label="Provider"
              sublabel="18 Nodes"
              icon={<NetworkIcon />}
            />
            <FlowArrow />
            <FlowItem
              label="Settlement"
              sublabel="USDT on Polygon"
              icon={<WalletIcon />}
              accent
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({
  number,
  icon,
  title,
  description,
  color,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "primary" | "secondary" | "accent";
}) {
  const colorMap = {
    primary: "var(--brand-primary)",
    secondary: "var(--brand-secondary)",
    accent: "var(--brand-accent)",
  };

  return (
    <div className="relative group">
      <div className="stat-card h-full flex flex-col items-center text-center transition-all duration-300">
        {/* Step number */}
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{
            background: colorMap[color],
            color: "var(--bg-deep)",
          }}
        >
          {number}
        </div>

        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mt-4 transition-all duration-300 group-hover:scale-110"
          style={{
            background: `rgba(${
              color === "primary"
                ? "0, 212, 255"
                : color === "secondary"
                ? "123, 47, 255"
                : "0, 255, 148"
            }, 0.1)`,
            border: `1px solid ${colorMap[color]}33`,
          }}
        >
          <div style={{ color: colorMap[color] }}>{icon}</div>
        </div>

        <h3
          className="heading-sm mb-3"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {title}
        </h3>
        <p className="text-body text-sm">{description}</p>
      </div>
    </div>
  );
}

function FlowItem({
  label,
  sublabel,
  icon,
  highlight,
  accent,
}: {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-14 h-14 rounded-xl flex items-center justify-center mb-3 ${
          highlight
            ? "bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/30 animate-pulse-glow"
            : accent
            ? "bg-[var(--brand-accent)]/20 border border-[var(--brand-accent)]/30"
            : "bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
        }`}
      >
        <div
          className={
            highlight
              ? "text-[var(--brand-primary)]"
              : accent
              ? "text-[var(--brand-accent)]"
              : "text-[var(--text-secondary)]"
          }
        >
          {icon}
        </div>
      </div>
      <div className="font-semibold text-sm text-[var(--text-primary)]">
        {label}
      </div>
      <div className="text-xs text-[var(--text-muted)]">{sublabel}</div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="hidden md:flex items-center text-[var(--text-muted)]">
      <svg width="40" height="12" viewBox="0 0 40 12" fill="none">
        <path
          d="M0 6H38M38 6L33 1M38 6L33 11"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// Icons
function SendIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function SplitIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function NetworkIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
    </svg>
  );
}
