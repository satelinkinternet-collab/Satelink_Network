"use client";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const API_BASE = "https://rpc.satelink.network";
const DEMO_NODE_ID = "NODE-ap-south-1-a09becbb";

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  bronze: { bg: "bg-amber-900/30", text: "text-amber-400" },
  silver: { bg: "bg-gray-700/30", text: "text-gray-300" },
  gold: { bg: "bg-yellow-900/30", text: "text-yellow-400" },
  platinum: { bg: "bg-cyan-900/30", text: "text-cyan-400" },
};

interface Node {
  id: string;
  wallet: string;
  tier: string;
  region: string;
  status: string;
  totalEarnings: number;
}

interface Earnings {
  total: number;
  pending: number;
  claimed: number;
  claimable: number;
  minimumClaim: number;
}

interface Reputation {
  score: number;
  tier: string;
  uptime: number;
  online: boolean;
  lastHeartbeat: string;
}

export default function OperatorDashboard() {
  const [nodeId, setNodeId] = useState<string>("");
  const [savedNodeId, setSavedNodeId] = useState<string>("");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [loading, setLoading] = useState(false);
  const [claimWallet, setClaimWallet] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ ok: boolean; txHash?: string; error?: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("satelink_node_id");
    if (stored) {
      setNodeId(stored);
      setSavedNodeId(stored);
    }
  }, []);

  const fetchNodes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/nodes?region=all`);
      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes || []);
      }
    } catch (err) {
      console.error("Failed to fetch nodes:", err);
    }
  }, []);

  const fetchNodeData = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);

    try {
      const [earningsRes, reputationRes] = await Promise.all([
        fetch(`${API_BASE}/api/nodes/${id}/earnings`),
        fetch(`${API_BASE}/api/nodes/${id}/reputation`),
      ]);

      if (earningsRes.ok) {
        const data = await earningsRes.json();
        setEarnings({
          total: data.total || 0,
          pending: data.pending || 0,
          claimed: data.claimed || 0,
          claimable: data.claimable || data.pending || 0,
          minimumClaim: data.minimumClaim || 1,
        });
      }

      if (reputationRes.ok) {
        const data = await reputationRes.json();
        setReputation({
          score: data.score || 0,
          tier: data.tier || "bronze",
          uptime: data.uptime || 0,
          online: data.online ?? true,
          lastHeartbeat: data.lastHeartbeat || new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Failed to fetch node data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  useEffect(() => {
    if (savedNodeId) {
      fetchNodeData(savedNodeId);
      const interval = setInterval(() => fetchNodeData(savedNodeId), 30000);
      return () => clearInterval(interval);
    }
  }, [savedNodeId, fetchNodeData]);

  const handleSetNode = () => {
    if (nodeId) {
      localStorage.setItem("satelink_node_id", nodeId);
      setSavedNodeId(nodeId);
    }
  };

  const handleClaim = async () => {
    if (!claimWallet || !claimAmount || !savedNodeId) return;

    setClaiming(true);
    setClaimResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/nodes/${savedNodeId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: claimWallet,
          amount: parseFloat(claimAmount),
        }),
      });

      const data = await res.json();
      setClaimResult(data);

      if (data.ok) {
        fetchNodeData(savedNodeId);
        setClaimAmount("");
      }
    } catch (err) {
      setClaimResult({ ok: false, error: "Network error" });
    } finally {
      setClaiming(false);
    }
  };

  const canClaim = earnings && earnings.claimable >= (earnings.minimumClaim || 1);
  const tierStyle = TIER_COLORS[reputation?.tier || "bronze"];

  return (
    <div className="min-h-screen bg-[#2C3333] text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold">Node Operator Dashboard</h1>
            <p className="text-gray-400 mt-1">Track earnings and claim USDT rewards</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Enter Node ID"
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 w-64 focus:border-[#0E8388] focus:outline-none"
            />
            <button
              onClick={handleSetNode}
              disabled={!nodeId}
              className="bg-[#0E8388] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#15e6c0] disabled:opacity-50"
            >
              Load
            </button>
          </div>
        </div>

        {savedNodeId && (
          <div className="text-sm text-gray-500">
            Active Node: <span className="font-mono text-[#0E8388]">{savedNodeId}</span>
          </div>
        )}

        {/* Earnings Cards */}
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
              value={`$${earnings.claimable.toFixed(6)}`}
              subtext={canClaim ? "Ready to claim!" : `Min: $${earnings.minimumClaim} USDT`}
              highlight={!!canClaim}
            />
            {reputation && (
              <div className={`rounded-xl p-6 border ${tierStyle.bg} border-[#0E838840]`}>
                <p className="text-gray-400 text-sm">Node Tier</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className={`text-2xl font-bold ${tierStyle.text}`}>
                    {reputation.tier.toUpperCase()}
                  </p>
                </div>
                <p className="text-gray-500 text-sm mt-1">Score: {reputation.score}/1000</p>
              </div>
            )}
          </div>
        )}

        {/* Node Status Table */}
        <div className="bg-[#1A3C3C] rounded-xl p-6 border border-[#0E838840]">
          <h2 className="text-xl font-semibold mb-4">Registered Nodes</h2>
          {nodes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No nodes registered yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-[#0E838840]">
                    <th className="pb-3">Node ID</th>
                    <th className="pb-3">Region</th>
                    <th className="pb-3">Tier</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.slice(0, 10).map((node) => (
                    <tr
                      key={node.id}
                      className={`border-b border-[#0E838840]/50 cursor-pointer hover:bg-gray-800/30 ${
                        node.id === savedNodeId ? "bg-[#0E8388]/5" : ""
                      }`}
                      onClick={() => {
                        setNodeId(node.id);
                        localStorage.setItem("satelink_node_id", node.id);
                        setSavedNodeId(node.id);
                      }}
                    >
                      <td className="py-3 font-mono text-sm">{node.id}</td>
                      <td className="py-3">{node.region || "global"}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs ${TIER_COLORS[node.tier || "bronze"].bg} ${TIER_COLORS[node.tier || "bronze"].text}`}>
                          {node.tier || "bronze"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          node.status === "active" ? "bg-green-900/30 text-green-400" : "bg-gray-700 text-gray-400"
                        }`}>
                          {node.status}
                        </span>
                      </td>
                      <td className="py-3">${(node.totalEarnings || 0).toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reputation Section */}
        {reputation && (
          <div className="bg-[#1A3C3C] rounded-xl p-6 border border-[#0E838840]">
            <h2 className="text-xl font-semibold mb-4">Reputation Score</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${reputation.online ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                <span className="text-lg">{reputation.online ? "Online" : "Offline"}</span>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Uptime (7d)</p>
                <p className="text-2xl font-semibold">{reputation.uptime.toFixed(1)}%</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-400 text-sm mb-2">Score: {reputation.score}/1000</p>
                <div className="bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-[#0E8388] h-full transition-all duration-500"
                    style={{ width: `${(reputation.score / 1000) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-amber-400 font-medium">Bronze (0-249)</p>
                <p className="text-gray-500">1.0x multiplier</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-300 font-medium">Silver (250-499)</p>
                <p className="text-gray-500">1.2x multiplier</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-yellow-400 font-medium">Gold (500-749)</p>
                <p className="text-gray-500">1.5x multiplier</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-cyan-400 font-medium">Platinum (750+)</p>
                <p className="text-gray-500">2.0x multiplier</p>
              </div>
            </div>
          </div>
        )}

        {/* Claim Section */}
        {earnings && savedNodeId && (
          <div className="bg-[#1A3C3C] rounded-xl p-6 border border-[#0E838840]">
            <h2 className="text-xl font-semibold mb-4">Claim Your Earnings</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="text-4xl font-bold text-green-400 mb-2">
                  ${earnings.claimable.toFixed(6)} USDT
                </div>
                <p className="text-gray-400">
                  {canClaim
                    ? "Ready to claim! Enter your wallet address below."
                    : `Minimum claim: $${earnings.minimumClaim} USDT`}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Wallet Address (Polygon)</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={claimWallet}
                    onChange={(e) => setClaimWallet(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-[#0E8388] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Amount (USDT)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="0.00"
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-[#0E8388] focus:outline-none"
                    />
                    <button
                      onClick={() => setClaimAmount(earnings.claimable.toString())}
                      className="px-4 py-3 bg-gray-700 rounded-lg text-sm hover:bg-gray-600"
                    >
                      MAX
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleClaim}
                  disabled={!canClaim || !claimWallet || !claimAmount || claiming}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    canClaim && claimWallet && claimAmount
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-gray-700 cursor-not-allowed"
                  }`}
                >
                  {claiming ? "Processing..." : "Claim USDT"}
                </button>
              </div>
            </div>

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
                      <p className="font-semibold text-green-300">Claim Successful!</p>
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

        {!savedNodeId && (
          <div className="bg-[#1A3C3C] rounded-xl p-12 border border-[#0E838840] text-center">
            <p className="text-gray-400 mb-4">Enter your Node ID above to view earnings and reputation</p>
            <p className="text-gray-500 text-sm">
              Demo node: <span className="font-mono text-[#0E8388]">{DEMO_NODE_ID}</span>
            </p>
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
}: {
  label: string;
  value: string;
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-6 border ${
        highlight ? "bg-green-900/20 border-green-500" : "bg-[#1A3C3C] border-[#0E838840]"
      }`}
    >
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtext && <p className={`text-sm mt-1 ${highlight ? "text-green-400" : "text-gray-500"}`}>{subtext}</p>}
    </div>
  );
}
