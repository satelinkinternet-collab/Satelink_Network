"use client";

import { useState, useEffect, useCallback } from "react";

interface NodeEarnings {
  pending: number;
  claimed: number;
  total: number;
  minimumClaim: number;
  history: Array<{
    epoch_id: number;
    net_usdt: number;
    status: string;
    created_at: string;
  }>;
}

interface NodeReputation {
  score: number;
  tier: string;
  uptime: number;
  online: boolean;
  lastHeartbeat: string;
}

interface ClaimHistory {
  id: number;
  wallet: string;
  amount: number;
  txHash: string | null;
  status: string;
  polygonscanUrl: string | null;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://rpc.satelink.network";

const TIER_COLORS: Record<string, string> = {
  bronze: "bg-amber-600",
  silver: "bg-gray-400",
  gold: "bg-yellow-400",
  platinum: "bg-purple-500",
};

export default function OperatorDashboard() {
  const [nodeId, setNodeId] = useState<string>("");
  const [earnings, setEarnings] = useState<NodeEarnings | null>(null);
  const [reputation, setReputation] = useState<NodeReputation | null>(null);
  const [claims, setClaims] = useState<ClaimHistory[]>([]);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimResult, setClaimResult] = useState<{ ok: boolean; txHash?: string; error?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchNodeData = useCallback(async () => {
    if (!nodeId) return;

    setLoading(true);
    setError(null);

    try {
      const [earningsRes, reputationRes, claimsRes] = await Promise.all([
        fetch(`${API_BASE}/api/nodes/${nodeId}/earnings`),
        fetch(`${API_BASE}/api/nodes/${nodeId}/reputation`),
        fetch(`${API_BASE}/api/nodes/${nodeId}/claims`),
      ]);

      if (earningsRes.ok) {
        const data = await earningsRes.json();
        setEarnings(data);
      }

      if (reputationRes.ok) {
        const data = await reputationRes.json();
        setReputation(data);
      }

      if (claimsRes.ok) {
        const data = await claimsRes.json();
        setClaims(data.claims || []);
      }
    } catch (err) {
      setError("Failed to fetch node data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    const savedNodeId = localStorage.getItem("satelink_node_id");
    if (savedNodeId) {
      setNodeId(savedNodeId);
    }
  }, []);

  useEffect(() => {
    if (nodeId) {
      localStorage.setItem("satelink_node_id", nodeId);
      fetchNodeData();
      const interval = setInterval(fetchNodeData, 30000);
      return () => clearInterval(interval);
    }
  }, [nodeId, fetchNodeData]);

  const handleClaim = async () => {
    if (!walletAddress || !earnings || earnings.pending < 1) return;

    setClaimLoading(true);
    setClaimResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/nodes/${nodeId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: walletAddress }),
      });

      const data = await res.json();
      setClaimResult(data);

      if (data.ok) {
        fetchNodeData();
      }
    } catch (err) {
      setClaimResult({ ok: false, error: "Network error" });
    } finally {
      setClaimLoading(false);
    }
  };

  const canClaim = earnings && earnings.pending >= 1;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Node Operator Dashboard</h1>
            <p className="text-gray-400 mt-1">Track earnings and claim USDT rewards</p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Enter Node ID"
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white w-64"
            />
            <button
              onClick={fetchNodeData}
              disabled={!nodeId || loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg"
            >
              {loading ? "Loading..." : "Load"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 text-red-300">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {earnings && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              label="Total Earned"
              value={`$${earnings.total.toFixed(6)}`}
              subtext="Lifetime USDT"
            />
            <StatCard
              label="Pending"
              value={`$${earnings.pending.toFixed(6)}`}
              subtext="This epoch"
            />
            <StatCard
              label="Claimable"
              value={`$${earnings.pending.toFixed(6)}`}
              subtext={canClaim ? "Ready to claim!" : "Min: $1.00 USDT"}
              highlight={canClaim}
            />
            {reputation && (
              <StatCard
                label="Node Tier"
                value={reputation.tier.toUpperCase()}
                subtext={`Score: ${reputation.score}/1000`}
                badge={reputation.tier}
              />
            )}
          </div>
        )}

        {/* Node Status */}
        {reputation && (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Live Node Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full ${
                    reputation.online ? "bg-green-500 animate-pulse" : "bg-red-500"
                  }`}
                />
                <span className="text-lg">{reputation.online ? "Online" : "Offline"}</span>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Uptime (7d)</p>
                <p className="text-2xl font-semibold">{reputation.uptime.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Reputation Score</p>
                <div className="mt-2">
                  <div className="bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-500"
                      style={{ width: `${(reputation.score / 1000) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm mt-1">{reputation.score} / 1000</p>
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Last Heartbeat</p>
                <p className="text-lg">{new Date(reputation.lastHeartbeat).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Earnings Chart (CSS bars) */}
        {earnings && earnings.history.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Earnings History (Last 14 Days)</h2>
            <div className="flex items-end gap-2 h-48">
              {earnings.history.slice(0, 14).reverse().map((entry, i) => {
                const maxVal = Math.max(...earnings.history.map((e) => e.net_usdt));
                const height = maxVal > 0 ? (entry.net_usdt / maxVal) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-400"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`$${entry.net_usdt.toFixed(6)}`}
                    />
                    <span className="text-xs text-gray-500 mt-2">{entry.epoch_id}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Claim Section */}
        {earnings && (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Claim Your Earnings</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="text-4xl font-bold text-green-400 mb-2">
                  ${earnings.pending.toFixed(6)} USDT
                </div>
                <p className="text-gray-400">
                  {canClaim
                    ? "Ready to claim! Enter your wallet address below."
                    : `Minimum claim: $1.00 USDT. You need $${(1 - earnings.pending).toFixed(6)} more.`}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Wallet Address (Polygon)</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                  />
                </div>
                <button
                  onClick={handleClaim}
                  disabled={!canClaim || !walletAddress || claimLoading}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    canClaim && walletAddress
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-gray-700 cursor-not-allowed"
                  }`}
                >
                  {claimLoading ? "Processing..." : "Claim to Wallet"}
                </button>
              </div>
            </div>

            {/* Claim Result */}
            {claimResult && (
              <div
                className={`mt-6 p-4 rounded-lg ${
                  claimResult.ok
                    ? "bg-green-900/50 border border-green-500"
                    : "bg-red-900/50 border border-red-500"
                }`}
              >
                {claimResult.ok ? (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✓</span>
                    <div>
                      <p className="font-semibold">Claim Successful!</p>
                      <a
                        href={`https://polygonscan.com/tx/${claimResult.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        View on Polygonscan →
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-red-300">{claimResult.error}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Transaction History */}
        {claims.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-800">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim) => (
                    <tr key={claim.id} className="border-b border-gray-800/50">
                      <td className="py-3">{new Date(claim.createdAt).toLocaleDateString()}</td>
                      <td className="py-3">${claim.amount.toFixed(6)}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            claim.status === "completed"
                              ? "bg-green-900 text-green-300"
                              : claim.status === "failed"
                              ? "bg-red-900 text-red-300"
                              : "bg-yellow-900 text-yellow-300"
                          }`}
                        >
                          {claim.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {claim.txHash ? (
                          <a
                            href={claim.polygonscanUrl || `https://polygonscan.com/tx/${claim.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline font-mono text-sm"
                          >
                            {claim.txHash.slice(0, 10)}...
                          </a>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  highlight,
  badge,
}: {
  label: string;
  value: string;
  subtext?: string;
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`rounded-xl p-6 border ${
        highlight ? "bg-green-900/20 border-green-500" : "bg-gray-900 border-gray-800"
      }`}
    >
      <p className="text-gray-400 text-sm">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-2xl font-bold">{value}</p>
        {badge && (
          <span
            className={`px-2 py-0.5 rounded text-xs text-white ${TIER_COLORS[badge] || "bg-gray-600"}`}
          >
            {badge}
          </span>
        )}
      </div>
      {subtext && <p className="text-gray-500 text-sm mt-1">{subtext}</p>}
    </div>
  );
}
