'use client';
import { useState } from 'react';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt
} from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const API = 'https://rpc.satelink.network';
const CONTRACT = '0xE475c53B88190FD2130dB1E37504991EFe283fb0' as const;
const NODE_ID = 'NODE-ap-south-1-a09becbb';

const ABI = [
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nodeId',    type: 'string'  },
      { name: 'amount',    type: 'uint256' },
      { name: 'nonce',     type: 'uint256' },
      { name: 'expiry',    type: 'uint256' },
      { name: 'signature', type: 'bytes'   },
    ],
    outputs: [],
  }
] as const;

type Step = 'idle'|'auth'|'preparing'|'signing'|'confirming'|'done'|'error';

export function ClaimButton({ onSuccess }: {
  onSuccess?: (txHash: string) => void
}) {
  const { address, isConnected } = useAccount();
  const [step, setStep]   = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const { writeContractAsync } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  async function handleClaim() {
    if (!address || !isConnected) return;
    setError(null);

    try {
      // Step 1: Get a real signed JWT from backend
      setStep('auth');
      const authRes = await fetch(`${API}/api/auth/node-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: NODE_ID,
          walletAddress: address
        }),
      });
      const authData = await authRes.json();
      if (!authData.ok || !authData.token) {
        throw new Error(authData.error || 'Auth failed');
      }
      const jwt = authData.token;

      // Step 2: Get EIP-712 signed claim payload from backend
      setStep('preparing');
      const claimRes = await fetch(
        `${API}/api/nodes/${NODE_ID}/claim`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ walletAddress: address }),
        }
      );
      const claimData = await claimRes.json();

      if (!claimData.success && !claimData.signature) {
        throw new Error(
          claimData.error ||
          `Not enough earnings. Need $1.00 minimum.`
        );
      }

      const sig = claimData.signature || claimData;
      const amount    = BigInt(sig.amountWei ?? sig.amount ?? 0);
      const nonce     = BigInt(sig.nonce);
      const expiry    = BigInt(sig.expiry);
      const signature = sig.signature as `0x${string}`;

      // Step 3: Call claim() via wallet (automatic popup)
      setStep('signing');
      const hash = await writeContractAsync({
        address: CONTRACT,
        abi: ABI,
        functionName: 'claim',
        args: [NODE_ID, amount, nonce, expiry, signature],
        chainId: 137,
      });

      setTxHash(hash);
      setStep('confirming');
      onSuccess?.(hash);

    } catch (e: any) {
      const msg = e?.message || String(e);
      setError(
        msg.includes('User rejected') || msg.includes('denied')
          ? 'Transaction cancelled in wallet'
          : msg.includes('minimum') || msg.includes('1.00')
          ? msg
          : `Claim failed: ${msg.slice(0, 120)}`
      );
      setStep('error');
    }
  }

  const stepLabels: Record<Step, string> = {
    idle:       'Claim Earnings → USDT',
    auth:       'Authenticating...',
    preparing:  'Preparing signature...',
    signing:    'Confirm in wallet...',
    confirming: 'Confirming on Polygon...',
    done:       'Claimed ✓',
    error:      'Retry Claim',
  };

  if (!isConnected) {
    return (
      <div className="space-y-3">
        <p className="text-[11px] text-[#285A48]">
          Connect your Polygon wallet to claim earnings
        </p>
        <ConnectButton />
      </div>
    );
  }

  if ((step === 'confirming' || confirming) && txHash) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 bg-[#0c1a17]
                        border border-[#285A48] rounded-md">
          <div className="w-4 h-4 border-2 border-[#285A48]
                          border-t-[#408A71] rounded-full animate-spin
                          flex-shrink-0" />
          <div>
            <p className="text-[12px] text-[#B0E4CC] font-medium">
              Confirming on Polygon Mainnet...
            </p>
            <p className="text-[10px] text-[#285A48] font-mono mt-0.5">
              {txHash.slice(0, 22)}...
            </p>
          </div>
        </div>
        <a href={`https://polygonscan.com/tx/${txHash}`}
           target="_blank" rel="noopener noreferrer"
           className="block text-center text-[10px] text-[#285A48]
                      hover:text-[#408A71] transition-colors font-mono">
          View on Polygonscan ↗
        </a>
      </div>
    );
  }

  if (confirmed && txHash) {
    return (
      <div className="p-4 bg-[#0c2219] border border-[#285A48] rounded-md
                      space-y-2">
        <p className="text-[13px] font-semibold text-[#B0E4CC]">
          ✓ USDT claimed successfully
        </p>
        <p className="text-[10px] text-[#285A48]">
          Funds transferred to your wallet on Polygon Mainnet
        </p>
        <a href={`https://polygonscan.com/tx/${txHash}`}
           target="_blank" rel="noopener noreferrer"
           className="block text-[10px] font-mono text-[#00D1FF]
                      break-all hover:underline">
          {txHash}
        </a>
      </div>
    );
  }

  const busy = ['auth','preparing','signing'].includes(step);

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-[#1a0f0f] border border-[#3e1818]
                        rounded-md text-[11px] text-[#c04040] leading-relaxed">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px] text-[#285A48] mb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#408A71] flex-shrink-0" />
        {address?.slice(0, 6)}...{address?.slice(-4)} · Polygon
      </div>

      <button
        onClick={handleClaim}
        disabled={busy}
        className="w-full py-3 bg-[#408A71] text-[#091413] font-semibold
                   text-[13px] rounded-md hover:bg-[#4fa07f]
                   transition-colors duration-150
                   disabled:opacity-40 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2"
      >
        {busy && (
          <div className="w-3.5 h-3.5 border-2 border-[#091413]/30
                          border-t-[#091413] rounded-full animate-spin" />
        )}
        {stepLabels[step]}
      </button>
    </div>
  );
}
