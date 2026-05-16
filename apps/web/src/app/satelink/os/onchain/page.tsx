'use client';

import { useEffect, useState } from 'react';

const CLAIMS_CONTRACT = '0x6987921e2453f360e314e4424F6c2789F10a1CC9';
const USDT_CONTRACT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
const RPC_URL = 'https://rpc.satelink.network/rpc/polygon';

export default function OnChainPage() {
  const [contractBalance, setContractBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const balanceOfData = '0x70a08231000000000000000000000000' + CLAIMS_CONTRACT.slice(2);
        const res = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{ to: USDT_CONTRACT, data: balanceOfData }, 'latest'],
            id: 1,
          }),
        });
        const data = await res.json();
        if (data.result) {
          const raw = BigInt(data.result);
          const usdt = Number(raw) / 1e6;
          setContractBalance(usdt.toFixed(2));
        }
      } catch (err) {
        console.error('Failed to fetch contract balance:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBalance();
    const interval = setInterval(fetchBalance, 60000);
    return () => clearInterval(interval);
  }, []);

  const hasFunds = contractBalance !== null && parseFloat(contractBalance) > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[15px] font-semibold text-[#B0E4CC]">On-Chain Settlement</h1>
        <p className="text-[11px] text-[#285A48] mt-0.5">
          Smart contract payout system on Polygon
        </p>
      </div>

      {/* Contract info */}
      <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-5">
        <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-2">Claims Contract</p>
        <div className="flex items-center gap-3 mb-4">
          <code className="text-[13px] font-mono text-[#00D1FF] break-all flex-1">
            {CLAIMS_CONTRACT}
          </code>
          <a
            href={`https://polygonscan.com/address/${CLAIMS_CONTRACT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] px-2.5 py-1 rounded border border-[#285A48] text-[#408A71] hover:text-[#B0E4CC] hover:border-[#408A71] transition-colors"
          >
            Polygonscan ↗
          </a>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-1">Chain</p>
            <p className="text-[14px] font-mono text-[#B0E4CC]">Polygon Mainnet (137)</p>
          </div>
          <div>
            <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-1">Contract USDT</p>
            {loading ? (
              <div className="h-5 w-20 bg-[#091413] rounded animate-pulse" />
            ) : (
              <p className={`text-[14px] font-mono ${hasFunds ? 'text-[#00D1FF]' : 'text-[#285A48]'}`}>
                ${contractBalance ?? '0.00'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Funding status */}
      {!loading && (
        <div
          className={`border rounded-md p-5 ${
            hasFunds
              ? 'bg-[#0f2e1a] border-[#285A48]'
              : 'bg-[#1a1a0f] border-[#3a3e18]'
          }`}
        >
          {hasFunds ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#408A71]" />
                <span className="text-[12px] font-medium text-[#408A71]">Contract Funded</span>
              </div>
              <p className="text-[11px] text-[#B0E4CC]">
                The claims contract has ${contractBalance} USDT available for payouts.
                Node operators can claim their earnings when they reach the minimum threshold.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#a0a030]" />
                <span className="text-[12px] font-medium text-[#a0a030]">Awaiting Funding</span>
              </div>
              <p className="text-[11px] text-[#B0E4CC] mb-3">
                To enable payouts, fund the ClaimsContract with USDT on Polygon.
              </p>
              <p className="text-[10px] text-[#285A48]">
                Send USDT to: <code className="text-[#408A71]">{CLAIMS_CONTRACT}</code>
              </p>
            </>
          )}
        </div>
      )}

      {/* Settlement flow */}
      <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-5">
        <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-3">Settlement Flow</p>
        <div className="space-y-3">
          {[
            { step: 1, label: 'Revenue Recorded', desc: 'RPC calls generate metered revenue events' },
            { step: 2, label: 'Epoch Closes', desc: 'Every 60s, epoch settles and splits revenue 50/30/20' },
            { step: 3, label: 'Signature Generated', desc: 'Backend signs claim authorization for node' },
            { step: 4, label: 'On-Chain Claim', desc: 'Node operator submits signature to ClaimsContract' },
            { step: 5, label: 'USDT Transferred', desc: 'Contract transfers earned USDT to operator wallet' },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-[#091413] border border-[#285A48] flex items-center justify-center text-[9px] text-[#408A71] flex-shrink-0">
                {s.step}
              </span>
              <div>
                <p className="text-[11px] text-[#B0E4CC]">{s.label}</p>
                <p className="text-[10px] text-[#285A48]">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contract addresses */}
      <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
        <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-2">Related Contracts</p>
        <div className="space-y-2 text-[10px]">
          <div className="flex justify-between">
            <span className="text-[#285A48]">USDT (Polygon)</span>
            <a
              href={`https://polygonscan.com/token/${USDT_CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[#408A71] hover:text-[#B0E4CC]"
            >
              {USDT_CONTRACT.slice(0, 10)}...
            </a>
          </div>
          <div className="flex justify-between">
            <span className="text-[#285A48]">ClaimsContract</span>
            <a
              href={`https://polygonscan.com/address/${CLAIMS_CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[#408A71] hover:text-[#B0E4CC]"
            >
              {CLAIMS_CONTRACT.slice(0, 10)}...
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
