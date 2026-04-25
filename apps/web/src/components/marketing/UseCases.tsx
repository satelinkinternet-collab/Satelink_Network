"use client";

import { useState } from "react";

const USE_CASES = [
  {
    id: "defi",
    label: "DeFi Bots",
    icon: <BotIcon />,
    title: "High-Frequency DeFi Trading",
    description:
      "Arbitrage bots, liquidation bots, and MEV searchers need ultra-low latency RPC. Satelink's latency-based routing ensures your transactions hit the fastest provider every time.",
    features: [
      "Sub-50ms average latency",
      "Circuit breaker failover",
      "Multi-chain routing",
      "No rate limits on Pro tier",
    ],
    code: `// MEV Bot Example
const tx = await provider.sendTransaction({
  to: flashloanContract,
  data: encodedArbitrageCall,
  gasLimit: 500000,
  maxFeePerGas: gasPrice * 2n,
});
// Satelink routes to fastest node`,
  },
  {
    id: "ai",
    label: "AI Agents",
    icon: <BrainIcon />,
    title: "Autonomous AI Agents",
    description:
      "AI agents need reliable blockchain access for on-chain actions. Satelink provides the infrastructure layer for AI-to-blockchain communication with automatic retry and caching.",
    features: [
      "Cached read operations",
      "Automatic retry on failure",
      "WebSocket subscriptions",
      "Event streaming",
    ],
    code: `// AI Agent wallet interaction
const agent = new AIAgent({
  rpc: "https://rpc.satelink.network/rpc/polygon",
  wallet: agentWallet,
});

await agent.executeOnChain({
  action: "swap",
  params: { tokenIn: USDC, tokenOut: WETH },
});`,
  },
  {
    id: "dapps",
    label: "dApps",
    icon: <AppIcon />,
    title: "Production dApp Infrastructure",
    description:
      "Your users deserve fast, reliable blockchain access. Satelink handles the complexity of multi-provider routing so you can focus on building great products.",
    features: [
      "99.9% uptime SLA",
      "Global edge caching",
      "Wagmi/viem compatible",
      "Free tier for development",
    ],
    code: `// Wagmi Configuration
import { createConfig, http } from "wagmi";

export const config = createConfig({
  chains: [polygon, ethereum, arbitrum],
  transports: {
    [polygon.id]: http("https://rpc.satelink.network/rpc/polygon"),
    [ethereum.id]: http("https://rpc.satelink.network/rpc/ethereum"),
  },
});`,
  },
  {
    id: "nodes",
    label: "Node Operators",
    icon: <ServerIcon />,
    title: "Earn USDT Running Nodes",
    description:
      "Turn your infrastructure into income. Run a Satelink node and earn 50% of the RPC fees your node generates. Automatic settlement in USDT on Polygon.",
    features: [
      "50% revenue share",
      "USDT settlement",
      "No minimum stake",
      "Reputation-based routing",
    ],
    code: `# Start earning with your node
docker run -d \\
  --name satelink-node \\
  -e WALLET_ADDRESS=0x... \\
  -e RPC_ENDPOINT=http://localhost:8545 \\
  satelink/node:latest

# Check earnings
curl https://api.satelink.network/node/earnings`,
  },
];

type UseCaseId = (typeof USE_CASES)[number]["id"];

export function UseCases() {
  const [activeTab, setActiveTab] = useState<UseCaseId>("defi");
  const activeCase = USE_CASES.find((c) => c.id === activeTab)!;

  return (
    <section id="use-cases" className="py-24 bg-[var(--bg-card)]/30">
      <div className="container-marketing">
        <div className="text-center mb-12">
          <h2 className="heading-lg mb-4">
            Built for <span className="text-gradient">Machine Economies</span>
          </h2>
          <p className="text-body-lg max-w-2xl mx-auto">
            From DeFi bots to AI agents, Satelink powers the next generation of
            autonomous applications.
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {USE_CASES.map((useCase) => (
            <button
              key={useCase.id}
              onClick={() => setActiveTab(useCase.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === useCase.id
                  ? "bg-[var(--brand-primary)] text-[var(--bg-deep)]"
                  : "bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/30 hover:text-[var(--text-primary)]"
              }`}
            >
              <span
                className={
                  activeTab === useCase.id
                    ? "text-[var(--bg-deep)]"
                    : "text-[var(--brand-primary)]"
                }
              >
                {useCase.icon}
              </span>
              {useCase.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Description */}
          <div className="animate-fade-in-up">
            <h3
              className="heading-md mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {activeCase.title}
            </h3>
            <p className="text-body mb-8">{activeCase.description}</p>

            <div className="space-y-3">
              {activeCase.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[var(--brand-accent)]/20 flex items-center justify-center">
                    <CheckIcon />
                  </div>
                  <span className="text-[var(--text-secondary)]">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Code example */}
          <div className="code-block overflow-hidden animate-fade-in-up delay-100">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/50">
              <span className="text-sm text-[var(--text-muted)]">Example</span>
              <button
                onClick={() => navigator.clipboard.writeText(activeCase.code)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="p-6 overflow-x-auto text-sm leading-relaxed">
              <code className="text-[var(--text-primary)]">{activeCase.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function BotIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function AppIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3 h-3 text-[var(--brand-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
