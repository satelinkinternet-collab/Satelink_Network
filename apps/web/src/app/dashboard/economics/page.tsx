"use client";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
import { useEffect, useState } from "react";

interface EpochData {
  epoch: number;
  totalRevenue: string;
  nodePool: string;
  platformFee: string;
  distribution: string;
  status: string;
}

export default function EconomicsPage() {
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [totalDistributed, setTotalDistributed] = useState("0.0000");
  const [history, setHistory] = useState<EpochData[]>([]);

  useEffect(() => {
    fetch("https://rpc.satelink.network/api/status")
      .then(r => r.json())
      .then(d => {
        setCurrentEpoch(d.current_epoch || 0);
      })
      .catch(() => {});

    fetch("/api/settlement/history")
      .then(r => r.json())
      .then(d => {
        setHistory(d.epochs || []);
        setTotalDistributed(d.totalDistributed || "0.0000");
      })
      .catch(() => {});
  }, []);

  const splits = [
    { label: "Node Operators", pct: 50, color: "#408A71", desc: "Direct earnings for active nodes" },
    { label: "Platform Fee", pct: 30, color: "#285A48", desc: "Infrastructure & development" },
    { label: "Distribution Pool", pct: 20, color: "#00D1FF", desc: "Staking rewards & incentives" },
  ];

  return (
    <div className="p-6 bg-[#091413] min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#B0E4CC]">Protocol Economics</h1>
        <p className="text-[#408A71] text-sm mt-1">Revenue distribution and epoch settlement</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0d1f1d] border border-[#285A48] rounded-lg p-6">
          <div className="text-xs text-[#408A71] uppercase tracking-wider mb-2">Current Epoch</div>
          <div className="text-3xl font-bold text-[#00D1FF] font-mono">{currentEpoch}</div>
        </div>
        <div className="bg-[#0d1f1d] border border-[#285A48] rounded-lg p-6">
          <div className="text-xs text-[#408A71] uppercase tracking-wider mb-2">Total Distributed</div>
          <div className="text-3xl font-bold text-[#B0E4CC] font-mono">${totalDistributed}</div>
        </div>
        <div className="bg-[#0d1f1d] border border-[#285A48] rounded-lg p-6">
          <div className="text-xs text-[#408A71] uppercase tracking-wider mb-2">Epoch Duration</div>
          <div className="text-3xl font-bold text-[#B0E4CC] font-mono">60s</div>
        </div>
      </div>

      <div className="bg-[#0d1f1d] border border-[#285A48] rounded-lg p-6 mb-8">
        <h2 className="text-lg font-bold text-[#B0E4CC] mb-4">Revenue Split (50/30/20)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {splits.map((s) => (
            <div key={s.label} className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#B0E4CC] font-medium">{s.label}</span>
                <span className="text-xl font-bold" style={{ color: s.color }}>{s.pct}%</span>
              </div>
              <div className="h-2 bg-[#0a1816] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
              </div>
              <p className="text-xs text-[#408A71] mt-2">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#0d1f1d] border border-[#285A48] rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-[#285A48]">
          <h2 className="text-lg font-bold text-[#B0E4CC]">Settlement History</h2>
        </div>
        {history.length === 0 ? (
          <p className="text-[#408A71] text-sm text-center py-12">
            No settlement history yet. Epochs will appear here as revenue is generated.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#0a1816] text-[#408A71] uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Epoch</th>
                <th className="px-4 py-3 text-left">Total Revenue</th>
                <th className="px-4 py-3 text-left">Node Pool (50%)</th>
                <th className="px-4 py-3 text-left">Platform (30%)</th>
                <th className="px-4 py-3 text-left">Pool (20%)</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#285A48]">
              {history.map((epoch) => (
                <tr key={epoch.epoch} className="text-[#B0E4CC]">
                  <td className="px-4 py-3 font-mono">{epoch.epoch}</td>
                  <td className="px-4 py-3 font-mono">${epoch.totalRevenue}</td>
                  <td className="px-4 py-3 font-mono text-[#408A71]">${epoch.nodePool}</td>
                  <td className="px-4 py-3 font-mono text-[#285A48]">${epoch.platformFee}</td>
                  <td className="px-4 py-3 font-mono text-[#00D1FF]">${epoch.distribution}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      epoch.status === "settled" ? "bg-[#408A71]/20 text-[#408A71]" : "bg-[#F59E0B]/20 text-[#F59E0B]"
                    }`}>
                      {epoch.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
