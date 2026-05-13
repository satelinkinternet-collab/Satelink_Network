"use client";



import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Navigation } from "@/components/marketing/Navigation";
import { Footer } from "@/components/marketing/Footer";
import { GlobeBackground } from "@/components/effects/GlobeBackground";

interface NetworkMetrics {
  activeNodes: number;
  rpcRequests24h: number;
  currentEpoch: number;
  avgLatency: number;
  chainsSupported: number;
  networkStatus: "operational" | "degraded" | "down";
}

export default function HomePage() {
  const [metrics, setMetrics] = useState<NetworkMetrics>({
    activeNodes: 5,
    rpcRequests24h: 0,
    currentEpoch: 0,
    avgLatency: 0,
    chainsSupported: 5,
    networkStatus: "operational",
  });

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("https://rpc.satelink.network/api/status");
      if (res.ok) {
        const data = await res.json();
        setMetrics({
          activeNodes: data.nodes?.active || 5,
          rpcRequests24h: data.revenue?.eventsToday || data.rpc?.requestsToday || 0,
          currentEpoch: data.epoch?.current || 0,
          avgLatency: data.rpc?.avgLatency || 0,
          chainsSupported: data.chains?.count || 5,
          networkStatus: data.status === "ok" ? "operational" : "degraded",
        });
      }
    } catch {
      // Use defaults
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Satelink Network",
    "description": "Decentralized Physical Infrastructure Network for RPC, AI inference, and machine APIs. Revenue settles as USDT on Polygon automatically.",
    "url": "https://satelink.network",
    "applicationCategory": "Infrastructure",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free tier: 1000 RPC requests/day"
    },
    "provider": {
      "@type": "Organization",
      "name": "Satelink Network",
      "url": "https://satelink.network",
      "sameAs": [
        "https://github.com/Satelink-Protocol/Satelink_Network",
        "https://twitter.com/satelinknetwork"
      ]
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navigation />
      <main>
        <HeroSection />
        <LiveNetworkMetrics metrics={metrics} />
        <ProductGrid />
        <HowSatelinkWorks />
        <DeveloperExperience />
        <EconomicsOverview />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#091413]">
      <GlobeBackground />
      <div className="hero-grid absolute inset-0 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <div className="hero-badge mb-8">
          <span className="live-dot" />
          Public Beta &middot; Polygon Mainnet &middot; USDT Settlement
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#B0E4CC] mb-6 leading-tight">
          Infrastructure Network for
          <br />
          <span className="gradient-text">RPC, AI, and Machine APIs</span>
        </h1>

        <p className="text-lg md:text-xl text-[#408A71] max-w-3xl mx-auto mb-8 leading-relaxed">
          Satelink routes real workloads through decentralized infrastructure nodes worldwide.
          Every API call settles as USDT on Polygon.
        </p>

        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <Link href="/dashboard" className="btn btn-primary btn-lg">
            Launch Console
          </Link>
          <Link href="/node/setup" className="btn btn-secondary btn-lg">
            Run a Node
          </Link>
          <a
            href="https://docs.satelink.network"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-lg"
          >
            View Docs
          </a>
        </div>

        <div className="semantic-description mt-16 max-w-4xl mx-auto text-left bg-[#0d1f1d]/80 border border-[#285A48]/40 rounded-xl p-8">
          <h2 className="text-2xl font-semibold text-[#B0E4CC] mb-4">
            What is Satelink?
          </h2>
          <p className="text-[#408A71] leading-relaxed">
            Satelink is an autonomous economic protocol that connects developers needing
            infrastructure (RPC, AI inference, webhooks, compute) with node operators
            running distributed hardware. Every request is metered, billed in USDT,
            and settled automatically via smart contracts on Polygon. Node operators
            earn 50% of all revenue with zero human intervention required.
          </p>
        </div>
      </div>

      <style jsx>{`
        .hero-grid {
          background-image:
            linear-gradient(rgba(40, 90, 72, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(40, 90, 72, 0.06) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        .gradient-text {
          background: linear-gradient(135deg, #00D1FF 0%, #B0E4CC 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 209, 255, 0.1);
          border: 1px solid rgba(0, 209, 255, 0.25);
          color: #00D1FF;
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 0.875rem;
        }
        .live-dot {
          width: 8px;
          height: 8px;
          background: #408A71;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          border-radius: 8px;
          padding: 14px 28px;
          font-size: 1rem;
          transition: all 0.2s;
        }
        .btn-primary {
          background: #408A71;
          color: #091413;
          border: none;
        }
        .btn-primary:hover {
          background: #4CAF8C;
          box-shadow: 0 0 24px rgba(64, 138, 113, 0.4);
        }
        .btn-secondary {
          background: transparent;
          color: #B0E4CC;
          border: 1px solid #408A71;
        }
        .btn-secondary:hover {
          border-color: #00D1FF;
          color: #00D1FF;
        }
        .btn-outline {
          background: transparent;
          color: #408A71;
          border: 1px solid #285A48;
        }
        .btn-outline:hover {
          border-color: #408A71;
          color: #B0E4CC;
        }
      `}</style>
    </section>
  );
}

