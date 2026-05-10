"use client";

import { useEffect, useState } from "react";
import { OsPageTemplate } from "@/components/satelink/os-page-template";
import { useInfrastructureStore } from "@/store/useInfrastructureStore";

interface EpochEarning {
  epoch_id: number;
  total_revenue_usdt: number;
  node_pool_usdt: number;
  platform_share_usdt: number;
  distributor_share_usdt: number;
  event_count: number;
  status: string;
  closed_at: string;
}

export default function SatelinkBillingPage() {
  const [epochs, setEpochs] = useState<EpochEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ revenue: 0, nodePool: 0, platform: 0, distributor: 0 });
  const notifications = useInfrastructureStore((s) => s.notifications);

  useEffect(() => {
    const fetchEpochs = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("satelink_jwt") : null;
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("https://rpc.satelink.network/api/settlement/history", { headers });
        const data = await res.json();

        if (data.epochs) {
          setEpochs(data.epochs);
          const t = data.epochs.reduce(
            (acc: typeof totals, e: EpochEarning) => ({
              revenue: acc.revenue + (e.total_revenue_usdt || 0),
              nodePool: acc.nodePool + (e.node_pool_usdt || 0),
              platform: acc.platform + (e.platform_share_usdt || 0),
              distributor: acc.distributor + (e.distributor_share_usdt || 0),
            }),
            { revenue: 0, nodePool: 0, platform: 0, distributor: 0 }
          );
          setTotals(t);
        }
      } catch (err) {
        console.error("[Billing] Fetch error:", err);
        const epochNotifs = notifications
          .filter((n) => n.title.includes("Epoch"))
          .map((n, i) => {
            const match = n.description.match(/Revenue: \$([\d.]+)/);
            const revenue = match ? parseFloat(match[1]) : 0;
            return {
              epoch_id: parseInt(n.title.match(/Epoch (\d+)/)?.[1] || String(i)),
              total_revenue_usdt: revenue,
              node_pool_usdt: revenue * 0.5,
              platform_share_usdt: revenue * 0.3,
              distributor_share_usdt: revenue * 0.2,
              event_count: 0,
              status: "CLOSED",
              closed_at: n.createdAt,
            };
          });
        if (epochNotifs.length > 0) {
          setEpochs(epochNotifs);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchEpochs();
    const interval = setInterval(fetchEpochs, 60000);
    return () => clearInterval(interval);
  }, [notifications]);

  return (
    <OsPageTemplate
      title="Settlement & Billing"
      subtitle="Epoch-based revenue distribution with 50/30/20 split model."
      metrics={[
        { label: "Total Revenue", value: `$${totals.revenue.toFixed(4)}`, detail: "All epochs" },
        { label: "Node Pool (50%)", value: `$${totals.nodePool.toFixed(4)}`, detail: "Operators" },
        { label: "Platform (30%)", value: `$${totals.platform.toFixed(4)}`, detail: "Infrastructure" },
        { label: "Distribution (20%)", value: `$${totals.distributor.toFixed(4)}`, detail: "Rewards" },
      ]}
    >
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-[#B0E4CC]">Epoch Earnings History</p>
          <span className="text-xs text-[#408A71]">{epochs.length} epochs</span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00D1FF] border-t-transparent" />
          </div>
        ) : epochs.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-center">
            <p className="text-[#B0E4CC]/60">No epoch data available yet.</p>
            <p className="mt-2 text-sm text-[#408A71]">
              Epochs close every 60 seconds. Revenue data will appear after the first RPC requests.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[#B0E4CC]/60">
                  <th className="pb-2 font-medium">Epoch</th>
                  <th className="pb-2 font-medium">Revenue</th>
                  <th className="pb-2 font-medium">Node Pool</th>
                  <th className="pb-2 font-medium">Platform</th>
                  <th className="pb-2 font-medium">Events</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Closed At</th>
                </tr>
              </thead>
              <tbody>
                {epochs.map((epoch) => (
                  <tr key={epoch.epoch_id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 font-mono text-white">#{epoch.epoch_id}</td>
                    <td className="py-2 font-mono text-[#00D1FF]">${(epoch.total_revenue_usdt || 0).toFixed(6)}</td>
                    <td className="py-2 font-mono text-emerald-300">${(epoch.node_pool_usdt || 0).toFixed(6)}</td>
                    <td className="py-2 font-mono text-[#B0E4CC]">${(epoch.platform_share_usdt || 0).toFixed(6)}</td>
                    <td className="py-2 text-[#B0E4CC]">{epoch.event_count || 0}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          epoch.status === "CLOSED"
                            ? "bg-emerald-400/20 text-emerald-300"
                            : "bg-amber-400/20 text-amber-300"
                        }`}
                      >
                        {epoch.status}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-[#B0E4CC]/60">
                      {epoch.closed_at ? new Date(epoch.closed_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="mb-3 text-sm font-medium text-[#B0E4CC]">Revenue Split Model</p>
          <div className="space-y-3">
            <SplitBar label="Node Operators" pct={50} color="bg-emerald-400" />
            <SplitBar label="Platform" pct={30} color="bg-[#00D1FF]" />
            <SplitBar label="Distribution Pool" pct={20} color="bg-[#408A71]" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="mb-3 text-sm font-medium text-[#B0E4CC]">Settlement Contract</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#B0E4CC]/60">ClaimsContract</span>
              <a
                href="https://polygonscan.com/address/0xE475c53B88190FD2130dB1E37504991EFe283fb0"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[#00D1FF] hover:underline"
              >
                0xE475...3fb0
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-[#B0E4CC]/60">Network</span>
              <span className="text-white">Polygon PoS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#B0E4CC]/60">Token</span>
              <span className="text-white">USDT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#B0E4CC]/60">Epoch Duration</span>
              <span className="text-white">60 seconds</span>
            </div>
          </div>
        </div>
      </div>
    </OsPageTemplate>
  );
}

function SplitBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-[#B0E4CC]">{label}</span>
        <span className="text-white">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
