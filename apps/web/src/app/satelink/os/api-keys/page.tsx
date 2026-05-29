'use client';
import { useState, useEffect } from 'react';

const API = 'https://rpc.satelink.network';

export default function ApiKeysPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#091413] p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-[18px] font-semibold text-[#B0E4CC] tracking-tight">
            API Keys
          </h1>
          <p className="text-[12px] text-[#408A71] mt-1">
            Manage API keys for authenticated RPC access
          </p>
        </div>

        <div className="bg-[#0c1a17] border border-[#1a3028] rounded p-5 mb-4">
          <p className="text-[12px] font-medium text-[#B0E4CC] mb-3">
            Free Tier
          </p>
          <p className="text-[11px] text-[#408A71] mb-4">
            No API key required. Use the public RPC endpoint directly.
          </p>
          <div className="bg-[#060e0b] border border-[#1a3028] rounded p-3
                          font-mono text-[11px] text-[#408A71]">
            https://rpc.satelink.network/rpc/polygon
          </div>
          <p className="text-[10px] text-[#285A48] mt-2">
            Free tier: 200 requests/day per IP
          </p>
        </div>

        <div className="bg-[#0c1a17] border border-[#1a3028] rounded p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-medium text-[#B0E4CC]">
              API Tiers
            </p>
          </div>
          {[
            { tier: 'Free',       rate: '200/day',   price: '$0',          desc: 'No key required' },
            { tier: 'Basic',      rate: '10K/day',   price: '$9/month',    desc: 'sk_basic_...' },
            { tier: 'Pro',        rate: '100K/day',  price: '$49/month',   desc: 'sk_pro_...' },
            { tier: 'Enterprise', rate: '1M/day',    price: 'Contact us',  desc: 'sk_ent_...' },
          ].map(t => (
            <div key={t.tier}
                 className="flex items-center justify-between py-2.5
                            border-b border-[#1a3028] last:border-0">
              <div>
                <span className="text-[12px] text-[#B0E4CC]">{t.tier}</span>
                <span className="text-[10px] text-[#285A48] ml-3">{t.rate}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#408A71]">{t.price}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#0c1a17] border border-[#1a3028] rounded p-5 mb-4">
          <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-3">
            Supported Chains
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'Polygon', id: '137', ep: '/rpc/polygon' },
              { name: 'Ethereum', id: '1', ep: '/rpc/ethereum' },
              { name: 'Arbitrum', id: '42161', ep: '/rpc/arbitrum' },
              { name: 'Base', id: '8453', ep: '/rpc/base' },
              { name: 'Polygon Amoy', id: '80002', ep: '/rpc/amoy' },
            ].map(c => (
              <div key={c.id} className="bg-[#060e0b] border border-[#1a3028] rounded p-2">
                <p className="text-[11px] text-[#B0E4CC]">{c.name}</p>
                <p className="text-[9px] text-[#285A48] font-mono">
                  Chain {c.id} · {c.ep}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0c1a17] border border-[#1a3028] rounded p-5">
          <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-2">
            Usage with API key
          </p>
          <div className="bg-[#060e0b] border border-[#1a3028] rounded p-3
                          font-mono text-[10px] text-[#408A71] space-y-1">
            <div>curl -X POST https://rpc.satelink.network/rpc/polygon \</div>
            <div className="pl-4">-H &quot;X-API-Key: sk_your_key&quot; \</div>
            <div className="pl-4">-d &apos;&#123;&quot;jsonrpc&quot;:&quot;2.0&quot;,&quot;method&quot;:&quot;eth_blockNumber&quot;&#125;&apos;</div>
          </div>
          <p className="text-[10px] text-[#285A48] mt-3">
            API key management coming soon. Contact satelinknetwork@gmail.com
          </p>
        </div>

      </div>
    </div>
  );
}
