"use client";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Send RPC Call",
      description:
        "Your machine calls rpc.satelink.network/rpc/{chain} with standard JSON-RPC format. No signup required.",
    },
    {
      number: "02",
      title: "Smart Routing",
      description:
        "Latency-based routing selects fastest provider. Circuit breaker auto-fails over. Redis cache serves hot data.",
    },
    {
      number: "03",
      title: "USDT Settlement",
      description:
        "Every call billed in USDT. Node operators earn 50%. Epoch closes, Polygon settlement, claim anytime.",
    },
  ];

  return (
    <section className="section" id="how-it-works">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="heading-lg mb-4">How It Works</h2>
          <p className="text-body-lg" style={{ maxWidth: "600px", margin: "0 auto" }}>
            Simple three-step flow from RPC request to USDT settlement
          </p>
        </div>

        <div className="feature-grid">
          {steps.map((step) => (
            <div key={step.number} className="card feature-card">
              <div className="feature-number">{step.number}</div>
              <h3 className="feature-title">{step.title}</h3>
              <p className="feature-description">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="flow-diagram">
          <div className="flow-items">
            <FlowItem icon={<CodeIcon />} label="Request" sublabel="JSON-RPC" />
            <FlowArrow />
            <FlowItem icon={<ServerIcon />} label="Gateway" sublabel="Latency Router" highlight />
            <FlowArrow />
            <FlowItem icon={<NetworkIcon />} label="Provider" sublabel="18 Nodes" />
            <FlowArrow />
            <FlowItem icon={<WalletIcon />} label="Settlement" sublabel="USDT Polygon" accent />
          </div>
        </div>
      </div>

      <style jsx>{`
        .flow-diagram {
          margin-top: var(--space-16);
          padding: var(--space-8);
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
        }

        .flow-items {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-4);
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .flow-items {
            flex-direction: column;
          }
        }
      `}</style>
    </section>
  );
}

function FlowItem({
  icon,
  label,
  sublabel,
  highlight,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flow-item" style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
    }}>
      <div style={{
        width: "56px",
        height: "56px",
        borderRadius: "var(--radius-xl)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "var(--space-3)",
        background: highlight
          ? "var(--signal-dim)"
          : accent
          ? "rgba(74, 222, 128, 0.1)"
          : "var(--bg-elevated)",
        border: highlight
          ? "1px solid var(--signal-border)"
          : accent
          ? "1px solid rgba(74, 222, 128, 0.2)"
          : "1px solid var(--border-subtle)",
        color: highlight
          ? "var(--signal)"
          : accent
          ? "var(--earn)"
          : "var(--text-secondary)",
      }}>
        {icon}
      </div>
      <div style={{
        fontFamily: "var(--font-heading)",
        fontWeight: 600,
        fontSize: "0.875rem",
        color: "var(--text-primary)",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.75rem",
        color: "var(--text-muted)",
      }}>
        {sublabel}
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flow-arrow" style={{ color: "var(--text-muted)", display: "flex" }}>
      <svg width="32" height="12" viewBox="0 0 32 12" fill="none">
        <path
          d="M0 6H30M30 6L25 1M30 6L25 11"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <style jsx>{`
        @media (max-width: 768px) {
          .flow-arrow {
            transform: rotate(90deg);
            margin: var(--space-4) 0;
          }
        }
      `}</style>
    </div>
  );
}

function CodeIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function NetworkIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
    </svg>
  );
}
