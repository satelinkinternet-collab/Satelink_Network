"use client";



import { useState } from "react";
import { Navigation } from "@/components/marketing/Navigation";
import { Footer } from "@/components/marketing/Footer";

const CODE_EXAMPLES = {
  javascript: `import { ethers } from "ethers";

// Connect to Satelink RPC
const provider = new ethers.JsonRpcProvider(
  "https://rpc.satelink.network/rpc/polygon"
);

// Get latest block
const blockNumber = await provider.getBlockNumber();
console.log("Block:", blockNumber);

// Get balance
const balance = await provider.getBalance("0x...");
console.log("Balance:", ethers.formatEther(balance));

// Send transaction
const tx = await wallet.sendTransaction({
  to: "0x...",
  value: ethers.parseEther("0.1")
});
await tx.wait();`,

  python: `from web3 import Web3

# Connect to Satelink RPC
w3 = Web3(Web3.HTTPProvider(
    "https://rpc.satelink.network/rpc/polygon"
))

# Get latest block
block = w3.eth.block_number
print(f"Block: {block}")

# Get balance
balance = w3.eth.get_balance("0x...")
print(f"Balance: {w3.from_wei(balance, 'ether')} ETH")

# Send transaction
tx_hash = w3.eth.send_transaction({
    'to': '0x...',
    'from': account.address,
    'value': w3.to_wei(0.1, 'ether')
})`,

  rust: `use ethers::prelude::*;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to Satelink RPC
    let provider = Provider::<Http>::try_from(
        "https://rpc.satelink.network/rpc/polygon"
    )?;

    // Get latest block
    let block_number = provider.get_block_number().await?;
    println!("Block: {}", block_number);

    // Get balance
    let address = "0x...".parse::<Address>()?;
    let balance = provider.get_balance(address, None).await?;
    println!("Balance: {} ETH", format_units(balance, "ether")?);

    Ok(())
}`,

  go: `package main

import (
    "context"
    "fmt"
    "log"
    "github.com/ethereum/go-ethereum/ethclient"
)

func main() {
    // Connect to Satelink RPC
    client, err := ethclient.Dial(
        "https://rpc.satelink.network/rpc/polygon",
    )
    if err != nil {
        log.Fatal(err)
    }

    // Get latest block
    blockNumber, err := client.BlockNumber(context.Background())
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("Block:", blockNumber)
}`,

  curl: `# Get latest block number
curl -X POST https://rpc.satelink.network/rpc/polygon \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Get balance
curl -X POST https://rpc.satelink.network/rpc/polygon \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x...","latest"],"id":1}'

# With API key (for higher limits)
curl -X POST https://rpc.satelink.network/rpc/polygon \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key" \\
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`,
};

const SUPPORTED_CHAINS = [
  { name: "Polygon", chainId: 137, endpoint: "/rpc/polygon", status: "live" },
  { name: "Ethereum", chainId: 1, endpoint: "/rpc/ethereum", status: "live" },
  { name: "Arbitrum", chainId: 42161, endpoint: "/rpc/arbitrum", status: "live" },
  { name: "Base", chainId: 8453, endpoint: "/rpc/base", status: "live" },
  { name: "Polygon Amoy", chainId: 80002, endpoint: "/rpc/amoy", status: "testnet" },
];

const RPC_METHODS = [
  { method: "eth_blockNumber", params: "[]", billing: "$0.00003", category: "Reading" },
  { method: "eth_getBalance", params: "[address, block]", billing: "$0.00003", category: "Reading" },
  { method: "eth_getTransactionByHash", params: "[hash]", billing: "$0.00003", category: "Reading" },
  { method: "eth_getTransactionReceipt", params: "[hash]", billing: "$0.00003", category: "Reading" },
  { method: "eth_call", params: "[tx, block]", billing: "$0.00003", category: "Reading" },
  { method: "eth_getLogs", params: "[filter]", billing: "$0.00005", category: "Reading" },
  { method: "eth_sendRawTransaction", params: "[signedTx]", billing: "$0.0001", category: "Writing" },
  { method: "eth_estimateGas", params: "[tx]", billing: "$0.00003", category: "Gas" },
  { method: "eth_gasPrice", params: "[]", billing: "$0.00001", category: "Gas" },
  { method: "eth_chainId", params: "[]", billing: "$0.00001", category: "Info" },
  { method: "net_version", params: "[]", billing: "$0.00001", category: "Info" },
];

