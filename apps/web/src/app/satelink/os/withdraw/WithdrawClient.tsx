'use client';
// SATELINK-WITHDRAW-V4 — client-only, no SSR, no auth gate
import { useState, useEffect } from 'react';
import { ClaimButton } from '@/components/payout/ClaimButton';

const API = 'https://rpc.satelink.network';

export default function WithdrawClient() {
  const [rev, setRev] = useState<any>(null);
  const [tx,  setTx]  = useState<string|null>(null);

  useEffect(()=>{
    fetch(`${API}/api/epochs`).then(r=>r.json()).then(d=>{
      const ep = d.epochs||[];
      const total    = ep.reduce((s:number,e:any)=>s+parseFloat(e.total_revenue_usdt||0),0);
      const nodePool = ep.reduce((s:number,e:any)=>s+parseFloat(e.node_pool_usdt||0),0);
      const platform = ep.reduce((s:number,e:any)=>s+parseFloat(e.platform_share_usdt||0),0);
      const distrib  = ep.reduce((s:number,e:any)=>s+parseFloat(e.distributor_share_usdt||0),0);
      setRev({total,nodePool,platform,distrib,canClaim:nodePool>=1});
    }).catch(console.error);
  },[]);

  // Fetch claimable from claim endpoint (more accurate)
  useEffect(() => {
    const TOKEN_ENDPOINT = `${API}/api/auth/node-token`;
    const NODE = 'NODE-ap-south-1-a09becbb';
    const WALLET = '0x966E1Ae22996545015b1414B35234b10719d7Ad4';

    fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId: NODE, walletAddress: WALLET }),
    })
    .then(r => r.json())
    .then(auth => {
      if (!auth.token) return;
      return fetch(`${API}/api/nodes/${NODE}/claim`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: WALLET }),
      });
    })
    .then(r => r?.json())
    .then(data => {
      if (data?.success || data?.signature) {
        const sig = data.signature || data;
        const claimable = parseFloat(sig.amount || '0');
        if (claimable > 0) {
          setRev((prev: any) => prev ? {...prev, nodePool: claimable, canClaim: claimable >= 0.01} : null);
        }
      }
    })
    .catch(console.error);
  }, []);

  const f = (n:number) => `$${n.toFixed(6)}`;

  return (
    <div className="min-h-screen bg-[#091413] p-6">
      <div className="max-w-xl mx-auto">

        <div className="mb-6">
          <h1 className="text-[18px] font-semibold text-[#B0E4CC] tracking-tight">
            Revenue Withdrawal
          </h1>
          <p className="text-[12px] text-[#408A71] mt-1">
            Polygon Mainnet · USDT · Smart contract settlement
          </p>
        </div>

        {/* Revenue summary */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {!rev ? (
            Array.from({length:4}).map((_,i)=>(
              <div key={i} className="bg-[#0c1a17] border border-[#1a3028]
                                      rounded h-20 animate-pulse"/>
            ))
          ) : [
            {label:'Total Revenue',    value:f(rev.total),    glow:false},
            {label:'Node Earnings 50%',value:f(rev.nodePool), glow:true },
            {label:'Platform Fee 30%', value:f(rev.platform), glow:false},
            {label:'Distribution 20%', value:f(rev.distrib),  glow:false},
          ].map(m=>(
            <div key={m.label}
                 className="bg-[#0c1a17] border border-[#1a3028] rounded p-4
                            hover:border-[#285A48] transition-colors">
              <p className="text-[10px] text-[#285A48] uppercase tracking-wider">
                {m.label}
              </p>
              <p className={`text-[16px] font-semibold font-mono mt-1.5 ${
                m.glow ? 'text-[#00D1FF]' : 'text-[#B0E4CC]'
              }`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* CLAIM SECTION */}
        <div className="bg-[#0c1a17] border border-[#1a3028] rounded p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-medium text-[#B0E4CC]">
              Node Operator Claim
            </h2>
            {rev && (
              <span className={`text-[9px] px-2 py-0.5 rounded border
                                font-semibold tracking-wider ${
                rev.canClaim
                  ? 'bg-[#0f2e1a] text-[#408A71] border-[#285A48]'
                  : 'bg-[#1a1a0f] text-[#a0a030] border-[#3a3e18]'
              }`}>
                {rev.canClaim ? '● READY' : '○ ACCUMULATING'}
              </span>
            )}
          </div>

          {rev && !rev.canClaim ? (
            <div className="text-center py-4">
              <p className="text-[13px] text-[#408A71] font-mono">
                {f(rev.nodePool)} earned
              </p>
              <div className="mt-3 h-1 bg-[#091413] rounded-full overflow-hidden">
                <div className="h-full bg-[#408A71] rounded-full transition-all"
                     style={{width:`${Math.min(100,rev.nodePool*100)}%`}}/>
              </div>
              <p className="text-[10px] text-[#285A48] mt-1.5">
                ${(Math.max(0,1-rev.nodePool)).toFixed(6)} more to reach $1.00 minimum
              </p>
            </div>
          ) : (
            <ClaimButton onSuccess={h=>setTx(h)} />
          )}
        </div>

        {/* DISTRIBUTOR SECTION */}
        <div className="bg-[#0c1a17] border border-[#1a3028] rounded p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-medium text-[#B0E4CC]">
              Distribution Pool
            </h2>
            <span className="text-[9px] px-2 py-0.5 rounded border
                              bg-[#1a1a0f] text-[#a0a030] border-[#3a3e18]
                              font-semibold tracking-wider">
              PHASE 2
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-[10px] text-[#285A48] uppercase tracking-wider">
                Pool Balance
              </p>
              <p className="text-[16px] font-semibold font-mono text-[#B0E4CC] mt-1">
                {rev ? f(rev.distrib) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#285A48] uppercase tracking-wider">
                Your Share
              </p>
              <p className="text-[16px] font-semibold font-mono text-[#285A48] mt-1">
                $0.000000
              </p>
            </div>
          </div>
          <div className="p-3 bg-[#091413] border border-[#1a3028] rounded">
            <p className="text-[10px] text-[#285A48]">
              Distributor payouts launch in Phase 2 when node
              operator count reaches 10+. The distribution pool
              accumulates automatically at 20% of all revenue.
            </p>
          </div>
        </div>

        {tx && (
          <div className="bg-[#0c2219] border border-[#285A48] rounded p-4 mb-4">
            <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-1">
              Transaction confirmed
            </p>
            <a href={`https://polygonscan.com/tx/${tx}`} target="_blank"
               rel="noopener" className="text-[10px] font-mono text-[#00D1FF]
               break-all hover:underline">{tx}</a>
          </div>
        )}

        <div className="bg-[#0c1a17] border border-[#1a3028] rounded p-4">
          <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-2">
            Revenue split · on-chain enforced
          </p>
          {[
            {role:'Node Operators', pct:50, col:'#408A71'},
            {role:'Platform Fee',   pct:30, col:'#285A48'},
            {role:'Distribution',   pct:20, col:'#00D1FF'},
          ].map(r=>(
            <div key={r.role} className="mb-2.5">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#B0E4CC]">{r.role}</span>
                <span className="font-semibold font-mono"
                      style={{color:r.col}}>{r.pct}%</span>
              </div>
              <div className="h-1 bg-[#091413] rounded-full overflow-hidden">
                <div className="h-full rounded-full"
                     style={{width:`${r.pct}%`,background:r.col}}/>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-[#1a3028] mt-3 font-mono">
            ClaimsContract: 0xE475c53B...fb0 · Polygon 137
          </p>
        </div>

      </div>
    </div>
  );
}
