"use client";

import { useState, useEffect, useCallback } from "react";

interface RevenueStats {
  totalRevenue: number;
  platformFee: number;
  nodeOperatorShare: number;
  distributionPool: number;
  totalWithdrawn: number;
  availableToWithdraw: number;
}

interface ClaimsStats {
  totalClaims: number;
  completedClaims: number;
  pendingClaims: number;
  totalPaidUsdt: number;
}

interface Metrics {
  eventsToday: number;
  usdtToday: number;
  activeProviders: number;
  cacheHitRate: string;
}

interface Node {
  id: string;
  wallet: string;
  tier: string;
  totalEarnings: number;
  status: string;
  registeredAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://rpc.satelink.network";

export default function AdminDashboard() {
  const [stats, setStats] = useState<{ revenue: RevenueStats; claims: ClaimsStats } | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawWallet, setWithdrawWallet] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState<{ ok: boolean; txHash?: string; error?: string } | null>(null);
  const [epochClosing, setEpochClosing] = useState(false);
  const [epochResult, setEpochResult] = useState<{ ok: boolean; epochId?: number; message?: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, metricsRes, nodesRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/stats`),
        fetch(`${API_BASE}/rpc/metrics`),
        fetch(`${API_BASE}/api/nodes`),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics({
          eventsToday: data.revenue?.eventsToday || 0,
          usdtToday: parseFloat(data.revenue?.usdtToday || 0),
          activeProviders: Object.values(data.chains || {}).reduce(
            (sum: number, c: any) => sum + (c.providers?.healthy || 0),
            0
          ),
          cacheHitRate: data.rpcGateway?.cacheStats?.hitRate || "0%",
        });
      }

      if (nodesRes.ok) {
        const data = await nodesRes.json();
        setNodes(data.nodes || []);
      }
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleWithdraw = async () => {
    if (!withdrawWallet || !withdrawAmount) return;

    setWithdrawLoading(true);
    setWithdrawResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/admin/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: withdrawWallet,
          amount: parseFloat(withdrawAmount),
        }),
      });

      const data = await res.json();
      setWithdrawResult(data);

      if (data.ok) {
        fetchData();
        setWithdrawAmount("");
      }
    } catch (err) {
      setWithdrawResult({ ok: false, error: "Network error" });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleCloseEpoch = async () => {
    setEpochClosing(true);
    setEpochResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/admin/epoch/close`, {
        method: "POST",
      });

      const data = await res.json();
      setEpochResult(data);