const RATE_LIMITS = [
  { tier: "Free", requests: "100/day", chains: "All", websocket: "No", support: "Community", sla: "-" },
  { tier: "Basic", requests: "10,000/day", chains: "All", websocket: "Yes", support: "Email", sla: "99%" },
  { tier: "Pro", requests: "100,000/day", chains: "All", websocket: "Yes", support: "Priority", sla: "99.5%" },
  { tier: "Enterprise", requests: "1,000,000/day", chains: "All", websocket: "Yes", support: "Dedicated", sla: "99.9%" },
];

type CodeLang = keyof typeof CODE_EXAMPLES;

export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState<CodeLang>("javascript");
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  const [apiKeyEmail, setApiKeyEmail] = useState("");
  const [apiKeyResult, setApiKeyResult] = useState<{ key?: string; error?: string } | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState(false);

  async function createApiKey(e: React.FormEvent) {
    e.preventDefault();
    setIsCreatingKey(true);
    setApiKeyResult(null);

    try {
      const res = await fetch("https://rpc.satelink.network/api/keys/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: apiKeyEmail, tier: "free" }),
      });
      const data = await res.json();
      if (data.key) {
        setApiKeyResult({ key: data.key });
      } else {
        setApiKeyResult({ error: data.error || "Failed to create API key" });
      }
    } catch {
      setApiKeyResult({ error: "Network error. Please try again." });
    } finally {
      setIsCreatingKey(false);
    }
  }

  return (
    <>
      <Navigation />
      <main className="pt-24">
        {/* Hero */}
        <section className="py-16 text-center">
          <div className="container-marketing">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 mb-6">
              <span className="text-[var(--brand-primary)] text-sm font-medium">
                Developer Documentation
              </span>
            </div>
            <h1 className="heading-xl mb-6">
              Build on the fastest{" "}
              <span className="text-gradient">decentralized RPC</span>
            </h1>
            <p className="text-body-lg max-w-2xl mx-auto">
              Multi-chain RPC gateway with latency-based routing, Redis caching,
              and automatic failover. Start free, scale to millions.
            </p>
          </div>
        </section>

        {/* Quick Start */}
        <section className="py-16 bg-[var(--bg-card)]/30">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">Quick Start</h2>

            {/* SDK Install */}
            <div className="max-w-4xl mx-auto mb-8">
              <div className="bg-[#060e0b] border border-[#1a3028] rounded-lg p-4 font-mono text-sm">
                <p className="text-[#285A48] text-xs mb-2 uppercase tracking-wider">
                  Install SDK
                </p>
                <p className="text-[#408A71]">$ npm install @satelink/sdk</p>
              </div>
            </div>

            {/* Language tabs */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {(Object.keys(CODE_EXAMPLES) as CodeLang[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveTab(lang)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    activeTab === lang
                      ? "bg-[var(--brand-primary)] text-[var(--bg-deep)]"
                      : "bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/30"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Code block */}
            <div className="code-block max-w-4xl mx-auto">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/50">
                <span className="text-sm text-[var(--text-muted)] capitalize">{activeTab}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(CODE_EXAMPLES[activeTab])}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
                >
                  Copy
                </button>
              </div>
              <pre className="p-6 overflow-x-auto text-sm leading-relaxed">
                <code className="text-[var(--text-primary)]">{CODE_EXAMPLES[activeTab]}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Supported Chains */}
        <section className="py-16">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">Supported Chains</h2>
            <div className="overflow-x-auto">
              <table className="w-full max-w-4xl mx-auto">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[var(--text-primary)]">Chain</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[var(--text-primary)]">Chain ID</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[var(--text-primary)]">Endpoint</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[var(--text-primary)]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {SUPPORTED_CHAINS.map((chain) => (
                    <tr key={chain.chainId} className="border-b border-[var(--border-subtle)]/50">
                      <td className="py-4 px-4 text-[var(--text-primary)]">{chain.name}</td>
                      <td className="py-4 px-4 font-mono text-sm text-[var(--text-secondary)]">{chain.chainId}</td>
                      <td className="py-4 px-4 font-mono text-sm text-[var(--brand-primary)]">
                        https://rpc.satelink.network{chain.endpoint}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                            chain.status === "live"
                              ? "bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]"
                              : "bg-yellow-500/10 text-yellow-500"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            chain.status === "live" ? "bg-[var(--brand-accent)]" : "bg-yellow-500"
                          }`} />
                          {chain.status === "live" ? "Live" : "Testnet"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* API Reference */}
        <section id="api" className="py-16 bg-[var(--bg-card)]/30">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">API Reference</h2>
            <div className="max-w-4xl mx-auto space-y-2">
              {RPC_METHODS.map((method) => (
                <div
                  key={method.method}
                  className="glass-card overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedMethod(expandedMethod === method.method ? null : method.method)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <code className="text-[var(--brand-primary)] font-mono">{method.method}</code>
                      <span className="text-xs px-2 py-1 rounded bg-[var(--bg-surface)] text-[var(--text-muted)]">
                        {method.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-[var(--brand-accent)]">{method.billing}</span>
                      <ChevronIcon expanded={expandedMethod === method.method} />
                    </div>
                  </button>
                  {expandedMethod === method.method && (
                    <div className="px-4 pb-4 border-t border-[var(--border-subtle)]">
                      <div className="pt-4 space-y-2">
                        <div>
                          <span className="text-sm text-[var(--text-muted)]">Parameters: </span>
                          <code className="text-sm text-[var(--text-secondary)]">{method.params}</code>
                        </div>
                        <div>
                          <span className="text-sm text-[var(--text-muted)]">Cost per call: </span>
                          <span className="text-sm text-[var(--brand-accent)]">{method.billing}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* API Key Creation */}
        <section id="api-key" className="py-16">
          <div className="container-marketing">
            <div className="max-w-xl mx-auto text-center">
              <h2 className="heading-lg mb-4">Get Your API Key</h2>
              <p className="text-body mb-8">
                Start with 100 free requests/day. Upgrade anytime for higher limits.
              </p>

              <form onSubmit={createApiKey} className="glass-card p-6">
                <div className="mb-4">
                  <input
                    type="email"
                    value={apiKeyEmail}
                    onChange={(e) => setApiKeyEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full px-4 py-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreatingKey}
                  className="btn-glow w-full disabled:opacity-50"
                >
                  {isCreatingKey ? "Creating..." : "Create Free API Key"}
                </button>

                {apiKeyResult && (
                  <div className={`mt-4 p-4 rounded-lg ${
                    apiKeyResult.key
                      ? "bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/20"
                      : "bg-red-500/10 border border-red-500/20"
                  }`}>
                    {apiKeyResult.key ? (
                      <div>
                        <p className="text-sm text-[var(--text-muted)] mb-2">Your API Key:</p>
                        <code className="text-[var(--brand-accent)] break-all">{apiKeyResult.key}</code>
                        <p className="text-xs text-[var(--text-muted)] mt-2">Save this key securely. It won&apos;t be shown again.</p>
                      </div>
                    ) : (
                      <p className="text-sm text-red-400">{apiKeyResult.error}</p>
                    )}
                  </div>
                )}
              </form>
            </div>
          </div>
        </section>

        {/* Rate Limits */}
        <section className="py-16 bg-[var(--bg-card)]/30">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">Rate Limits</h2>
            <div className="overflow-x-auto">
              <table className="w-full max-w-5xl mx-auto">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[var(--text-primary)]">Tier</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[var(--text-primary)]">Requests</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[var(--text-primary)]">Chains</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[var(--text-primary)]">WebSocket</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[var(--text-primary)]">Support</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[var(--text-primary)]">SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {RATE_LIMITS.map((tier) => (
                    <tr key={tier.tier} className="border-b border-[var(--border-subtle)]/50">
                      <td className="py-4 px-4 font-semibold text-[var(--text-primary)]">{tier.tier}</td>
                      <td className="py-4 px-4 text-[var(--text-secondary)]">{tier.requests}</td>
                      <td className="py-4 px-4 text-[var(--text-secondary)]">{tier.chains}</td>
                      <td className="py-4 px-4 text-[var(--text-secondary)]">{tier.websocket}</td>
                      <td className="py-4 px-4 text-[var(--text-secondary)]">{tier.support}</td>
                      <td className="py-4 px-4 text-[var(--text-secondary)]">{tier.sla}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* WebSocket Guide */}
        <section id="websocket" className="py-16">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">WebSocket Subscriptions</h2>
            <div className="max-w-4xl mx-auto">
              <p className="text-body text-center mb-8">
                Subscribe to real-time blockchain events using WebSocket connections.
                Requires Basic tier or higher.
              </p>

              <div className="code-block">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/50">
                  <span className="text-sm text-[var(--text-muted)]">JavaScript</span>
                </div>
                <pre className="p-6 overflow-x-auto text-sm leading-relaxed">
                  <code className="text-[var(--text-primary)]">{`// Connect to WebSocket
const ws = new WebSocket("wss://rpc.satelink.network/ws/polygon");

ws.onopen = () => {
  // Subscribe to new blocks
  ws.send(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_subscribe",
    params: ["newHeads"]
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("New block:", data.params.result.number);
};`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture */}
        <section id="architecture" className="py-16">
          <div className="container-marketing">
            <h2 className="heading-lg mb-8 text-center">Request Architecture</h2>
            <p className="text-body text-center mb-12 max-w-2xl mx-auto">
              Understanding how requests flow through the Satelink network from your
              application to settlement.
            </p>

            <div className="max-w-4xl mx-auto space-y-4">
              <ArchStep
                step={1}
                title="Request Ingestion"
                description="Your application sends a JSON-RPC request to rpc.satelink.network/rpc/{chain}. No signup required for free tier (100 req/day)."
              />
              <ArchStep
                step={2}
                title="Authentication & Rate Limiting"
                description="If you include an X-API-Key header, we validate your tier and apply appropriate rate limits. Free tier uses IP-based tracking."
              />
              <ArchStep
                step={3}
                title="Intelligent Routing"
                description="Our router selects the optimal provider using latency EMA tracking, circuit breaker state, and load balancing weights across 18 providers."
              />
              <ArchStep
                step={4}
                title="Redis Cache Check"
                description="For read methods (eth_blockNumber, eth_getBalance), we check Redis cache first. Cache hit rate averages 78%+."
              />
              <ArchStep
                step={5}
                title="Provider Execution"
                description="Request is proxied to the selected provider. Circuit breaker monitors for failures and auto-fails over to healthy providers."
              />
              <ArchStep
                step={6}
                title="Revenue Recording"
                description="Each successful request is logged to revenue_events_v2 with method, cost, and timestamp. Billing is per-call based on method pricing."
              />
              <ArchStep
                step={7}
                title="Epoch Settlement"
                description="Every 60 seconds, epochs close. Revenue splits 50/30/20 between node operators, platform, and distribution pool. Claim as USDT on Polygon."
              />
            </div>
          </div>
        </section>

        {/* Official SDK */}
        <section className="py-16 bg-[var(--bg-card)]/30">
          <div className="container-marketing">
            <div className="glass-card p-12 max-w-3xl mx-auto">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/20 flex items-center justify-center">
                  <PackageIcon />
                </div>
                <div>
                  <h3 className="heading-md">@satelink/sdk</h3>
                  <p className="text-sm text-[var(--text-muted)]">v0.2.0 — TypeScript SDK with ethers, viem, wagmi adapters</p>
                </div>
              </div>

              <div className="code-block text-left mb-6">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/50">
                  <span className="text-xs text-[var(--text-muted)]">Install</span>
                </div>
                <pre className="p-4 overflow-x-auto text-sm">
                  <code className="text-[var(--text-primary)]">npm install @satelink/sdk</code>
                </pre>
              </div>

              <div className="code-block text-left mb-6">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/50">
                  <span className="text-xs text-[var(--text-muted)]">Usage</span>
                </div>
                <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
                  <code className="text-[var(--text-primary)]">{`import { getEthersProvider, SatelinkRPC, SatelinkMEV } from '@satelink/sdk';

// ethers.js provider (drop-in Alchemy replacement)
const provider = getEthersProvider('polygon');
const block = await provider.getBlockNumber();

// Direct RPC client
const rpc = new SatelinkRPC({ chain: 'polygon' });
const balance = await rpc.getBalance('0x...');

// MEV relay — simulate before submitting
const mev = new SatelinkMEV({ apiKey: 'sk_live_...' });
const sim = await mev.simulateBundle([signedTx1, signedTx2]);
if (sim.profitable) {
  await mev.submitBundle([signedTx1, signedTx2]);
}`}</code>
                </pre>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="https://npmjs.com/package/@satelink/sdk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-glow inline-flex items-center gap-2"
                >
                  View on npm
                </a>
                <a
                  href="https://github.com/Satelink-Protocol/Satelink_Network/tree/main/packages/sdk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline inline-flex items-center gap-2"
                >
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function ArchStep({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4 glass-card p-6">
      <div className="w-10 h-10 rounded-full bg-[var(--brand-primary)] flex items-center justify-center shrink-0">
        <span className="text-[var(--bg-deep)] font-bold">{step}</span>
      </div>
      <div>
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)]">{description}</p>
      </div>
    </div>
  );
}

function PackageIcon() {
  return (
    <svg className="w-8 h-8 text-[var(--brand-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
