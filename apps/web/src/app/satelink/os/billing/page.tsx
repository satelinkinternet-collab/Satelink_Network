"use client";




import { useEffect, useState, useCallback } from "react";
import {
  getStatus,
  getEpochs,
  getNodeEarnings,
  claimEarnings,
  type NetworkStatus,
  type EpochData,
  type NodeEarnings,
} from "@/lib/api/satelink-api";

const DEFAULT_NODE_ID = "NODE-ap-south-1-a09becbb";

export default function NodeOperatorDashboard() {
  const [nodeId, setNodeId] = useState<string>(DEFAULT_NODE_ID);
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [epochs, setEpochs] = useState<EpochData[]>([]);
  const [earnings, setEarnings] = useState<NodeEarnings | null>(null);
  const [epochCountdown, setEpochCountdown] = useState(60);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("satelink_node_id");
    if (stored) setNodeId(stored);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [s, e, earn] = await Promise.allSettled([
        getStatus(),
        getEpochs(),
        getNodeEarnings(nodeId),
      ]);
      if (s.status === "fulfilled") setStatus(s.value);
      if (e.status === "fulfilled") setEpochs(e.value);
      if (earn.status === "fulfilled") setEarnings(earn.value);
      setLastUpdate(new Date());
    } catch (e) {
      console.error("Failed to load data:", e);
    }
  }, [nodeId]);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 15000);
    return () => clearInterval(t);
  }, [loadData]);

  useEffect(() => {
    const t = setInterval(() => {
      setEpochCountdown((p) => (p <= 1 ? 60 : p - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const handleClaim = async () => {
    setClaiming(true);
    setClaimResult(null);
    try {
      const result = await claimEarnings(nodeId);
      if (result.ok) {
        setClaimResult({ ok: true, message: `Claim submitted! TX: ${result.txHash?.slice(0, 10)}...` });
        loadData();
      } else {
        setClaimResult({ ok: false, message: result.error || "Claim failed" });
      }
    } catch (e) {
      setClaimResult({ ok: false, message: String(e) });
    } finally {
      setClaiming(false);
    }
  };

  const totalNetworkRevenue = epochs.reduce((sum, e) => sum + (e.total || 0), 0);
  const nodePoolTotal = totalNetworkRevenue * 0.5;
  const myEarnings = earnings?.total_earned_usdt || 0;
  const myPending = earnings?.pending_usdt || 0;
  const epochsParticipated = earnings?.epochs_participated || 0;

  return (
    <div className="min-h-screen bg-[#091413] font-['Inter',sans-serif] text-[#B0E4CC]">
      {/* TOP BAR */}
      <div className="sticky top-0 z-50 flex items-center h-12 px-4 gap-4 border-b border-[#1a3028] bg-[#091413]/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <div className="w-2 h-2 rounded-full bg-[#00D1FF] animate-pulse" />
          NODE OPERATOR
        </div>
        <div className="flex items-center gap-4 text-[11px] ml-4">
          <span className="text-[#285A48]">
            Node
            <span className="text-[#B0E4CC] font-mono ml-1">{nodeId.slice(0, 20)}...</span>
          </span>
          <span className="text-[#285A48]">
            Epoch
            <span className="text-[#00D1FF] font-mono ml-1">#{status?.current_epoch ?? "—"}</span>
          </span>
          <span className="text-[#285A48]">
            Next
            <span className="text-[#408A71] font-mono ml-1">{epochCountdown}s</span>
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {lastUpdate && (
            <span className="text-[9px] text-[#285A48]">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <span className="text-[9px] px-2 py-0.5 rounded border border-[#00D1FF] text-[#00D1FF] font-mono">
            POLYGON
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* NODE ID INPUT */}
        <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
          <label className="text-[10px] text-[#285A48] uppercase tracking-wider block mb-2">Your Node ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              className="flex-1 bg-[#091413] border border-[#1a3028] rounded px-3 py-2 font-mono text-[12px] text-[#B0E4CC] focus:border-[#408A71] focus:outline-none"
              placeholder="NODE-..."
            />
            <button
              onClick={() => {
                localStorage.setItem("satelink_node_id", nodeId);
                loadData();
              }}
              className="px-4 py-2 bg-[#285A48] hover:bg-[#408A71] text-[#091413] text-[11px] font-semibold rounded transition-colors"
            >
              Save & Refresh
            </button>
          </div>
        </div>

        {/* EARNINGS SUMMARY */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Your Total Earned", value: `$${myEarnings.toFixed(6)}`, sub: `${epochsParticipated} epochs`, glow: true },
            { label: "Pending Claimable", value: `$${myPending.toFixed(6)}`, sub: "On-chain claim", glow: myPending > 0 },
            { label: "Network Node Pool", value: `$${nodePoolTotal.toFixed(6)}`, sub: "50% of total" },
            { label: "Network Total", value: `$${totalNetworkRevenue.toFixed(6)}`, sub: `${epochs.length} epochs` },
          ].map((m) => (
            <div key={m.label} className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4 hover:border-[#285A48] transition-colors">
              <p className="text-[10px] text-[#285A48] uppercase tracking-wider font-semibold">{m.label}</p>
              <p className={`text-[22px] font-semibold font-mono tracking-tight mt-1.5 mb-0.5 ${m.glow ? "text-[#00D1FF] drop-shadow-[0_0_12px_rgba(0,209,255,0.3)]" : "text-[#B0E4CC]"}`}>
                {m.value}
              </p>
              <p className="text-[10px] text-[#285A48]">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* CLAIM SECTION */}
        <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[12px] font-medium text-[#B0E4CC]">Claim Earnings</p>
              <p className="text-[10px] text-[#285A48] mt-0.5">Submit on-chain claim to ClaimsContract</p>
            </div>
            <button
              onClick={handleClaim}
              disabled={claiming || myPending <= 0}
              className={`px-5 py-2.5 rounded text-[12px] font-semibold transition-all ${
                myPending > 0
                  ? "bg-[#00D1FF] hover:bg-[#00b8e0] text-[#091413]"
                  : "bg-[#1a3028] text-[#285A48] cursor-not-allowed"
              }`}
            >
              {claiming ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#091413] border-t-transparent rounded-full animate-spin" />
                  Claiming...
                </span>
              ) : (
                `Claim $${myPending.toFixed(6)} USDT`
              )}
            </button>
          </div>
          {claimResult && (
            <div className={`text-[11px] p-3 rounded ${claimResult.ok ? "bg-[#0f2e1a] text-[#408A71] border border-[#285A48]" : "bg-[#2e0f0f] text-[#c04040] border border-[#3e1818]"}`}>
              {claimResult.message}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-[#1a3028] grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px]">
            <div>
              <span className="text-[#285A48]">Contract</span>
              <a
                href="https://polygonscan.com/address/0xE475c53B88190FD2130dB1E37504991EFe283fb0"
                target="_blank"
                rel="noopener noreferrer"
                className="block font-mono text-[#408A71] hover:text-[#00D1FF] truncate"
              >
                0xE475c53B...fb0
              </a>
            </div>
            <div>
              <span className="text-[#285A48]">Network</span>
              <span className="block text-[#B0E4CC]">Polygon PoS (137)</span>
            </div>
            <div>
              <span className="text-[#285A48]">Token</span>
              <span className="block text-[#B0E4CC]">USDT</span>
            </div>
            <div>
              <span className="text-[#285A48]">Min Claim</span>
              <span className="block text-[#B0E4CC]">$0.01</span>
            </div>
          </div>
        </div>

        {/* EPOCH CONTRIBUTIONS */}
        <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a3028]">
            <div>
              <p className="text-[12px] font-medium text-[#B0E4CC]">Your Epoch Contributions</p>
              <p className="text-[10px] text-[#285A48] mt-0.5">Earnings from /api/nodes/{nodeId}/earnings</p>
            </div>
          </div>
          {!earnings || earnings.by_epoch.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-[11px] text-[#285A48]">No epoch contributions yet</p>
              <p className="text-[10px] text-[#1a3028] mt-1">Start routing RPC requests to earn</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#0c1a17]">
                  <tr className="border-b border-[#1a3028]">
                    {["Epoch", "Your Earnings", "Your Requests", "Share %"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-[9px] font-semibold text-[#285A48] uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {earnings.by_epoch.map((e, i) => (
                    <tr key={i} className="border-b border-[#0f1d15] hover:bg-[#0f1e17] transition-colors">
                      <td className="px-4 py-2 font-mono text-[11px] text-[#B0E4CC]">#{e.epoch_id}</td>
                      <td className="px-4 py-2 font-mono text-[11px] text-[#00D1FF]">${e.earned_usdt.toFixed(6)}</td>
                      <td className="px-4 py-2 font-mono text-[11px] text-[#408A71]">{e.requests}</td>
                      <td className="px-4 py-2 font-mono text-[11px] text-[#285A48]">
                        {((e.earned_usdt / (nodePoolTotal || 1)) * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* NETWORK EPOCHS */}
        <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a3028]">
            <div>
              <p className="text-[12px] font-medium text-[#B0E4CC]">Network Epoch History</p>
              <p className="text-[10px] text-[#285A48] mt-0.5">All epochs from /api/epochs</p>
            </div>
            <a href="/satelink/os/overview" className="text-[10px] text-[#285A48] hover:text-[#408A71]">
              Admin view →
            </a>
          </div>
          {epochs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#285A48] border-t-[#408A71] rounded-full animate-spin mb-3" />
              <p className="text-[11px] text-[#285A48]">Loading epochs...</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#0c1a17]">
                  <tr className="border-b border-[#1a3028]">
                    {["Epoch", "Total Revenue", "Node Pool (50%)", "Requests", "Status"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-[9px] font-semibold text-[#285A48] uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {epochs.map((e, i) => {
                    const hasRev = e.total > 0;
                    return (
                      <tr key={i} className="border-b border-[#0f1d15] hover:bg-[#0f1e17] transition-colors">
                        <td className="px-4 py-2 font-mono text-[11px] text-[#B0E4CC]">#{e.epoch_id ?? "pending"}</td>
                        <td className={`px-4 py-2 font-mono text-[11px] ${hasRev ? "text-[#00D1FF]" : "text-[#285A48]"}`}>
                          ${e.total.toFixed(6)}
                        </td>
                        <td className="px-4 py-2 font-mono text-[11px] text-[#408A71]">${(e.total * 0.5).toFixed(6)}</td>
                        <td className="px-4 py-2 font-mono text-[11px] text-[#285A48]">{e.requests}</td>
                        <td className="px-4 py-2">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${hasRev ? "bg-[#0f2e1a] text-[#408A71] border border-[#285A48]" : "bg-[#0f1510] text-[#285A48] border border-[#1a2e25]"}`}>
                            {hasRev ? "● REVENUE" : "○ EMPTY"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* REVENUE SPLIT INFO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
            <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-3">Your Share Calculation</p>
            <div className="space-y-3 text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#408A71]">Network total revenue</span>
                <span className="font-mono text-[#B0E4CC]">${totalNetworkRevenue.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#408A71]">Node pool (50%)</span>
                <span className="font-mono text-[#B0E4CC]">${nodePoolTotal.toFixed(6)}</span>
              </div>
              <div className="flex justify-between border-t border-[#1a3028] pt-3">
                <span className="text-[#00D1FF]">Your earned share</span>
                <span className="font-mono text-[#00D1FF]">${myEarnings.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#408A71]">Your % of pool</span>
                <span className="font-mono text-[#B0E4CC]">
                  {nodePoolTotal > 0 ? ((myEarnings / nodePoolTotal) * 100).toFixed(4) : "0.00"}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#0c1a17] border border-[#1a3028] rounded-md p-4">
            <p className="text-[10px] text-[#285A48] uppercase tracking-wider mb-3">How to Earn More</p>
            <div className="space-y-2">
              {[
                { label: "Route more RPC requests", desc: "Earnings proportional to your traffic" },
                { label: "Keep node online", desc: "100% uptime = maximum share" },
                { label: "Add more chains", desc: "Multi-chain nodes earn from all" },
                { label: "Upgrade tier", desc: "Higher tiers get priority routing" },
              ].map((tip) => (
                <div key={tip.label} className="p-2.5 rounded border border-[#1a3028] hover:border-[#285A48] transition-colors">
                  <p className="text-[11px] text-[#B0E4CC]">{tip.label}</p>
                  <p className="text-[10px] text-[#285A48] mt-0.5">{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
