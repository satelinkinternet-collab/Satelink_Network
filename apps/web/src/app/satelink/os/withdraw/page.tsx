'use client';

import { ClaimButton } from '@/components/payout/ClaimButton';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';

const NODE_ID = 'NODE-ap-south-1-a09becbb';
const API = 'https://rpc.satelink.network';
const CLAIMS_CONTRACT = '0xE475c53B88190FD2130dB1E37504991EFe283fb0';

export default function WithdrawPage() {
  const { isConnected } = useAccount();
  const [epochs, setEpochs] = useState<any[]>([]);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('satelink_token') || '';
    setJwtToken(token);

    fetch(`${API}/api/epochs`)
      .then((r) => r.json())
      .then((d) => setEpochs(d.epochs || []))
      .catch(() => {});
  }, []);

  const total = epochs.reduce((s, e) => s + parseFloat(e.total || e.total_revenue_usdt || 0), 0);
  const nodeEarnings = total * 0.5;
  const platform = total * 0.3;

  return (
    <div className="min-h-screen bg-[#091413] p-6 font-['Inter',sans-serif]">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-[18px] font-semibold text-[#B0E4CC] tracking-tight">Claim Earnings</h1>
          <p className="text-[12px] text-[#408A71] mt-1">
            Node operator earnings · Polygon Mainnet · USDT settlement
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Revenue', value: `$${total.toFixed(6)}`, glow: false },
            { label: 'Your Earnings (50%)', value: `$${nodeEarnings.toFixed(6)}`, glow: true },
            { label: 'Platform (30%)', value: `$${platform.toFixed(6)}`, glow: false },
          ].map((m) => (
            <div key={m.label} className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
              <p className="text-[10px] text-[#285A48] uppercase tracking-wider">{m.label}</p>
              <p
                className={`text-[18px] font-semibold font-mono mt-1.5 ${
                  m.glow ? 'text-[#00D1FF]' : 'text-[#B0E4CC]'
                }`}
              >
                {m.value}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-5 mb-4">
          <h2 className="text-[12px] font-medium text-[#B0E4CC] mb-4">
            {isConnected ? 'Claim to connected wallet' : 'Connect wallet to claim'}
          </h2>
          {nodeEarnings < 1 ? (
            <div className="text-center py-6">
              <p className="text-[12px] text-[#408A71]">${nodeEarnings.toFixed(6)} earned</p>
              <p className="text-[11px] text-[#285A48] mt-1">
                Minimum $1.00 USDT required · ${Math.max(0, 1 - nodeEarnings).toFixed(6)} more needed
              </p>
            </div>
          ) : !jwtToken ? (
            <div className="text-center py-6">
              <p className="text-[12px] text-[#c04040]">No auth token found</p>
              <p className="text-[11px] text-[#285A48] mt-1">
                Please log in from the dashboard first
              </p>
            </div>
          ) : (
            <ClaimButton nodeId={NODE_ID} jwtToken={jwtToken} onSuccess={(tx) => setLastTx(tx)} />
          )}
        </div>

        {lastTx && (
          <div className="bg-[#0c2219] border border-[#285A48] rounded-md p-4 text-[11px] mb-4">
            <p className="text-[#408A71] mb-1">Last transaction</p>
            <a
              href={`https://polygonscan.com/tx/${lastTx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[#00D1FF] break-all hover:underline"
            >
              {lastTx}
            </a>
          </div>
        )}

        <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
          <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-2">How it works</p>
          {[
            '1. Connect your Polygon wallet',
            '2. Click Claim — backend generates EIP-712 signature',
            '3. Wallet popup appears — one click to confirm',
            '4. USDT transfers to your wallet on Polygon',
          ].map((s, i) => (
            <p key={i} className="text-[11px] text-[#408A71] mb-1">
              {s}
            </p>
          ))}
        </div>

        <div className="mt-4 p-3 bg-[#091413] border border-[#1a3028] rounded-md">
          <p className="text-[10px] text-[#285A48]">
            Contract:{' '}
            <a
              href={`https://polygonscan.com/address/${CLAIMS_CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[#408A71] hover:text-[#00D1FF]"
            >
              {CLAIMS_CONTRACT}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
