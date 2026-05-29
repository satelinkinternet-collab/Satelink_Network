'use client';

import { useEffect, useState } from 'react';

interface ModelMapping {
  model: string;
  provider: string;
  groqModel: string;
  pricing: string;
}

const MODELS: ModelMapping[] = [
  { model: 'gpt-4o', provider: 'OpenAI', groqModel: 'llama-3.3-70b-versatile', pricing: '$0.001/req' },
  { model: 'gpt-4o-mini', provider: 'OpenAI', groqModel: 'llama-3.1-8b-instant', pricing: '$0.0005/req' },
  { model: 'gpt-4-turbo', provider: 'OpenAI', groqModel: 'llama-3.3-70b-versatile', pricing: '$0.001/req' },
  { model: 'gpt-3.5-turbo', provider: 'OpenAI', groqModel: 'llama-3.1-8b-instant', pricing: '$0.0005/req' },
  { model: 'claude-3-opus', provider: 'Anthropic', groqModel: 'llama-3.3-70b-versatile', pricing: '$0.001/req' },
  { model: 'claude-3-sonnet', provider: 'Anthropic', groqModel: 'llama-3.1-70b-versatile', pricing: '$0.001/req' },
];

export default function AIGatewayPage() {
  const [groqStatus, setGroqStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  useEffect(() => {
    async function checkGroq() {
      try {
        const res = await fetch('https://rpc.satelink.network/health');
        if (res.ok) {
          setGroqStatus('online');
        } else {
          setGroqStatus('offline');
        }
      } catch {
        setGroqStatus('offline');
      }
    }
    checkGroq();
    const interval = setInterval(checkGroq, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold text-[#B0E4CC]">AI Gateway</h1>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#0c1a17] text-[#00D1FF] border border-[#1a3028] font-semibold">
              L9
            </span>
          </div>
          <p className="text-[11px] text-[#285A48] mt-0.5">
            OpenAI-compatible API powered by Groq
          </p>
        </div>
        <span
          className={`flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded border ${
            groqStatus === 'online'
              ? 'bg-[#0f2e1a] text-[#408A71] border-[#285A48]'
              : groqStatus === 'checking'
              ? 'bg-[#1a1a0f] text-[#a0a030] border-[#3a3e18]'
              : 'bg-[#2e0f0f] text-[#ff6b6b] border-[#5a2828]'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              groqStatus === 'online' ? 'bg-[#408A71]' : groqStatus === 'checking' ? 'bg-[#a0a030] animate-pulse' : 'bg-[#ff6b6b]'
            }`}
          />
          {groqStatus === 'online' ? 'ONLINE' : groqStatus === 'checking' ? 'CHECKING' : 'OFFLINE'}
        </span>
      </div>

      {/* Endpoint info */}
      <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-5">
        <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-2">API Endpoint</p>
        <div className="flex items-center gap-3 mb-4">
          <code className="text-[13px] font-mono text-[#00D1FF] flex-1">
            https://rpc.satelink.network/v1/chat/completions
          </code>
          <span className="text-[9px] px-2 py-0.5 rounded bg-[#0f2e1a] text-[#408A71] border border-[#285A48] font-semibold">
            LIVE
          </span>
        </div>

        <div className="bg-[#091413] border border-[#1a3028] rounded p-3">
          <p className="text-[10px] text-[#285A48] mb-2">Example Request</p>
          <pre className="text-[10px] font-mono text-[#408A71] overflow-x-auto">
{`curl https://rpc.satelink.network/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "Hello"}]}'`}
          </pre>
        </div>
      </div>

      {/* Model mapping */}
      <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a3028]">
          <p className="text-[12px] font-medium text-[#B0E4CC]">Model Mapping</p>
          <p className="text-[10px] text-[#285A48] mt-0.5">OpenAI models → Groq equivalents</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a3028] bg-[#091413]/50">
                {['Request Model', 'Provider', 'Actual Model', 'Pricing'].map((h) => (
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
              {MODELS.map((m, i) => (
                <tr key={i} className="border-b border-[#0f1d15] hover:bg-[#0f1e17] transition-colors">
                  <td className="px-4 py-2 font-mono text-[11px] text-[#B0E4CC]">{m.model}</td>
                  <td className="px-4 py-2 text-[11px] text-[#408A71]">{m.provider}</td>
                  <td className="px-4 py-2 font-mono text-[11px] text-[#00D1FF]">{m.groqModel}</td>
                  <td className="px-4 py-2 font-mono text-[11px] text-[#285A48]">{m.pricing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pricing info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
          <p className="text-[10px] text-[#285A48] uppercase tracking-wider">Base Price</p>
          <p className="text-[20px] font-bold font-mono text-[#00D1FF] mt-1">$0.001</p>
          <p className="text-[10px] text-[#285A48] mt-1">per request</p>
        </div>
        <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
          <p className="text-[10px] text-[#285A48] uppercase tracking-wider">Free Tier</p>
          <p className="text-[20px] font-bold font-mono text-[#408A71] mt-1">100%</p>
          <p className="text-[10px] text-[#285A48] mt-1">margin (Groq is free)</p>
        </div>
        <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
          <p className="text-[10px] text-[#285A48] uppercase tracking-wider">Revenue Split</p>
          <p className="text-[20px] font-bold font-mono text-[#B0E4CC] mt-1">50/30/20</p>
          <p className="text-[10px] text-[#285A48] mt-1">same as RPC</p>
        </div>
      </div>

      {/* Status */}
      <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
        <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-2">Layer 9 Status</p>
        <p className="text-[11px] text-[#408A71] leading-relaxed">
          AI Gateway is part of the Autonomous Economic Protocol Layer 9 (AI Inference Gateway).
          Currently operational with Groq as the inference provider. Revenue is metered per request
          and settled through the same epoch-based system as RPC traffic.
        </p>
      </div>
    </div>
  );
}
