export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

"use client";

"use client";
import { useState, useEffect } from "react";

const API = "https://rpc.satelink.network";
const TREASURY = "0x966E1Ae22996545015b1414B35234b10719d7Ad4";
const NODE_ID = "NODE-ap-south-1-a09becbb";
const CLAIMS_CONTRACT = "0xE475c53B88190FD2130dB1E37504991EFe283fb0";

export default function WithdrawPage() {
  const [epochs, setEpochs] = useState<any[]>([]);
  const [claimResult, setClaimResult] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState(TREASURY);

  useEffect(() => {
    fetch(`${API}/api/epochs`)
      .then((r) => r.json())
      .then((d) => setEpochs(d.epochs || []))
      .catch((e) => setError(e.message));
  }, []);

  const totalRevenue = epochs.reduce(
    (s, e) => s + parseFloat(e.total || e.total_revenue_usdt || 0),
    0
  );
  const platformFee = totalRevenue * 0.3;
  const nodePool = totalRevenue * 0.5;

  async function handleClaim() {
    setClaiming(true);
    setError(null);
    setClaimResult(null);
    try {
      const token = localStorage.getItem("satelink_token") || "";
      const res = await fetch(`${API}/api/nodes/${NODE_ID}/claim`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ walletAddress: wallet }),
      });
      const data = await res.json();
      if (data.success || data.ok) setClaimResult(data.signature || data);
      else setError(data.error || data.message || JSON.stringify(data));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#091413] p-6 font-['Inter',sans-serif]">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[18px] font-semibold text-[#B0E4CC] tracking-tight">
            Revenue Withdrawal
          </h1>
          <p className="text-[12px] text-[#408A71] mt-1">
            Claim earned USDT on Polygon Mainnet · ClaimsContract:{" "}
            <span className="font-mono">{CLAIMS_CONTRACT.slice(0, 10)}...</span>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            {
              label: "Total Revenue",
              value: `$${totalRevenue.toFixed(6)}`,
              color: "#00D1FF",
            },
            {
              label: "Platform Fee (30%)",
              value: `$${platformFee.toFixed(6)}`,
              color: "#408A71",
            },
            {
              label: "Node Earnings (50%)",
              value: `$${nodePool.toFixed(6)}`,
              color: "#408A71",
            },
          ].map((m) => (
            <div
              key={m.label}
              className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4"
            >
              <p className="text-[10px] text-[#285A48] uppercase tracking-wider font-semibold">
                {m.label}
              </p>
              <p
                className="text-[20px] font-semibold font-mono mt-1.5"
                style={{ color: m.color }}
              >
                {m.value}
              </p>
              <p className="text-[10px] text-[#285A48] mt-0.5">USDT earned</p>
            </div>
          ))}
        </div>

        <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-5 mb-4">
          <h2 className="text-[13px] font-medium text-[#B0E4CC] mb-4">
            Generate Claim Signature
          </h2>
          <div className="mb-4">
            <label className="text-[10px] text-[#285A48] uppercase tracking-wider block mb-1.5">
              Receiving Wallet (Polygon)
            </label>
            <input
              className="w-full bg-[#091413] border border-[#1a3028] rounded px-3 py-2 text-[12px] font-mono text-[#B0E4CC] placeholder-[#285A48] focus:border-[#408A71] focus:outline-none"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full py-2.5 bg-[#408A71] text-[#091413] font-semibold text-[13px] rounded hover:bg-[#4fa07f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {claiming ? "Generating EIP-712 signature..." : "Claim Earnings → USDT"}
          </button>
          {error && (
            <div className="mt-3 p-3 bg-[#1a0f0f] border border-[#3e1818] rounded text-[11px] text-[#c04040]">
              {error}
            </div>
          )}
        </div>

        {claimResult && (
          <div className="bg-[#0c2219] border border-[#285A48] rounded-md p-5 mb-4">
            <h3 className="text-[12px] font-medium text-[#B0E4CC] mb-3">
              ✓ Signature generated — submit on-chain to receive USDT
            </h3>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between border-b border-[#1a3028] pb-2">
                <span className="text-[#285A48]">Amount</span>
                <span className="text-[#00D1FF] font-mono">
                  ${parseFloat(claimResult.amount || 0).toFixed(6)} USDT
                </span>
              </div>
              <div className="flex justify-between border-b border-[#1a3028] pb-2">
                <span className="text-[#285A48]">Nonce</span>
                <span className="font-mono text-[#408A71]">
                  {claimResult.nonce}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#1a3028] pb-2">
                <span className="text-[#285A48]">Expires</span>
                <span className="font-mono text-[#408A71]">
                  {claimResult.expiry
                    ? new Date(claimResult.expiry * 1000).toLocaleString()
                    : "—"}
                </span>
              </div>
            </div>
            <div className="mt-3 p-3 bg-[#091413] rounded border border-[#1a3028]">
              <p className="text-[10px] text-[#285A48] mb-1">Signature</p>
              <p className="text-[10px] font-mono text-[#408A71] break-all">
                {claimResult.signature || JSON.stringify(claimResult)}
              </p>
            </div>
            <a
              href={`https://polygonscan.com/address/${CLAIMS_CONTRACT}`}
              target="_blank"
              className="mt-3 block text-center text-[11px] text-[#285A48] hover:text-[#408A71] transition-colors"
            >
              Submit to ClaimsContract on Polygonscan →
            </a>
          </div>
        )}

        <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
          <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-3 font-semibold">
            How to receive USDT
          </p>
          {[
            '1. Click "Claim Earnings" — generates an EIP-712 signed message',
            "2. Copy the signature above",
            `3. Go to ClaimsContract on Polygonscan: ${CLAIMS_CONTRACT}`,
            "4. Connect your wallet (must match wallet address above)",
            "5. Call the claim() function with the signature data",
            "6. USDT transfers to your wallet on Polygon Mainnet",
          ].map((step, i) => (
            <p key={i} className="text-[11px] text-[#408A71] mb-1.5">
              {step}
            </p>
          ))}
          <div className="mt-3 pt-3 border-t border-[#1a3028]">
            <p className="text-[10px] text-[#285A48]">
              Minimum claim: $1.00 USDT · Settlement chain: Polygon Mainnet · Gas:
              ~0.01 MATIC
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
