"use client";



import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const API_BASE = "https://rpc.satelink.network";
const PASSWORD_HASH = process.env.NEXT_PUBLIC_ADMIN_HASH || "";

interface Metrics {
  eventsToday: number;
  usdtToday: number;
  requestsToday: number;
  cacheHitRate: string;
}

interface ChainHealth {
  name: string;
  status: string;
  providers: number;
  healthy: number;
  avgLatency: number;
}

interface Settlement {
  epoch_id: number;
  status: string;
  total_revenue_usdt: number;
  merkle_root: string;
  created_at: string;
}

const CONTRACTS = [
  { name: "NodeRegistryV2", address: "0x27D7320d5786D5B4B4dE8aAAC6cf62338ADeC037" },
  { name: "RevenueDistributor", address: "0x8a9CefBD801574806a634aF179f538ABB5926F5a" },
  { name: "ClaimsContract", address: "0x6987921e2453f360e314e4424F6c2789F10a1CC9" },
  { name: "USDT (Polygon)", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" },
];

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [chains, setChains] = useState<ChainHealth[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("satelink_admin_auth");
    if (stored === "true") {
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = async () => {
    const hash = await sha256(password);
    if (password === "satelink2026") {
      sessionStorage.setItem("satelink_admin_auth", "true");
      setAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [metricsRes, healthRes, settlementRes] = await Promise.all([
        fetch(`${API_BASE}/rpc/metrics`),
        fetch(`${API_BASE}/rpc/health`),
        fetch(`${API_BASE}/api/settlement/history`).catch(() => null),
      ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics({
          eventsToday: data.revenue?.eventsToday || 0,
          usdtToday: parseFloat(data.revenue?.usdtToday || "0"),
          requestsToday: data.rpcGateway?.requestsToday || data.revenue?.eventsToday || 0,
          cacheHitRate: data.rpcGateway?.cacheStats?.hitRate || "0%",
        });
      }

      if (healthRes.ok) {
        const data = await healthRes.json();
        if (data.chains) {
          const chainList = Object.entries(data.chains).map(([name, info]: [string, any]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            status: info.status || "unknown",
            providers: info.providers?.total || 0,
            healthy: info.providers?.healthy || 0,
            avgLatency: info.avgLatency || 0,
          }));
          setChains(chainList);
        }
      }

      if (settlementRes && settlementRes.ok) {
        const data = await settlementRes.json();
        setSettlements(data.epochs || data.history || []);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchData();
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [authenticated, fetchData]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#2C3333] text-white flex items-center justify-center p-6">
        <div className="bg-[#1A3C3C] border border-[#0E838840] rounded-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold">Admin Access</h1>
            <p className="text-gray-400 mt-2">Enter password to continue</p>
          </div>

          <div className="space-y-4">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-purple-500 focus:outline-none"
            />
            {authError && (
              <p className="text-red-400 text-sm">Invalid password</p>
            )}
            <button
              onClick={handleLogin}
              className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold"
            >
              Login
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2C3333] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-400 mt-1">Platform revenue and network management</p>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-gray-500 text-sm">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchData}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg"
            >
              Refresh
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem("satelink_admin_auth");
                setAuthenticated(false);
              }}
              className="text-gray-400 hover:text-white text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Revenue Overview */}
        {metrics && (
          <div className="bg-[#1A3C3C] rounded-xl p-6 border border-[#0E838840]">
            <h2 className="text-xl font-semibold mb-4">Revenue Overview (Today)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Events Today</p>
                <p className="text-3xl font-bold mt-1">{metrics.eventsToday.toLocaleString()}</p>
              </div>
              <div className="bg-green-900/20 rounded-lg p-4 border border-green-900/50">
                <p className="text-gray-400 text-sm">Revenue (USDT)</p>
                <p className="text-3xl font-bold text-green-400 mt-1">${metrics.usdtToday.toFixed(6)}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Requests</p>
                <p className="text-3xl font-bold mt-1">{metrics.requestsToday.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Cache Hit Rate</p>
                <p className="text-3xl font-bold text-[#0E8388] mt-1">{metrics.cacheHitRate}</p>
              </div>
            </div>
          </div>
        )}

        {/* Network Health */}
        <div className="bg-[#1A3C3C] rounded-xl p-6 border border-[#0E838840]">
          <h2 className="text-xl font-semibold mb-4">Network Health</h2>
          {chains.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Loading chain health...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-[#0E838840]">
                    <th className="pb-3">Chain</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Providers</th>
                    <th className="pb-3">Healthy</th>
                    <th className="pb-3">Avg Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {chains.map((chain) => (
                    <tr key={chain.name} className="border-b border-[#0E838840]/50">
                      <td className="py-3 font-medium">{chain.name}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          chain.status === "healthy"
                            ? "bg-green-900/30 text-green-400"
                            : chain.status === "degraded"
                            ? "bg-yellow-900/30 text-yellow-400"
                            : "bg-red-900/30 text-red-400"
                        }`}>
                          {chain.status}
                        </span>
                      </td>
                      <td className="py-3">{chain.providers}</td>
                      <td className="py-3 text-green-400">{chain.healthy}</td>
                      <td className="py-3">{chain.avgLatency}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Settlement History */}
        <div className="bg-[#1A3C3C] rounded-xl p-6 border border-[#0E838840]">
          <h2 className="text-xl font-semibold mb-4">Settlement History</h2>
          {settlements.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No settlement history available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-[#0E838840]">
                    <th className="pb-3">Epoch</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Revenue (USDT)</th>
                    <th className="pb-3">Merkle Root</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.slice(0, 20).map((s) => (
                    <tr key={s.epoch_id} className="border-b border-[#0E838840]/50">
                      <td className="py-3 font-mono">{s.epoch_id}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          s.status === "settled"
                            ? "bg-green-900/30 text-green-400"
                            : s.status === "pending"
                            ? "bg-yellow-900/30 text-yellow-400"
                            : "bg-gray-700 text-gray-400"
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3">${(s.total_revenue_usdt || 0).toFixed(6)}</td>
                      <td className="py-3 font-mono text-sm text-gray-500">
                        {s.merkle_root ? `${s.merkle_root.slice(0, 10)}...${s.merkle_root.slice(-8)}` : "—"}
                      </td>
                      <td className="py-3 text-gray-400">
                        {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Contract Info */}
        <div className="bg-[#1A3C3C] rounded-xl p-6 border border-[#0E838840]">
          <h2 className="text-xl font-semibold mb-4">Deployed Contracts (Polygon Mainnet)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CONTRACTS.map((contract) => (
              <a
                key={contract.address}
                href={`https://polygonscan.com/address/${contract.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition-colors group"
              >
                <div>
                  <p className="font-medium">{contract.name}</p>
                  <p className="text-gray-500 font-mono text-sm">{contract.address}</p>
                </div>
                <span className="text-gray-500 group-hover:text-[#0E8388] transition-colors">
                  ↗
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Revenue Split Info */}
        <div className="bg-[#1A3C3C] rounded-xl p-6 border border-[#0E838840]">
          <h2 className="text-xl font-semibold mb-4">Revenue Split (50/30/20)</h2>
          <div className="flex items-center gap-1 h-8 rounded-lg overflow-hidden">
            <div className="h-full bg-blue-600 flex items-center justify-center text-sm font-medium" style={{ width: "50%" }}>
              50% Nodes
            </div>
            <div className="h-full bg-purple-600 flex items-center justify-center text-sm font-medium" style={{ width: "30%" }}>
              30% Platform
            </div>
            <div className="h-full bg-green-600 flex items-center justify-center text-sm font-medium" style={{ width: "20%" }}>
              20% Pool
            </div>
          </div>
          <p className="text-gray-500 text-sm mt-4 text-center">
            Revenue automatically split per protocol rules on Polygon
          </p>
        </div>
      </div>
    </div>
  );
}
