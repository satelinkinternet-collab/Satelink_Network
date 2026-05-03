"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

interface ChainStatus {
  name: string;
  isLive: boolean;
  latency: number | null;
  blockNumber: string | null;
}

interface RevenueMetrics {
  totalRevenue: number;
  eventsToday: number;
}

interface TerminalLine {
  type: "command" | "response";
  text: string;
}

export function HeroSection() {
  const [chains, setChains] = useState<ChainStatus[]>([
    { name: "Polygon", isLive: true, latency: null, blockNumber: null },
    { name: "Ethereum", isLive: true, latency: null, blockNumber: null },
    { name: "Arbitrum", isLive: true, latency: null, blockNumber: null },
    { name: "Base", isLive: true, latency: null, blockNumber: null },
    { name: "Amoy", isLive: true, latency: null, blockNumber: null },
  ]);

  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { type: "command", text: "$ curl -X POST https://rpc.satelink.network/rpc/polygon \\" },
    { type: "command", text: '    -d \'{"method":"eth_blockNumber","id":1}\'' },
    { type: "response", text: '{"result":"0x...","id":1}' },
  ]);

  const [revenue, setRevenue] = useState<RevenueMetrics>({ totalRevenue: 0, eventsToday: 0 });
  const displayRevenue = useRef(0);
  const [animatedRevenue, setAnimatedRevenue] = useState("0.000000");

  const fetchRevenue = useCallback(async () => {
    try {
      const res = await fetch("https://rpc.satelink.network/rpc/metrics");
      if (res.ok) {
        const data = await res.json();
        const newRevenue = parseFloat(data.revenue?.usdtToday || "0");
        setRevenue({
          totalRevenue: newRevenue,
          eventsToday: data.revenue?.eventsToday || 0,
        });
      }
    } catch {
      // Use defaults
    }
  }, []);

  useEffect(() => {
    const target = revenue.totalRevenue;
    const start = displayRevenue.current;
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * easeOut;
      displayRevenue.current = current;
      setAnimatedRevenue(current.toFixed(6));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [revenue.totalRevenue]);

  useEffect(() => {
    fetchRevenue();
    const interval = setInterval(fetchRevenue, 10000);
    return () => clearInterval(interval);
  }, [fetchRevenue]);

  const fetchChainStatus = useCallback(async () => {
    try {
      const res = await fetch("https://rpc.satelink.network/rpc/health");
      if (res.ok) {
        const data = await res.json();
        if (data.chains) {
          const chainMap: Record<string, string> = {
            polygon: "Polygon",
            ethereum: "Ethereum",
            arbitrum: "Arbitrum",
            base: "Base",
            amoy: "Amoy",
          };

          const updatedChains = Object.entries(data.chains).map(([key, value]: [string, unknown]) => {
            const chainData = value as { status?: string; avgLatency?: number; currentBlock?: number };
            return {
              name: chainMap[key] || key,
              isLive: chainData.status === "healthy",
              latency: chainData.avgLatency || null,
              blockNumber: chainData.currentBlock ? `0x${chainData.currentBlock.toString(16)}` : null,
            };
          });
          setChains(updatedChains);

          const polygonBlock = (data.chains.polygon as { currentBlock?: number })?.currentBlock;
          if (polygonBlock) {
            setTerminalLines([
              { type: "command", text: "$ curl -X POST https://rpc.satelink.network/rpc/polygon \\" },
              { type: "command", text: '    -d \'{"method":"eth_blockNumber","id":1}\'' },
              { type: "response", text: `{"result":"0x${polygonBlock.toString(16)}","id":1}` },
            ]);
          }
        }
      }
    } catch {
      // Use defaults
    }
  }, []);

  useEffect(() => {
    fetchChainStatus();
    const interval = setInterval(fetchChainStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchChainStatus]);

  return (
    <section className="hero">
      <div className="hero-grid" />

      <div className="hero-content">
        <div className="hero-badge animate-fade-up">
          <span style={{ color: "var(--earn)" }}>&#x2197;</span>
          Chainlist Listed &middot; 6 Chains &middot; Mainnet Live
        </div>

        <div className="revenue-ticker animate-fade-up delay-50">
          <span className="ticker-label">Total Revenue Distributed:</span>
          <span className="ticker-value">${animatedRevenue}</span>
          <span className="ticker-currency">USDT</span>
        </div>

        <h1 className="heading-display hero-title animate-fade-up delay-100">
          The RPC Layer for
          <br />
          <span style={{ color: "var(--signal)" }}>Autonomous Machines</span>
        </h1>

        <p className="hero-subtitle animate-fade-up delay-200">
          Decentralized infrastructure for DeFi bots, AI agents, and machine-to-machine
          workloads. USDT settlement on Polygon.
        </p>

        <div className="hero-ctas animate-fade-up delay-300">
          <Link href="/developers" className="btn btn-primary btn-lg">
            Start for free &rarr;
          </Link>
          <Link href="/network" className="btn btn-signal-outline btn-lg">
            View live network
          </Link>
        </div>

        <div className="stats-bar animate-fade-up delay-400">
          {chains.map((chain) => (
            <div key={chain.name} className="stat-item">
              <span className={`stat-dot ${!chain.isLive ? "offline" : ""}`} />
              <span className="stat-label">{chain.name}</span>
              {chain.latency && (
                <span className="stat-value">{chain.latency}ms</span>
              )}
            </div>
          ))}
        </div>

        <div className="hero-terminal animate-fade-up delay-500">
          <div className="terminal-header">
            <div className="terminal-dots">
              <span className="terminal-dot red" />
              <span className="terminal-dot yellow" />
              <span className="terminal-dot green" />
            </div>
            <span className="terminal-title">Terminal</span>
          </div>
          <div className="terminal-body">
            {terminalLines.map((line, i) => (
              <div key={i} className={`terminal-line ${line.type}`}>
                {line.text}
              </div>
            ))}
            <span className="terminal-cursor">_</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .revenue-ticker {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-4);
          background: linear-gradient(90deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05));
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: var(--radius-full);
          margin-bottom: var(--space-4);
        }

        .ticker-label {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .ticker-value {
          font-family: var(--font-mono);
          font-size: 1.25rem;
          font-weight: 700;
          color: #22C55E;
        }

        .ticker-currency {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .hero-terminal {
          max-width: 640px;
          margin: var(--space-12) auto 0;
          background: var(--ink-950);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          overflow: hidden;
          text-align: left;
        }

        .terminal-header {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-3) var(--space-4);
          background: var(--ink-900);
          border-bottom: 1px solid var(--border-subtle);
        }

        .terminal-dots {
          display: flex;
          gap: 6px;
        }

        .terminal-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .terminal-dot.red { background: #EF4444; }
        .terminal-dot.yellow { background: #F59E0B; }
        .terminal-dot.green { background: #22C55E; }

        .terminal-title {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .terminal-body {
          padding: var(--space-4);
          font-family: var(--font-mono);
          font-size: 0.875rem;
          line-height: 1.7;
        }

        .terminal-line {
          white-space: pre-wrap;
          word-break: break-all;
        }

        .terminal-line.command {
          color: var(--text-secondary);
        }

        .terminal-line.response {
          color: var(--earn);
          margin-top: var(--space-2);
        }

        .terminal-cursor {
          color: var(--signal);
          animation: blink 1s step-end infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </section>
  );
}