function LiveNetworkMetrics({ metrics }: { metrics: NetworkMetrics }) {
  return (
    <section className="py-20 bg-[#0a1816]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#408A71]/10 border border-[#408A71]/30 text-[#408A71] text-sm font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-[#408A71] animate-pulse" />
            Live Network Data
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#B0E4CC] mb-4">
            Real-Time Network Metrics
          </h2>
          <p className="text-[#408A71] max-w-2xl mx-auto">
            Monitor the Satelink network. Data refreshes every 30 seconds from /api/status.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            label="Active Nodes"
            value={metrics.activeNodes.toString()}
            source="/api/nodes"
          />
          <MetricCard
            label="RPC Requests 24h"
            value={formatNumber(metrics.rpcRequests24h)}
            source="/api/status"
          />
          <MetricCard
            label="Current Epoch"
            value={metrics.currentEpoch.toString()}
            source="/api/status"
          />
          <MetricCard
            label="Avg Latency"
            value={metrics.avgLatency > 0 ? `${metrics.avgLatency}ms` : "—"}
            source="/rpc/health"
          />
          <MetricCard
            label="Chains Supported"
            value={metrics.chainsSupported.toString()}
            source="/rpc/chains"
          />
          <MetricCard
            label="Network Status"
            value={metrics.networkStatus === "operational" ? "Operational" : "Degraded"}
            source="/api/status"
            highlight={metrics.networkStatus === "operational"}
          />
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  source,
  highlight,
}: {
  label: string;
  value: string;
  source: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-[#0d1f1d] border border-[#285A48]/40 rounded-xl p-5 text-center">
      <div
        className={`text-2xl md:text-3xl font-bold mb-2 font-mono ${
          highlight ? "text-[#4CAF8C]" : "text-[#B0E4CC]"
        }`}
      >
        {value}
      </div>
      <div className="text-sm text-[#408A71] mb-1">{label}</div>
      <div className="text-xs text-[#285A48] font-mono">{source}</div>
    </div>
  );
}

function ProductGrid() {
  const products = [
    {
      title: "RPC Gateway",
      description:
        "JSON-RPC relay for Polygon, Ethereum, Arbitrum. Route to the fastest available provider automatically.",
      status: "live",
    },
    {
      title: "AI Inference",
      description:
        "OpenAI-compatible endpoint. Per-token billing. Stage S3 — coming soon.",
      status: "coming",
    },
    {
      title: "Webhook Engine",
      description:
        "Reliable webhook delivery with retry logic. Developer-grade event infrastructure.",
      status: "live",
    },
    {
      title: "MEV Relay",
      description:
        "Private mempool relay for DeFi protocols. Avoid frontrunning with dedicated node routing.",
      status: "live",
    },
    {
      title: "Compute Network",
      description:
        "Distributed compute execution. Run workloads across verified node operators.",
      status: "coming",
    },
    {
      title: "Node Registry",
      description:
        "Register your infrastructure as a Satelink node. Earn USDT for every request routed through you.",
      status: "live",
    },
  ];

  return (
    <section className="py-20 bg-[#091413]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#B0E4CC] mb-4">
            Infrastructure Products
          </h2>
          <p className="text-[#408A71] max-w-2xl mx-auto">
            Six core products powering the autonomous machine economy. Each product
            generates revenue that splits 50/30/20 every epoch.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.title}
              className="bg-[#0d1f1d] border border-[#285A48]/40 rounded-xl p-6 hover:border-[#408A71]/60 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-[#B0E4CC]">
                  {product.title}
                </h3>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    product.status === "live"
                      ? "bg-[#408A71]/20 text-[#4CAF8C]"
                      : "bg-[#285A48]/20 text-[#408A71]"
                  }`}
                >
                  {product.status === "live" ? "LIVE" : "SOON"}
                </span>
              </div>
              <p className="text-[#408A71] text-sm leading-relaxed">
                {product.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowSatelinkWorks() {
  const steps = [
    {
      title: "Developer Request",
      description:
        "Your app sends an RPC call, AI inference request, or webhook to Satelink endpoints.",
    },
    {
      title: "Satelink Gateway",
      description:
        "Rate limiting, authentication, and intelligent routing determine the optimal path.",
    },
    {
      title: "Optimal Node Selection",
      description:
        "Reputation scoring and latency measurements select the best node for your workload.",
    },
    {
      title: "Workload Execution",
      description:
        "The selected node executes RPC, AI, webhook, or compute tasks and returns results.",
    },
    {
      title: "Revenue Recording",
      description:
        "Per-call billing is recorded in revenue_events_v2 with microsecond precision.",
    },
    {
      title: "Epoch Settlement",
      description:
        "Every 60 seconds, epochs close automatically with 50/30/20 revenue split.",
    },
    {
      title: "USDT Claim",
      description:
        "Node operators claim earnings as USDT on Polygon mainnet. No minimum wait time.",
    },
  ];

  return (
    <section className="py-20 bg-[#0a1816]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#B0E4CC] mb-4">
            How Satelink Works
          </h2>
          <p className="text-[#408A71] max-w-2xl mx-auto">
            From request to settlement in 60 seconds. Fully autonomous, no human
            intervention required.
          </p>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#408A71]/0 via-[#408A71]/40 to-[#408A71]/0" />

          <div className="space-y-8">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className={`flex items-start gap-6 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                <div className="flex-1 md:text-right">
                  {index % 2 === 0 && (
                    <StepContent step={step} />
                  )}
                </div>

                <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full bg-[#408A71] text-[#091413] flex items-center justify-center font-bold text-lg">
                  {index + 1}
                </div>

                <div className="flex-1">
                  {index % 2 !== 0 && (
                    <StepContent step={step} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepContent({
  step,
}: {
  step: { title: string; description: string };
}) {
  return (
    <div className="bg-[#0d1f1d] border border-[#285A48]/40 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-[#B0E4CC] mb-2">{step.title}</h3>
      <p className="text-[#408A71] text-sm leading-relaxed">{step.description}</p>
    </div>
  );
}

function DeveloperExperience() {
  return (
    <section className="py-20 bg-[#091413]">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#B0E4CC] mb-4">
            Developer Experience
          </h2>
          <p className="text-[#408A71] max-w-2xl mx-auto">
            Production-ready infrastructure with real working endpoints. No API key
            required for the free tier.
          </p>
        </div>

        <div className="bg-[#0d1f1d] border border-[#285A48]/60 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#0a1816] border-b border-[#285A48]/40">
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
              <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
              <span className="w-3 h-3 rounded-full bg-[#408A71]" />
            </div>
            <span className="text-[#408A71] text-sm font-mono">satelink-rpc</span>
          </div>

          <div className="p-6 font-mono text-sm leading-loose overflow-x-auto">
            <div className="text-[#408A71] mb-4"># Connect to Polygon Mainnet RPC — no API key required</div>
            <div className="text-[#B0E4CC]">
              curl -X POST https://rpc.satelink.network/rpc/polygon \
            </div>
            <div className="text-[#B0E4CC] pl-4">
              -H &quot;Content-Type: application/json&quot; \
            </div>
            <div className="text-[#B0E4CC] pl-4 mb-6">
              -d &#39;&#123;&quot;jsonrpc&quot;:&quot;2.0&quot;,&quot;method&quot;:&quot;eth_blockNumber&quot;,&quot;params&quot;:[],&quot;id&quot;:1&#125;&#39;
            </div>

            <div className="text-[#408A71] mb-4"># Check network status</div>
            <div className="text-[#B0E4CC] mb-6">
              curl https://rpc.satelink.network/api/status
            </div>

            <div className="text-[#408A71] mb-4"># View pricing</div>
            <div className="text-[#B0E4CC]">
              curl https://rpc.satelink.network/api/pricing
            </div>
          </div>
        </div>

        <div className="mt-8 bg-[#0d1f1d]/60 border border-[#285A48]/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[#B0E4CC] mb-3">
            Free Tier Details
          </h3>
          <p className="text-[#408A71] leading-relaxed">
            The public RPC endpoint at <code className="text-[#00D1FF]">rpc.satelink.network/rpc/polygon</code>{" "}
            is free for up to 100 requests per day with no API key required. For higher
            limits, create an API key at <Link href="/developers#api-key" className="text-[#00D1FF] hover:underline">/developers</Link>.
            Paid tiers support up to 1,000,000 requests/day with WebSocket subscriptions
            and priority support.
          </p>
        </div>
      </div>
    </section>
  );
}

function EconomicsOverview() {
  return (
    <section className="py-20 bg-[#0a1816]">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#B0E4CC] mb-4">
            Revenue Economics
          </h2>
          <p className="text-[#408A71] max-w-2xl mx-auto">
            Transparent 50/30/20 split. Every epoch settles automatically.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-[#0d1f1d] border border-[#4CAF8C]/40 rounded-xl p-8 text-center">
            <div className="text-5xl font-bold text-[#4CAF8C] mb-3">50%</div>
            <div className="text-xl font-semibold text-[#B0E4CC] mb-2">
              Node Operators
            </div>
            <p className="text-[#408A71] text-sm">
              Half of all epoch revenue goes directly to the nodes that processed
              the workloads.
            </p>
          </div>

          <div className="bg-[#0d1f1d] border border-[#00D1FF]/40 rounded-xl p-8 text-center">
            <div className="text-5xl font-bold text-[#00D1FF] mb-3">30%</div>
            <div className="text-xl font-semibold text-[#B0E4CC] mb-2">
              Platform Fee
            </div>
            <p className="text-[#408A71] text-sm">
              Funds protocol development, infrastructure, and operational costs.
            </p>
          </div>

          <div className="bg-[#0d1f1d] border border-[#B0E4CC]/40 rounded-xl p-8 text-center">
            <div className="text-5xl font-bold text-[#B0E4CC] mb-3">20%</div>
            <div className="text-xl font-semibold text-[#B0E4CC] mb-2">
              Distribution Pool
            </div>
            <p className="text-[#408A71] text-sm">
              Reserved for ecosystem incentives, staking rewards, and community
              growth.
            </p>
          </div>
        </div>

        <div className="bg-[#0d1f1d]/60 border border-[#285A48]/30 rounded-xl p-6 text-center">
          <p className="text-[#408A71] leading-relaxed">
            Revenue distributes automatically every 60 seconds via smart contract on
            Polygon Mainnet. Node operators claim earnings as USDT with no manual
            intervention. Minimum claim: 1 USDT.
          </p>
          <p className="text-[#285A48] text-sm mt-4 font-mono">
            ClaimsContract: 0xE475c53B88190FD2130dB1E37504991EFe283fb0
          </p>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-24 bg-[#091413]">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-[#B0E4CC] mb-6">
          Build on Infrastructure That Pays You Back
        </h2>
        <p className="text-lg text-[#408A71] max-w-2xl mx-auto mb-10">
          Join the Satelink node network or integrate our APIs. Every request you
          handle earns USDT, settled automatically.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/node/setup"
            className="inline-flex items-center justify-center px-8 py-4 bg-[#408A71] text-[#091413] font-semibold rounded-lg hover:bg-[#4CAF8C] transition-colors"
          >
            Start a Node
          </Link>
          <a
            href="https://docs.satelink.network"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-8 py-4 border border-[#408A71] text-[#B0E4CC] font-semibold rounded-lg hover:border-[#00D1FF] hover:text-[#00D1FF] transition-colors"
          >
            API Documentation
          </a>
        </div>
      </div>
    </section>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
