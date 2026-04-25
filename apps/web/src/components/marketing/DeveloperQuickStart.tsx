"use client";

import { useState } from "react";
import Link from "next/link";

const CODE_EXAMPLES = {
  curl: `# Get latest block number
curl -X POST https://rpc.satelink.network/rpc/polygon \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Response
{"jsonrpc":"2.0","id":1,"result":"0x3a2b1c"}`,

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
console.log("Balance:", ethers.formatEther(balance));`,

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
print(f"Balance: {w3.from_wei(balance, 'ether')} ETH")`,

  wagmi: `import { createConfig, http } from "wagmi";
import { polygon, mainnet } from "wagmi/chains";

// Satelink RPC configuration
export const config = createConfig({
  chains: [polygon, mainnet],
  transports: {
    [polygon.id]: http("https://rpc.satelink.network/rpc/polygon"),
    [mainnet.id]: http("https://rpc.satelink.network/rpc/ethereum"),
  },
});`,
};

type CodeLang = keyof typeof CODE_EXAMPLES;

export function DeveloperQuickStart() {
  const [activeTab, setActiveTab] = useState<CodeLang>("curl");

  return (
    <section id="developers" className="py-24">
      <div className="container-marketing">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 mb-6">
              <span className="text-[var(--brand-primary)] text-sm font-medium">
                Developer Quick Start
              </span>
            </div>

            <h2 className="heading-lg mb-6">
              Start Building in{" "}
              <span className="text-gradient">30 Seconds</span>
            </h2>

            <p className="text-body-lg mb-8">
              No signup required for the free tier. Just point your provider to our
              endpoint and start making requests.
            </p>

            <div className="space-y-4 mb-8">
              <Feature
                icon={<ZapIcon />}
                title="Free Tier"
                description="100 requests/day with no API key required"
              />
              <Feature
                icon={<ShieldIcon />}
                title="Production Ready"
                description="Circuit breaker, caching, and automatic failover"
              />
              <Feature
                icon={<ClockIcon />}
                title="Low Latency"
                description="EMA-based routing to fastest providers"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <Link href="/developers" className="btn-glow">
                Read the Docs
              </Link>
              <Link href="/developers#api-key" className="btn-outline">
                Get API Key
              </Link>
            </div>
          </div>

          {/* Right: Code Block */}
          <div className="code-block overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/50">
              {(Object.keys(CODE_EXAMPLES) as CodeLang[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveTab(lang)}
                  className={`px-4 py-3 text-sm font-medium transition-colors capitalize ${
                    activeTab === lang
                      ? "text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)] -mb-px"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Code */}
            <div className="p-6 overflow-x-auto">
              <pre className="text-sm leading-relaxed">
                <code>
                  <CodeHighlight code={CODE_EXAMPLES[activeTab]} lang={activeTab} />
                </code>
              </pre>
            </div>

            {/* Copy button */}
            <div className="px-6 pb-4">
              <button
                onClick={() => navigator.clipboard.writeText(CODE_EXAMPLES[activeTab])}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors flex items-center gap-1"
              >
                <CopyIcon />
                Copy to clipboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CodeHighlight({ code, lang }: { code: string; lang: string }) {
  const lines = code.split("\n");

  return (
    <>
      {lines.map((line, i) => (
        <div key={i} className="flex">
          <span className="select-none text-[var(--text-muted)] w-8 text-right pr-4 shrink-0">
            {i + 1}
          </span>
          <span>
            {line.startsWith("#") || line.startsWith("//") ? (
              <span className="text-[var(--text-muted)]">{line}</span>
            ) : line.includes("http") || line.includes("rpc.satelink") ? (
              <HighlightLine line={line} />
            ) : (
              <span className="text-[var(--text-primary)]">{line}</span>
            )}
          </span>
        </div>
      ))}
    </>
  );
}

function HighlightLine({ line }: { line: string }) {
  const urlMatch = line.match(/(https?:\/\/[^\s"']+)/);
  if (urlMatch) {
    const url = urlMatch[1];
    const parts = line.split(url);
    return (
      <>
        <span className="text-[var(--text-primary)]">{parts[0]}</span>
        <span className="text-[var(--brand-accent)]">{url}</span>
        <span className="text-[var(--text-primary)]">{parts[1]}</span>
      </>
    );
  }
  return <span className="text-[var(--text-primary)]">{line}</span>;
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 flex items-center justify-center shrink-0 text-[var(--brand-primary)]">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold text-[var(--text-primary)] mb-1">{title}</h4>
        <p className="text-sm text-[var(--text-secondary)]">{description}</p>
      </div>
    </div>
  );
}

function ZapIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  );
}
