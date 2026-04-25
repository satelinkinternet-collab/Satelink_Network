"use client";

const CHAINS = [
  {
    name: "Polygon",
    chainId: 137,
    status: "live" as const,
    color: "#8247E5",
    logo: "/chains/polygon.svg",
  },
  {
    name: "Ethereum",
    chainId: 1,
    status: "live" as const,
    color: "#627EEA",
    logo: "/chains/ethereum.svg",
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    status: "live" as const,
    color: "#28A0F0",
    logo: "/chains/arbitrum.svg",
  },
  {
    name: "Base",
    chainId: 8453,
    status: "live" as const,
    color: "#0052FF",
    logo: "/chains/base.svg",
  },
  {
    name: "Polygon Amoy",
    chainId: 80002,
    status: "testnet" as const,
    color: "#8247E5",
    logo: "/chains/polygon.svg",
  },
];

export function SupportedChains() {
  return (
    <section className="py-24 bg-[var(--bg-card)]/50">
      <div className="container-marketing">
        <div className="text-center mb-16">
          <h2 className="heading-lg mb-4">
            Multi-Chain <span className="text-gradient">Support</span>
          </h2>
          <p className="text-body-lg max-w-2xl mx-auto">
            One endpoint, multiple chains. Automatic routing to the fastest provider.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {CHAINS.map((chain, i) => (
            <ChainCard key={chain.chainId} chain={chain} index={i} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            More chains coming soon: Optimism, Avalanche, BNB Chain, zkSync
          </p>
        </div>
      </div>
    </section>
  );
}

function ChainCard({
  chain,
  index,
}: {
  chain: (typeof CHAINS)[0];
  index: number;
}) {
  return (
    <div
      className="stat-card group cursor-pointer transition-all duration-300 animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex flex-col items-center text-center">
        {/* Chain icon placeholder */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
          style={{
            background: `${chain.color}20`,
            border: `1px solid ${chain.color}40`,
          }}
        >
          <ChainIcon color={chain.color} />
        </div>

        <h3 className="font-semibold text-[var(--text-primary)] mb-1">
          {chain.name}
        </h3>

        <div className="text-xs text-[var(--text-muted)] mb-3 font-mono">
          Chain ID: {chain.chainId}
        </div>

        <span
          className={`chain-badge ${chain.status === "live" ? "live" : "testnet"}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              chain.status === "live"
                ? "bg-[var(--brand-accent)]"
                : "bg-[var(--brand-warning)]"
            }`}
          />
          {chain.status === "live" ? "Live" : "Testnet"}
        </span>
      </div>
    </div>
  );
}

function ChainIcon({ color }: { color: string }) {
  return (
    <svg
      className="w-8 h-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 019 14.437V9.564z"
      />
    </svg>
  );
}
