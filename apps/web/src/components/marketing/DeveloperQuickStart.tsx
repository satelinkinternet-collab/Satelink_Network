"use client";

import { useState } from "react";
import Link from "next/link";

const CODE_EXAMPLES = {
  curl: `POST https://rpc.satelink.network/rpc/polygon
Content-Type: application/json

{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}

# Response
{"jsonrpc":"2.0","id":1,"result":"0x3a2b1c"}`,

  javascript: `import { createPublicClient, http } from 'viem'
import { polygon } from 'viem/chains'

const client = createPublicClient({
  chain: polygon,
  transport: http('https://rpc.satelink.network/rpc/polygon')
})

const blockNumber = await client.getBlockNumber()`,

  python: `from web3 import Web3

w3 = Web3(Web3.HTTPProvider(
    "https://rpc.satelink.network/rpc/polygon"
))

block = w3.eth.block_number
print(f"Block: {block}")`,

  wagmi: `import { createConfig, http } from "wagmi";
import { polygon, mainnet, arbitrum } from "wagmi/chains";

export const config = createConfig({
  chains: [polygon, mainnet, arbitrum],
  transports: {
    [polygon.id]: http("https://rpc.satelink.network/rpc/polygon"),
    [mainnet.id]: http("https://rpc.satelink.network/rpc/ethereum"),
    [arbitrum.id]: http("https://rpc.satelink.network/rpc/arbitrum"),
  },
});`,
};

type CodeLang = keyof typeof CODE_EXAMPLES;

export function DeveloperQuickStart() {
  const [activeTab, setActiveTab] = useState<CodeLang>("curl");

  return (
    <section className="section" id="developers">
      <div className="container">
        <div className="dev-grid">
          <div className="dev-content">
            <span className="badge badge-signal" style={{ marginBottom: "var(--space-6)" }}>
              Developer Quick Start
            </span>

            <h2 className="heading-lg" style={{ marginBottom: "var(--space-6)" }}>
              Start Building in <span style={{ color: "var(--signal)" }}>30 Seconds</span>
            </h2>

            <p className="text-body-lg" style={{ marginBottom: "var(--space-8)" }}>
              No API key required for free tier. Just point your provider to our
              endpoint and start making requests. 100 req/day free.
            </p>

            <div className="dev-features">
              <Feature icon={<ZapIcon />} title="Free Tier" description="100 requests/day, no signup" />
              <Feature icon={<ShieldIcon />} title="Production Ready" description="Circuit breaker + caching" />
              <Feature icon={<ClockIcon />} title="Low Latency" description="Sub-200ms P50 response" />
            </div>

            <div className="dev-ctas">
              <Link href="/developers" className="btn btn-primary">
                Read the Docs
              </Link>
              <Link href="/developers#api-key" className="btn btn-secondary">
                Get API Key
              </Link>
            </div>
          </div>

          <div className="code-block">
            <div className="code-tabs">
              {(Object.keys(CODE_EXAMPLES) as CodeLang[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveTab(lang)}
                  className={`code-tab ${activeTab === lang ? "active" : ""}`}
                >
                  {lang}
                </button>
              ))}
            </div>
            <pre className="code-content">
              <code>{CODE_EXAMPLES[activeTab]}</code>
            </pre>
            <div className="code-footer">
              <button
                onClick={() => navigator.clipboard.writeText(CODE_EXAMPLES[activeTab])}
                className="copy-btn"
              >
                <CopyIcon /> Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dev-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-12);
          align-items: center;
        }

        @media (max-width: 1024px) {
          .dev-grid {
            grid-template-columns: 1fr;
          }
        }

        .dev-content {
          max-width: 500px;
        }

        .dev-features {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          margin-bottom: var(--space-8);
        }

        .dev-ctas {
          display: flex;
          gap: var(--space-4);
          flex-wrap: wrap;
        }

        .code-tabs {
          display: flex;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--ink-900);
        }

        .code-tab {
          padding: var(--space-3) var(--space-4);
          font-family: var(--font-body);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-muted);
          background: none;
          border: none;
          cursor: pointer;
          text-transform: capitalize;
          transition: color 0.2s;
        }

        .code-tab:hover {
          color: var(--text-secondary);
        }

        .code-tab.active {
          color: var(--signal);
          box-shadow: inset 0 -2px 0 var(--signal);
        }

        .code-content {
          padding: var(--space-4);
          font-family: var(--font-mono);
          font-size: 0.875rem;
          line-height: 1.7;
          color: var(--text-primary);
          overflow-x: auto;
          white-space: pre;
        }

        .code-footer {
          padding: var(--space-3) var(--space-4);
          border-top: 1px solid var(--border-subtle);
          background: var(--ink-900);
        }

        .copy-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--space-1);
          font-family: var(--font-body);
          font-size: 0.75rem;
          color: var(--text-muted);
          background: none;
          border: none;
          cursor: pointer;
          transition: color 0.2s;
        }

        .copy-btn:hover {
          color: var(--signal);
        }
      `}</style>
    </section>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)" }}>
      <div style={{
        width: "40px",
        height: "40px",
        borderRadius: "var(--radius-lg)",
        background: "var(--signal-dim)",
        border: "1px solid var(--signal-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--signal)",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>{title}</div>
        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{description}</div>
      </div>
    </div>
  );
}

function ZapIcon() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  );
}
