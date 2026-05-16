'use client';

import { useEffect, useState } from 'react';

const TREASURY_ADDRESS = '0x966E1Ae22996545015b1414B35234b10719d7Ad4';
const USDT_CONTRACT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
const RPC_URL = 'https://rpc.satelink.network/rpc/polygon';

export default function TreasuryPage() {
  const [polBalance, setPolBalance] = useState<string | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBalances() {
      try {
        // Fetch POL balance
        const polRes = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [TREASURY_ADDRESS, 'latest'],
            id: 1,
          }),
        });
        const polData = await polRes.json();
        if (polData.result) {
          const wei = BigInt(polData.result);
          const pol = Number(wei) / 1e18;
          setPolBalance(pol.toFixed(4));
        }

        // Fetch USDT balance via eth_call
        const balanceOfData = '0x70a08231000000000000000000000000' + TREASURY_ADDRESS.slice(2);
        const usdtRes = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{ to: USDT_CONTRACT, data: balanceOfData }, 'latest'],
            id: 2,
          }),
        });
        const usdtData = await usdtRes.json();
        if (usdtData.result) {
          const raw = BigInt(usdtData.result);
          const usdt = Number(raw) / 1e6;
          setUsdtBalance(usdt.toFixed(2));
        }
      } catch (err) {
        console.error('Failed to fetch treasury balances:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchBalances();
    const interval = setInterval(fetchBalances, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[15px] font-semibold text-[#B0E4CC]">Treasury</h1>
        <p className="text-[11px] text-[#285A48] mt-0.5">
          Platform treasury on Polygon Mainnet
        </p>
      </div>

      {/* Treasury address */}
      <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-5">
        <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-2">Treasury Address</p>
        <div className="flex items-center gap-3">
          <code className="text-[13px] font-mono text-[#00D1FF] break-all flex-1">
            {TREASURY_ADDRESS}
          </code>
          <a
            href={`https://polygonscan.com/address/${TREASURY_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] px-2.5 py-1 rounded border border-[#285A48] text-[#408A71] hover:text-[#B0E4CC] hover:border-[#408A71] transition-colors"
          >
            View on Polygonscan ↗
          </a>
        </div>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-5">
          <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-2">POL Balance</p>
          {loading ? (
            <div className="h-8 w-32 bg-[#091413] rounded animate-pulse" />
          ) : (
            <p className="text-[24px] font-bold font-mono text-[#B0E4CC]">
              {polBalance ?? '—'} <span className="text-[14px] text-[#408A71]">POL</span>
            </p>
          )}
          <p className="text-[10px] text-[#285A48] mt-2">Native gas token</p>
        </div>

        <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-5">
          <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-2">USDT Balance</p>
          {loading ? (
            <div className="h-8 w-32 bg-[#091413] rounded animate-pulse" />
          ) : (
            <p className="text-[24px] font-bold font-mono text-[#00D1FF]">
              ${usdtBalance ?? '—'} <span className="text-[14px] text-[#408A71]">USDT</span>
            </p>
          )}
          <p className="text-[10px] text-[#285A48] mt-2">Settlement token</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-5">
        <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-3">Revenue Split</p>
        <div className="space-y-2">
          {[
            { label: 'Node Operators', pct: 50, color: '#408A71' },
            { label: 'Platform Fee', pct: 30, color: '#285A48' },
            { label: 'Distribution Pool', pct: 20, color: '#00D1FF' },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-[11px] text-[#B0E4CC]">{r.label}</span>
              </div>
              <span className="text-[12px] font-mono font-semibold" style={{ color: r.color }}>
                {r.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
