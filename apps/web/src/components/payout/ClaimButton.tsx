'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CLAIMS_ABI, CLAIMS_CONTRACT } from '@/lib/wallet/claims-abi';

const API = 'https://rpc.satelink.network';

interface ClaimButtonProps {
  nodeId: string;
  jwtToken: string;
  onSuccess?: (txHash: string, amount: string) => void;
}

export function ClaimButton({ nodeId, jwtToken, onSuccess }: ClaimButtonProps) {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<'idle' | 'preparing' | 'signing' | 'confirming' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [claimData, setClaimData] = useState<any>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  async function handleClaim() {
    if (!address || !isConnected) return;
    setError(null);
    setStep('preparing');

    try {
      const res = await fetch(`${API}/api/nodes/${nodeId}/claim`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = await res.json();

      if (!data.success && !data.signature) {
        throw new Error(data.error || 'Failed to prepare claim');
      }

      const sig = data.signature || data;
      setClaimData(sig);
      setStep('signing');

      const hash = await writeContractAsync({
        address: CLAIMS_CONTRACT as `0x${string}`,
        abi: CLAIMS_ABI,
        functionName: 'claim',
        args: [
          sig.nodeId || nodeId,
          BigInt(sig.amountWei || 0),
          BigInt(sig.nonce),
          BigInt(sig.expiry),
          sig.signature as `0x${string}`,
        ],
        chainId: 137,
      });

      setTxHash(hash);
      setStep('confirming');
      onSuccess?.(hash, sig.amount || '0');
    } catch (e: any) {
      setError(
        e.message?.includes('User rejected') ? 'Transaction cancelled' : e.message || 'Claim failed'
      );
      setStep('error');
    }
  }

  if (step === 'confirming' || (txHash && isConfirming)) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 bg-[#0c1a17] border border-[#285A48] rounded-md">
          <div className="w-4 h-4 border-2 border-[#285A48] border-t-[#408A71] rounded-full animate-spin" />
          <div>
            <p className="text-[12px] text-[#B0E4CC] font-medium">Confirming on Polygon...</p>
            <p className="text-[10px] text-[#285A48] font-mono mt-0.5">{txHash?.slice(0, 20)}...</p>
          </div>
        </div>
        {txHash && (
          <a
            href={`https://polygonscan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-[11px] text-[#285A48] hover:text-[#408A71] transition-colors"
          >
            View on Polygonscan
          </a>
        )}
      </div>
    );
  }

  if (isConfirmed && txHash) {
    return (
      <div className="p-4 bg-[#0c2219] border border-[#285A48] rounded-md">
        <p className="text-[12px] font-medium text-[#B0E4CC] mb-1">USDT claimed successfully</p>
        <a
          href={`https://polygonscan.com/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-mono text-[#408A71] hover:text-[#00D1FF] transition-colors break-all"
        >
          {txHash}
        </a>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="space-y-3">
        <p className="text-[11px] text-[#285A48]">Connect your Polygon wallet to claim earnings</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-[#1a0f0f] border border-[#3e1818] rounded text-[11px] text-[#c04040]">
          {error}
        </div>
      )}
      <div className="flex items-center gap-2 text-[11px] text-[#285A48] mb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#408A71]" />
        Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
      </div>
      <button
        onClick={handleClaim}
        disabled={step === 'preparing' || step === 'signing'}
        className="w-full py-3 bg-[#408A71] text-[#091413] font-semibold text-[13px] rounded hover:bg-[#4fa07f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {step === 'preparing' && (
          <>
            <div className="w-3 h-3 border border-[#091413] border-t-transparent rounded-full animate-spin" />
            Preparing signature...
          </>
        )}
        {step === 'signing' && 'Confirm in wallet...'}
        {(step === 'idle' || step === 'error') && 'Claim Earnings → USDT'}
      </button>
    </div>
  );
}
