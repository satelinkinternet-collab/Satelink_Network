'use client';

import { useEffect, useState } from 'react';

const API = 'https://rpc.satelink.network';
const NODE = 'NODE-ap-south-1-a09becbb';

interface EarningsData {
  nodeId: string;
  totalEarned: number;
  pendingAmount: number;
  claimedAmount: number;
  lastClaimAt: string | null;
  claims: ClaimRecord[];
}

interface ClaimRecord {
  id: string;
  amount: number;
  txHash: string;
  claimedAt: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export default function ClaimsPage() {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEarnings() {
      try {
        const res = await fetch(`${API}/api/nodes/${NODE}/earnings`);
        if (res.ok) {
          const data = await res.json();
          setEarnings(data);
        } else {
          setEarnings({
            nodeId: NODE,
            totalEarned: 0.000012,
            pendingAmount: 0.000012,
            claimedAmount: 0,
            lastClaimAt: null,
            claims: [],
          });
        }
      } catch {
        setEarnings({
          nodeId: NODE,
          totalEarned: 0.000012,
          pendingAmount: 0.000012,
          claimedAmount: 0,
          lastClaimAt: null,
          claims: [],
        });
      } finally {
        setLoading(false);
      }
    }
    fetchEarnings();
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[15px] font-semibold text-[#B0E4CC]">Claims History</h1>
        <p className="text-[11px] text-[#285A48] mt-0.5">
          Node earnings and USDT claim history
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#285A48] border-t-[#408A71] rounded-full animate-spin" />
        </div>
      ) : earnings ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
              <p className="text-[10px] text-[#285A48] uppercase tracking-wider">Total Earned</p>
              <p className="text-[18px] font-bold font-mono text-[#00D1FF] mt-1">
                ${earnings.totalEarned.toFixed(6)}
              </p>
            </div>
            <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
              <p className="text-[10px] text-[#285A48] uppercase tracking-wider">Pending</p>
              <p className="text-[18px] font-bold font-mono text-[#408A71] mt-1">
                ${earnings.pendingAmount.toFixed(6)}
              </p>
            </div>
            <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
              <p className="text-[10px] text-[#285A48] uppercase tracking-wider">Claimed</p>
              <p className="text-[18px] font-bold font-mono text-[#B0E4CC] mt-1">
                ${earnings.claimedAmount.toFixed(6)}
              </p>
            </div>
            <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
              <p className="text-[10px] text-[#285A48] uppercase tracking-wider">Last Claim</p>
              <p className="text-[14px] font-mono text-[#285A48] mt-1">
                {earnings.lastClaimAt ? new Date(earnings.lastClaimAt).toLocaleDateString() : 'Never'}
              </p>
            </div>
          </div>

          {/* Node ID */}
          <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
            <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-1">Node ID</p>
            <code className="text-[12px] font-mono text-[#408A71]">{earnings.nodeId}</code>
          </div>

          {/* Claims table */}
          <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1a3028]">
              <p className="text-[12px] font-medium text-[#B0E4CC]">Claim History</p>
            </div>

            {earnings.claims.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[11px] text-[#285A48]">No claims yet</p>
                <p className="text-[10px] text-[#1a3028] mt-1">Minimum $1.00 USDT required to claim</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1a3028] bg-[#091413]/50">
                      {['Amount', 'Transaction', 'Date', 'Status'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2 text-left text-[9px] font-semibold text-[#285A48] uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.claims.map((c) => (
                      <tr key={c.id} className="border-b border-[#0f1d15]">
                        <td className="px-4 py-2 font-mono text-[11px] text-[#00D1FF]">
                          ${c.amount.toFixed(6)}
                        </td>
                        <td className="px-4 py-2">
                          <a
                            href={`https://polygonscan.com/tx/${c.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-mono text-[#408A71] hover:text-[#B0E4CC]"
                          >
                            {c.txHash.slice(0, 10)}...
                          </a>
                        </td>
                        <td className="px-4 py-2 text-[10px] text-[#285A48]">
                          {new Date(c.claimedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${
                              c.status === 'confirmed'
                                ? 'bg-[#0f2e1a] text-[#408A71] border-[#285A48]'
                                : 'bg-[#1a1a0f] text-[#a0a030] border-[#3a3e18]'
                            }`}
                          >
                            {c.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
