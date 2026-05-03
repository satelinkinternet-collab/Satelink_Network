"use client";

import { useState, useEffect, useCallback } from "react";

interface DistributionStats {
  totalPool: number;
  distributed: number;
  pending: number;
  holders: number;
}

interface Distribution {
  id: number;
  epochId: number;
  amount: number;
  recipients: number;
  txHash: string | null;
  status: string;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://rpc.satelink.network";

export default function DistributorDashboard() {
  const [stats, setStats] = useState<DistributionStats | null>(null);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; txHash?: string; error?: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalPool: data.revenue?.distributionPool || 0,
          distributed: 0,
          pending: data.revenue?.distributionPool || 0,
          holders: 100,
        });
      }
    } catch (err) {
      console.error("Failed to fetch distribution stats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleDistribute = async () => {
    setDistributing(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/admin/distribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      setResult(data);

      if (data.ok) {
        fetchData();
      }
    } catch (err) {
      setResult({ ok: false, error: "Network error" });
    } finally {
      setDistributing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Distribution Pool Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Manage the 20% distribution pool for token holders
          </p>
        </div>

        {/* Pool Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-purple-900/30 border border-purple-500 rounded-xl p-6">
              <p className="text-purple-300 text-sm">Total Pool</p>
              <p className="text-3xl font-bold mt-1">${stats.totalPool.toFixed(6)}</p>
              <p className="text-purple-400 text-sm mt-1">USDT</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <p className="text-gray-400 text-sm">Distributed</p>
              <p className="text-3xl font-bold mt-1">${stats.distributed.toFixed(6)}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <p className="text-gray-400 text-sm">Pending</p>
              <p className="text-3xl font-bold text-green-400 mt-1">
                ${stats.pending.toFixed(6)}
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <p className="text-gray-400 text-sm">Pool Holders</p>
              <p className="text-3xl font-bold mt-1">{stats.holders}</p>
            </div>
          </div>
        )}

        {/* Distribution Action */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Distribute Rewards</h2>
          <p className="text-gray-400 mb-6">
            Distribute accumulated pool rewards to all eligible holders based on their stake.
            This action is triggered manually or automatically at epoch boundaries.
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={handleDistribute}
              disabled={distributing || !stats || stats.pending < 0.01}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 py-3 rounded-lg font-semibold"
            >
              {distributing ? "Processing..." : "Distribute to Pool Holders"}
            </button>
            {stats && stats.pending < 0.01 && (
              <span className="text-gray-500">Minimum $0.01 required</span>
            )}
          </div>

          {result && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                result.ok
                  ? "bg-green-900/50 border border-green-500"
                  : "bg-red-900/50 border border-red-500"
              }`}
            >
              {result.ok ? (
                <div>
                  <p className="font-semibold text-green-300">Distribution Successful!</p>
                  {result.txHash && (
                    <a
                      href={`https://polygonscan.com/tx/${result.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      View transaction →
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-red-300">{result.error}</p>
              )}
            </div>
          )}
        </div>

        {/* Distribution History */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Distribution History</h2>

          {distributions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No distributions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-800">
                    <th className="pb-3">Epoch</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Recipients</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Transaction</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {distributions.map((dist) => (
                    <tr key={dist.id} className="border-b border-gray-800/50">
                      <td className="py-3">{dist.epochId}</td>
                      <td className="py-3">${dist.amount.toFixed(6)}</td>
                      <td className="py-3">{dist.recipients}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            dist.status === "completed"
                              ? "bg-green-900 text-green-300"
                              : "bg-yellow-900 text-yellow-300"
                          }`}
                        >
                          {dist.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {dist.txHash ? (
                          <a
                            href={`https://polygonscan.com/tx/${dist.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline font-mono text-sm"
                          >
                            {dist.txHash.slice(0, 10)}...
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 text-gray-400">
                        {new Date(dist.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pool Allocation Diagram */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Revenue Split</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-blue-600 h-8 rounded-l flex items-center justify-center text-sm font-medium">
              50% Node Operators
            </div>
            <div className="w-1/4 bg-green-600 h-8 flex items-center justify-center text-sm font-medium">
              30% Platform
            </div>
            <div className="w-1/5 bg-purple-600 h-8 rounded-r flex items-center justify-center text-sm font-medium">
              20% Pool
            </div>
          </div>
          <p className="text-gray-500 text-sm mt-4 text-center">
            All revenue is automatically split according to the protocol rules
          </p>
        </div>
      </div>
    </div>
  );
}
