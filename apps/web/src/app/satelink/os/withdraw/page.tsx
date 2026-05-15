'use client';
// v2 - Auto-fetch JWT, no localStorage dependency
import { useState, useEffect } from 'react';
import { ClaimButton } from '@/components/payout/ClaimButton';

const API = 'https://rpc.satelink.network';
const CLAIMS_CONTRACT = '0xE475c53B88190FD2130dB1E37504991EFe283fb0';

export default function WithdrawPage() {
  const [epochs, setEpochs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastTx, setLastTx] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/epochs`)
      .then(r => r.json())
      .then(d => { setEpochs(d.epochs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const total    = epochs.reduce((s,e) => s + parseFloat(e.total_revenue_usdt||0), 0);
  const nodePool = epochs.reduce((s,e) => s + parseFloat(e.node_pool_usdt||0), 0);
  const platform = epochs.reduce((s,e) => s + parseFloat(e.platform_share_usdt||0), 0);
  const canClaim = nodePool >= 1.0;

  return (
    <div className="min-h-screen bg-[#091413] p-6
                    font-['Inter',-apple-system,sans-serif]">
      <div className="max-w-xl mx-auto">

        <div className="mb-7">
          <h1 className="text-[18px] font-semibold text-[#B0E4CC] tracking-tight">
            Claim Earnings
          </h1>
          <p className="text-[12px] text-[#408A71] mt-1">
            Node operator · Polygon Mainnet · USDT
          </p>
        </div>

        {/* Revenue summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {loading ? (
            Array.from({length:3}).map((_,i) => (
              <div key={i} className="bg-[#0c1a17] border border-[#1a3028]
                                      rounded-md p-4 animate-pulse h-20" />
            ))
          ) : [
            { label:'Total Revenue',    value:`$${total.toFixed(6)}`,    glow:false },
            { label:'Your Share (50%)', value:`$${nodePool.toFixed(6)}`, glow:true  },
            { label:'Platform (30%)',   value:`$${platform.toFixed(6)}`, glow:false },
          ].map(m => (
            <div key={m.label}
                 className="bg-[#0c1a17] border border-[#1a3028]
                            rounded-md p-4 hover:border-[#285A48]
                            transition-colors">
              <p className="text-[10px] text-[#285A48] uppercase
                            tracking-wider font-semibold">
                {m.label}
              </p>
              <p className={`text-[17px] font-semibold font-mono
                             mt-1.5 tracking-tight ${
                m.glow ? 'text-[#00D1FF]' : 'text-[#B0E4CC]'
              }`}>
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {/* Claim widget */}
        <div className="bg-[#0c1a17] border border-[#1a3028]
                        rounded-md p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-medium text-[#B0E4CC]">
              Claim to Wallet
            </h2>
            <span className={`text-[9px] px-2 py-0.5 rounded border
                              font-semibold tracking-wider ${
              canClaim
                ? 'bg-[#0f2e1a] text-[#408A71] border-[#285A48]'
                : 'bg-[#1a1a0f] text-[#a0a030] border-[#3a3e18]'
            }`}>
              {canClaim ? '● CLAIMABLE' : '○ ACCUMULATING'}
            </span>
          </div>

          {!canClaim ? (
            <div className="py-4 text-center">
              <p className="text-[13px] text-[#408A71] font-mono">
                ${nodePool.toFixed(6)} earned
              </p>
              <p className="text-[11px] text-[#285A48] mt-1">
                Minimum $1.00 USDT to claim
              </p>
              <div className="mt-3 h-1.5 bg-[#091413] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#408A71] rounded-full transition-all"
                  style={{ width:`${Math.min(100,(nodePool/1)*100)}%` }}
                />
              </div>
              <p className="text-[10px] text-[#285A48] mt-1.5">
                ${Math.max(0, 1 - nodePool).toFixed(6)} more needed
              </p>
            </div>
          ) : (
            <ClaimButton onSuccess={(tx) => setLastTx(tx)} />
          )}
        </div>

        {/* Last transaction */}
        {lastTx && (
          <div className="bg-[#0c2219] border border-[#285A48]
                          rounded-md p-4 mb-4">
            <p className="text-[10px] text-[#285A48] uppercase
                          tracking-wider mb-1.5">
              Last transaction
            </p>
            <a href={`https://polygonscan.com/tx/${lastTx}`}
               target="_blank" rel="noopener noreferrer"
               className="text-[10px] font-mono text-[#00D1FF]
                          break-all hover:underline">
              {lastTx}
            </a>
          </div>
        )}

        {/* How it works */}
        <div className="bg-[#0c1a17] border border-[#1a3028]
                        rounded-md p-4">
          <p className="text-[10px] text-[#285A48] uppercase
                        tracking-wider mb-3 font-semibold">
            How it works
          </p>
          {[
            ['Connect', 'Connect your Polygon wallet above'],
            ['Claim',   'Click Claim — backend signs the payload automatically'],
            ['Confirm', 'One wallet confirmation — no manual parameters'],
            ['Receive', 'USDT arrives in your wallet on Polygon Mainnet'],
          ].map(([t,d]) => (
            <div key={t} className="flex gap-3 mb-2">
              <span className="text-[10px] font-semibold text-[#408A71]
                               min-w-[52px]">{t}</span>
              <span className="text-[11px] text-[#285A48]">{d}</span>
            </div>
          ))}
        </div>

        {/* Contract info */}
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
