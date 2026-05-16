'use client';

import { useState } from 'react';

const API = 'https://rpc.satelink.network';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    limit: '200 req/day',
    features: ['No API key required', 'Public RPC access', 'All 6 chains', 'Community support'],
    tier: 'free',
    cta: 'Get Free Key',
    highlight: false,
  },
  {
    name: 'Basic',
    price: '$9',
    period: '/month',
    limit: '10,000 req/day',
    features: ['API key required', 'Priority routing', 'All chains', 'Email support', 'Usage analytics'],
    tier: 'basic',
    cta: 'Coming Soon',
    highlight: false,
    soon: true,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    limit: '100,000 req/day',
    features: ['API key required', 'MEV relay access', 'WebSocket support', 'All chains', 'Priority support'],
    tier: 'pro',
    cta: 'Coming Soon',
    highlight: true,
    soon: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    limit: '1M+ req/day',
    features: ['Dedicated nodes', 'SLA guarantee', 'Custom chains', '24/7 support', 'Custom pricing'],
    tier: 'enterprise',
    cta: 'Contact Us',
    highlight: false,
    soon: true,
  },
];

interface ApiKeyResult {
  ok: boolean;
  api_key?: string;
  tier?: string;
  daily_limit?: number;
  usage?: string;
  example?: string;
  error?: string;
}

export default function PlansPage() {
  const [result, setResult] = useState<ApiKeyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function getFreeKey() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/api/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'free' }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Request failed';
      setResult({ ok: false, error: message });
    } finally {
      setLoading(false);
    }
  }

  function copyKey() {
    if (result?.api_key) {
      navigator.clipboard.writeText(result.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[18px] font-semibold text-[#B0E4CC] tracking-tight">
          API Plans
        </h1>
        <p className="text-[11px] text-[#408A71] mt-1">
          RPC access for every scale · USDT settlement · Polygon Mainnet
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`bg-[#0c1a17] rounded-md overflow-hidden ${
              plan.highlight
                ? 'border-2 border-[#408A71] shadow-[0_0_20px_rgba(64,138,113,0.15)]'
                : 'border border-[#1a3028]'
            }`}
          >
            {plan.highlight && (
              <div className="bg-[#408A71] text-[#091413] text-[9px] font-bold text-center py-1 tracking-wider uppercase">
                Most Popular
              </div>
            )}
            <div className="p-5">
              <p className="text-[11px] text-[#285A48] uppercase tracking-wider mb-1">
                {plan.name}
              </p>
              <p className="text-[28px] font-bold text-[#B0E4CC] leading-none">
                {plan.price}
                <span className="text-[13px] text-[#285A48] font-normal">{plan.period}</span>
              </p>
              <p className="text-[11px] text-[#408A71] mt-1 mb-4">{plan.limit}</p>
              <div className="space-y-1.5 mb-5">
                {plan.features.map((f) => (
                  <p key={f} className="text-[11px] text-[#285A48] flex items-center gap-1.5">
                    <span className="text-[#408A71]">✓</span>
                    {f}
                  </p>
                ))}
              </div>
              {plan.tier === 'free' ? (
                <button
                  onClick={getFreeKey}
                  disabled={loading}
                  className="w-full py-2 bg-[#408A71] text-[#091413] font-semibold text-[12px] rounded hover:bg-[#4fa07f] transition-colors disabled:opacity-40"
                >
                  {loading ? 'Creating...' : plan.cta}
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-2 bg-transparent border border-[#1a3028] text-[#285A48] font-semibold text-[12px] rounded cursor-not-allowed"
                >
                  {plan.cta}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* API Key Result */}
      {result && (
        <div
          className={`rounded-md p-5 ${
            result.ok
              ? 'bg-[#0c2219] border border-[#285A48]'
              : 'bg-[#1a0f0f] border border-[#3e1818]'
          }`}
        >
          {result.ok ? (
            <div>
              <p className="text-[13px] font-semibold text-[#B0E4CC] mb-3">
                ✓ API Key Created
              </p>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 bg-[#091413] rounded p-3 font-mono text-[11px] text-[#00D1FF] break-all">
                  {result.api_key}
                </div>
                <button
                  onClick={copyKey}
                  className="px-3 py-2 bg-[#1a3028] text-[#408A71] text-[11px] rounded hover:bg-[#285A48] hover:text-[#B0E4CC] transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-[#285A48] mb-3">
                Daily limit: <span className="text-[#408A71]">{result.daily_limit} requests</span> ·
                Tier: <span className="text-[#408A71]">{result.tier}</span>
              </p>

              <div className="bg-[#091413] rounded p-4 mb-3">
                <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-2">
                  Usage
                </p>
                <p className="text-[11px] text-[#408A71] font-mono">
                  Add header: <span className="text-[#00D1FF]">X-API-Key: {result.api_key?.slice(0, 15)}...</span>
                </p>
              </div>

              <div className="bg-[#091413] rounded p-4">
                <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-2">
                  Example cURL
                </p>
                <pre className="text-[10px] font-mono text-[#408A71] overflow-x-auto whitespace-pre-wrap">
{`curl -X POST https://rpc.satelink.network/rpc/polygon \\
  -H "X-API-Key: ${result.api_key}" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`}
                </pre>
              </div>

              <div className="mt-4 p-3 bg-[#16140a] border border-[#3a3e18] rounded">
                <p className="text-[10px] text-[#a0a030]">
                  ⚠ Save this key securely — it cannot be retrieved again
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-[#c04040]">Error: {result.error}</p>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-5">
        <p className="text-[11px] font-medium text-[#B0E4CC] mb-3">
          Revenue Model — 50/30/20 Split
        </p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Node Operators', pct: 50, color: '#408A71' },
            { label: 'Platform', pct: 30, color: '#285A48' },
            { label: 'Distribution', pct: 20, color: '#00D1FF' },
          ].map((r) => (
            <div key={r.label} className="text-center">
              <p className="text-[20px] font-bold font-mono" style={{ color: r.color }}>
                {r.pct}%
              </p>
              <p className="text-[10px] text-[#285A48]">{r.label}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#285A48] leading-relaxed">
          All RPC revenue is automatically split: 50% to node operators, 30% platform fee, 20% distribution pool.
          Paid tiers coming soon — deposit USDT → get API key → credits auto-deduct per call.
        </p>
      </div>

      {/* Pricing Table */}
      <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a3028]">
          <p className="text-[12px] font-medium text-[#B0E4CC]">Per-Call Pricing</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a3028] bg-[#091413]/50">
                {['Chain', 'Price/Call', 'Example Methods'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left text-[9px] font-semibold text-[#285A48] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { chain: 'Polygon', price: '$0.00003', methods: 'eth_call, eth_blockNumber' },
                { chain: 'Ethereum', price: '$0.00005', methods: 'eth_call, eth_getLogs' },
                { chain: 'Arbitrum', price: '$0.00004', methods: 'eth_call, eth_getBalance' },
                { chain: 'Base', price: '$0.00004', methods: 'eth_call, eth_sendRawTransaction' },
              ].map((row) => (
                <tr key={row.chain} className="border-b border-[#0f1d15] hover:bg-[#0f1e17]">
                  <td className="px-4 py-2 text-[11px] text-[#B0E4CC]">{row.chain}</td>
                  <td className="px-4 py-2 font-mono text-[11px] text-[#00D1FF]">{row.price}</td>
                  <td className="px-4 py-2 text-[10px] text-[#285A48]">{row.methods}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
