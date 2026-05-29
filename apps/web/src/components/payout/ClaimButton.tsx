'use client';
// SATELINK-CLAIMBUTTON-V8 — direct backend calls (CORS fixed on backend)
import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

const API = 'https://rpc.satelink.network';
const CTR = '0x6987921e2453f360e314e4424F6c2789F10a1CC9' as const;
const ABI = [{
  name: 'claim', type: 'function', stateMutability: 'nonpayable',
  inputs: [
    { name: 'nodeId',    type: 'string'  },
    { name: 'amount',    type: 'uint256' },
    { name: 'nonce',     type: 'uint256' },
    { name: 'expiry',    type: 'uint256' },
    { name: 'signature', type: 'bytes'   },
  ],
  outputs: [],
}] as const;

interface ClaimButtonProps {
  nodeId: string;
  walletAddress: string;
  onSuccess?: (txHash: string) => void;
}

type S = 'idle' | 'auth' | 'prep' | 'sign' | 'wait' | 'done' | 'err';

export function ClaimButton({ nodeId, walletAddress, onSuccess }: ClaimButtonProps) {
  const [s, setS]   = useState<S>('idle');
  const [err, setE] = useState('');
  const [tx, setTx] = useState<`0x${string}` | null>(null);
  const { writeContractAsync } = useWriteContract();
  const { isLoading: waiting, isSuccess: done } =
    useWaitForTransactionReceipt({ hash: tx ?? undefined });

  async function go() {
    if (!walletAddress) return;
    setE('');
    try {
      // Step 1: Get auth token
      setS('auth');
      const authRes = await fetch(`${API}/api/auth/node-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, walletAddress }),
      });

      if (!authRes.ok) {
        const text = await authRes.text();
        throw new Error(`Auth failed: ${text.slice(0, 60)}`);
      }

      const auth = await authRes.json();
      if (!auth.ok || !auth.token) {
        throw new Error(auth.error || 'Auth failed');
      }

      // Step 2: Get claim signature
      setS('prep');
      const claimRes = await fetch(`${API}/api/nodes/${nodeId}/claim`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      if (!claimRes.ok) {
        const text = await claimRes.text();
        throw new Error(`Claim failed: ${text.slice(0, 60)}`);
      }

      const c = await claimRes.json();
      console.log('[ClaimButton] claim response:', JSON.stringify(c).slice(0, 300));

      if (!c.success && !c.signature) {
        throw new Error(c.error || 'Need $1.00 minimum');
      }

      const sig = c.signature || c;

      // Handle both wei and USD formats
      let weiAmount: bigint;
      if (sig.amountWei && parseInt(String(sig.amountWei)) > 1000) {
        weiAmount = BigInt(sig.amountWei);
      } else if (sig.amount && parseInt(String(sig.amount)) > 1000) {
        weiAmount = BigInt(sig.amount);
      } else {
        const usdAmount = parseFloat(sig.amount_usdt || sig.amount || '0');
        weiAmount = BigInt(Math.round(usdAmount * 1_000_000));
      }

      setS('sign');
      const h = await writeContractAsync({
        address: CTR,
        abi: ABI,
        functionName: 'claim',
        chainId: 137,
        args: [
          nodeId,
          weiAmount,
          BigInt(sig.nonce),
          BigInt(sig.expiry),
          sig.signature as `0x${string}`,
        ],
      });
      setTx(h);
      setS('wait');
      onSuccess?.(h);
    } catch (e: any) {
      console.error('[ClaimButton] error:', e);
      setE(String(e?.message || e).slice(0, 160));
      setS('err');
    }
  }

  if ((s === 'wait' || waiting) && tx) return (
    <div className="space-y-2">
      <div className="flex gap-3 items-center p-3 bg-[#0c1a17]
                      border border-[#285A48] rounded">
        <div className="w-4 h-4 border-2 border-t-[#408A71]
                        border-[#285A48] rounded-full animate-spin"/>
        <p className="text-[12px] text-[#B0E4CC]">Confirming on Polygon...</p>
      </div>
      <a href={`https://polygonscan.com/tx/${tx}`} target="_blank"
         rel="noopener" className="text-[10px] font-mono text-[#285A48]
         hover:text-[#408A71] block text-center">{tx.slice(0, 24)}... ↗</a>
    </div>
  );

  if (done && tx) return (
    <div className="p-4 bg-[#0c2219] border border-[#285A48] rounded space-y-2">
      <p className="text-[13px] font-semibold text-[#B0E4CC]">✓ USDT claimed</p>
      <a href={`https://polygonscan.com/tx/${tx}`} target="_blank"
         rel="noopener" className="text-[10px] font-mono text-[#00D1FF]
         break-all hover:underline">{tx}</a>
    </div>
  );

  const busy = ['auth', 'prep', 'sign'].includes(s);
  const lab: Record<S, string> = {
    idle: 'Claim Earnings → USDT',
    auth: 'Authenticating...',
    prep: 'Preparing signature...',
    sign: 'Confirm in wallet...',
    wait: 'Confirming...',
    done: 'Claimed ✓',
    err:  'Retry Claim',
  };

  return (
    <div className="space-y-2">
      {err && (
        <div className="p-3 bg-[#1a0f0f] border border-[#3e1818]
                        rounded text-[11px] text-[#c04040]">{err}</div>
      )}
      <div className="flex items-center gap-2 text-[11px] text-[#285A48] mb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#408A71]"/>
        {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)} · Polygon 137
      </div>
      <button onClick={go} disabled={busy}
        className="w-full py-3 bg-[#408A71] text-[#091413] font-semibold
                   text-[13px] rounded hover:bg-[#4fa07f] transition-colors
                   disabled:opacity-40 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2">
        {busy && <div className="w-3.5 h-3.5 border-2 border-[#091413]/30
                                 border-t-[#091413] rounded-full animate-spin"/>}
        {lab[s]}
      </button>
    </div>
  );
}