      if (data.ok) {
        fetchData();
      }
    } catch (err) {
      setEpochResult({ ok: false, message: "Network error" });
    } finally {
      setEpochClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-400 mt-1">Platform revenue and network management</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">Last updated: {new Date().toLocaleTimeString()}</span>
            <button
              onClick={fetchData}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Revenue Overview */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Revenue Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <StatCard
              label="Today"
              value={`$${(metrics?.usdtToday || 0).toFixed(6)}`}
              subtext={`${metrics?.eventsToday || 0} events`}
            />
            <StatCard
              label="Total All Time"
              value={`$${(stats?.revenue.totalRevenue || 0).toFixed(6)}`}
            />
            <StatCard
              label="Platform Fee (30%)"
              value={`$${(stats?.revenue.platformFee || 0).toFixed(6)}`}
            />
            <StatCard
              label="Node Operators (50%)"
              value={`$${(stats?.revenue.nodeOperatorShare || 0).toFixed(6)}`}
            />
            <StatCard
              label="Distribution Pool (20%)"
              value={`$${(stats?.revenue.distributionPool || 0).toFixed(6)}`}
            />
          </div>
        </div>

        {/* Network Health */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Network Health</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard
              label="Active Nodes"
              value={nodes.filter((n) => n.status === "active").length.toString()}
              subtext={`${nodes.length} total`}
            />
            <StatCard
              label="RPC Calls Today"
              value={(metrics?.eventsToday || 0).toLocaleString()}
            />
            <StatCard label="Cache Hit Rate" value={metrics?.cacheHitRate || "0%"} />
            <StatCard
              label="Healthy Providers"
              value={(metrics?.activeProviders || 0).toString()}
              subtext="All chains"
            />
          </div>
        </div>

        {/* Epoch Status & Founder Withdrawal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Epoch Control */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Epoch Control</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Revenue This Epoch</span>
                <span className="text-xl font-semibold">
                  ${(metrics?.usdtToday || 0).toFixed(6)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Events This Epoch</span>
                <span className="text-xl font-semibold">{metrics?.eventsToday || 0}</span>
              </div>
              <button
                onClick={handleCloseEpoch}
                disabled={epochClosing}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 py-3 rounded-lg font-semibold"
              >
                {epochClosing ? "Closing..." : "Force Close Epoch"}
              </button>
              {epochResult && (
                <div
                  className={`p-3 rounded ${
                    epochResult.ok ? "bg-green-900/50 text-green-300" : "bg-red-900/50 text-red-300"
                  }`}
                >
                  {epochResult.message || `Epoch ${epochResult.epochId} closed`}
                </div>
              )}
            </div>
          </div>

          {/* Founder Withdrawal */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Founder Withdrawal</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Platform Fee Earned</span>
                <span className="text-xl font-semibold text-green-400">
                  ${(stats?.revenue.platformFee || 0).toFixed(6)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Already Withdrawn</span>
                <span className="text-xl font-semibold">
                  ${(stats?.revenue.totalWithdrawn || 0).toFixed(6)}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-700 pt-3">
                <span className="text-gray-400">Available to Withdraw</span>
                <span className="text-xl font-bold text-green-400">
                  ${(stats?.revenue.availableToWithdraw || 0).toFixed(6)}
                </span>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Wallet Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={withdrawWallet}
                  onChange={(e) => setWithdrawWallet(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount (USDT)</label>
                <input
                  type="number"
                  step="0.000001"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                />
              </div>
              <button
                onClick={handleWithdraw}
                disabled={withdrawLoading || !withdrawWallet || !withdrawAmount}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 py-3 rounded-lg font-semibold"
              >
                {withdrawLoading ? "Processing..." : "Withdraw to Wallet"}
              </button>

              {withdrawResult && (
                <div
                  className={`p-3 rounded ${
                    withdrawResult.ok
                      ? "bg-green-900/50 text-green-300"
                      : "bg-red-900/50 text-red-300"
                  }`}
                >
                  {withdrawResult.ok ? (
                    <a
                      href={`https://polygonscan.com/tx/${withdrawResult.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      View transaction →
                    </a>
                  ) : (
                    withdrawResult.error
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Claims Stats */}
        {stats?.claims && (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Claims Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatCard
                label="Total Claims"
                value={stats.claims.totalClaims.toString()}
              />
              <StatCard
                label="Completed"
                value={stats.claims.completedClaims.toString()}
              />
              <StatCard
                label="Pending"
                value={stats.claims.pendingClaims.toString()}
              />
              <StatCard
                label="Total Paid"
                value={`$${stats.claims.totalPaidUsdt.toFixed(6)}`}
              />
            </div>
          </div>
        )}

        {/* Node Operators Table */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Node Operators</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-800">
                  <th className="pb-3">Node ID</th>
                  <th className="pb-3">Wallet</th>
                  <th className="pb-3">Tier</th>
                  <th className="pb-3">Earnings</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Registered</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((node) => (
                  <tr key={node.id} className="border-b border-gray-800/50">
                    <td className="py-3 font-mono text-sm">{node.id}</td>
                    <td className="py-3 font-mono text-sm">
                      {node.wallet?.slice(0, 10)}...
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          node.tier === "platinum"
                            ? "bg-purple-900 text-purple-300"
                            : node.tier === "gold"
                            ? "bg-yellow-900 text-yellow-300"
                            : node.tier === "silver"
                            ? "bg-gray-700 text-gray-300"
                            : "bg-amber-900 text-amber-300"
                        }`}
                      >
                        {node.tier || "bronze"}
                      </span>
                    </td>
                    <td className="py-3">${(node.totalEarnings || 0).toFixed(6)}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          node.status === "active"
                            ? "bg-green-900 text-green-300"
                            : "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {node.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">
                      {new Date(node.registeredAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtext && <p className="text-gray-500 text-sm mt-1">{subtext}</p>}
    </div>
  );
}
