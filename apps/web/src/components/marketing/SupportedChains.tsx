"use client";

import { useEffect, useState } from "react";

interface ChainData {
  name: string;
  chainId: number;
  endpoint: string;
  status: "live" | "testnet";
  currentBlock: string | null;
  latency: number | null;
}

const CHAINS: ChainData[] = [
  {
    name: "Polygon",
    chainId: 137,
    endpoint: "rpc.satelink.network/rpc/polygon",
    status: "live",
    currentBlock: null,
    latency: null,
  },
  {
    name: "Ethereum",
    chainId: 1,
    endpoint: "rpc.satelink.network/rpc/ethereum",
    status: "live",
    currentBlock: null,
    latency: null,
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    endpoint: "rpc.satelink.network/rpc/arbitrum",
    status: "live",
    currentBlock: null,
    latency: null,
  },
  {
    name: "Base",
    chainId: 8453,
    endpoint: "rpc.satelink.network/rpc/base",
    status: "live",
    currentBlock: null,
    latency: null,
  },
  {
    name: "Amoy",
    chainId: 80002,
    endpoint: "rpc.satelink.network/rpc/amoy",
    status: "testnet",
    currentBlock: null,
    latency: null,
  },
];

export function SupportedChains() {
  const [chains, setChains] = useState<ChainData[]>(CHAINS);

  useEffect(() => {
    async function fetchChainHealth() {
      try {
        const res = await fetch("https://rpc.satelink.network/rpc/health");
        if (res.ok) {
          const data = await res.json();
          if (data.chains) {
            const chainKeyMap: Record<string, string> = {
              polygon: "Polygon",
              ethereum: "Ethereum",
              arbitrum: "Arbitrum",
              base: "Base",
              amoy: "Amoy",
            };

            setChains((prev) =>
              prev.map((chain) => {
                const key = Object.keys(chainKeyMap).find(
                  (k) => chainKeyMap[k] === chain.name
                );
                if (key && data.chains[key]) {
                  const chainInfo = data.chains[key] as { currentBlock?: number; avgLatency?: number };
                  return {
                    ...chain,
                    currentBlock: chainInfo.currentBlock
                      ? `0x${chainInfo.currentBlock.toString(16)}`
                      : null,
                    latency: chainInfo.avgLatency || null,
                  };
                }
                return chain;
              })
            );
          }
        }
      } catch {
        // Use defaults
      }
    }
    fetchChainHealth();
    const interval = setInterval(fetchChainHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="section" style={{ background: "var(--bg-card)" }}>
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="heading-lg mb-4">Supported Chains</h2>
          <p className="text-body-lg" style={{ maxWidth: "600px", margin: "0 auto" }}>
            Live endpoints across 5 chains with real-time block data
          </p>
        </div>

        <div className="chain-grid">
          {chains.map((chain) => (
            <div key={chain.chainId} className="chain-card">
              <div className="chain-header">
                <span className="chain-name">{chain.name}</span>
                <span className={`badge ${chain.status === "live" ? "badge-live" : "badge-testnet"}`}>
                  {chain.status === "live" ? "LIVE" : "TESTNET"}
                </span>
              </div>
              <div className="chain-id">Chain ID: {chain.chainId}</div>
              {chain.currentBlock && (
                <div className="chain-block">Block: {chain.currentBlock}</div>
              )}
              {chain.latency && (
                <div className="chain-latency">{chain.latency}ms latency</div>
              )}
              <div className="chain-endpoint">https://{chain.endpoint}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "var(--space-8)" }}>
          <p className="text-body-sm text-muted">
            More chains coming soon: Optimism, Avalanche, BNB Chain, zkSync
          </p>
        </div>
      </div>
    </section>
  );
}
