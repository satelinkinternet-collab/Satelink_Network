"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FinancialBadge, BadgeType } from "./FinancialBadge";
import { Wallet, ArrowDownToLine, Activity, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface SourceMetadata {
  endpoint: string;
  table: string;
  refreshedAt: number;
}

interface FinancialCardProps {
  title: string;
  value: string;
  badge: BadgeType;
  icon: React.ReactNode;
  color: string;
  source: SourceMetadata;
  loading?: boolean;
}

function FinancialCard({ title, value, badge, icon, color, source, loading }: FinancialCardProps) {
  const [showSource, setShowSource] = useState(false);

  return (
    <Card className="bg-zinc-900/80 border-zinc-800/60 relative group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={cn("p-2 rounded-lg", color)}>
            {icon}
          </div>
          <div className="flex items-center gap-1">
            <FinancialBadge type={badge} />
            <button
              onClick={() => setShowSource(!showSource)}
              className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
              title="View source"
            >
              <Info className="h-3 w-3" />
            </button>
          </div>
        </div>
        <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">{title}</p>
        {loading ? (
          <div className="h-8 w-24 bg-zinc-800 animate-pulse rounded" />
        ) : (
          <p className={cn("text-2xl font-bold", badge === "LIVE" || badge === "ONCHAIN" ? "text-emerald-400" : badge === "UNPAID" ? "text-amber-400" : "text-zinc-300")}>
            {value}
          </p>
        )}

        {showSource && (
          <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] z-10 shadow-xl">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Endpoint:</span>
                <span className="text-zinc-400 font-mono">{source.endpoint}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Table:</span>
                <span className="text-zinc-400 font-mono">{source.table}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Refreshed:</span>
                <span className="text-zinc-400">{new Date(source.refreshedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FinancialCardsSectionProps {
  className?: string;
}

export function FinancialCardsSection({ className }: FinancialCardsSectionProps) {
  const [data, setData] = useState({
    treasuryBalance: "0.00",
    withdrawableNow: "0.00",
    meteredUsage: "0.00",
    unpaidEarnings: "0.00",
  });
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState(Date.now());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [economicsRes, settlementRes] = await Promise.all([
          api.get("/admin/economics/summary").catch(() => ({ data: {} })),
          api.get("/admin/settlement/overview").catch(() => ({ data: {} })),
        ]);

        const economics = economicsRes.data;
        const settlement = settlementRes.data;

        setData({
          treasuryBalance: economics.treasury?.balance_usdt?.toFixed(2) || "0.00",
          withdrawableNow: economics.treasury?.withdrawable_usdt?.toFixed(2) || "0.00",
          meteredUsage: economics.allTime?.usdt?.toFixed(2) || settlement.stats?.total_metered?.toFixed(2) || "0.00",
          unpaidEarnings: settlement.stats?.unpaid_usdt?.toFixed(2) || economics.unpaid?.total_usdt?.toFixed(2) || "0.00",
        });
        setRefreshedAt(Date.now());
      } catch (e) {
        console.error("[FinancialCards] Fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const cards: FinancialCardProps[] = [
    {
      title: "Collected Onchain",
      value: `$${data.treasuryBalance}`,
      badge: "LIVE",
      icon: <Wallet className="h-4 w-4 text-emerald-400" />,
      color: "bg-emerald-500/10",
      source: { endpoint: "/admin/treasury/balance", table: "Polygon USDT.balanceOf()", refreshedAt },
      loading,
    },
    {
      title: "Withdrawable Now",
      value: `$${data.withdrawableNow}`,
      badge: "ONCHAIN",
      icon: <ArrowDownToLine className="h-4 w-4 text-blue-400" />,
      color: "bg-blue-500/10",
      source: { endpoint: "/api/claim/available", table: "MIN(unpaid, treasury)", refreshedAt },
      loading,
    },
    {
      title: "Metered Usage Value",
      value: `$${data.meteredUsage}`,
      badge: "METERED",
      icon: <Activity className="h-4 w-4 text-purple-400" />,
      color: "bg-purple-500/10",
      source: { endpoint: "/admin/economics/summary", table: "revenue_events_v2", refreshedAt },
      loading,
    },
    {
      title: "Unpaid Earnings",
      value: `$${data.unpaidEarnings}`,
      badge: "UNPAID",
      icon: <Clock className="h-4 w-4 text-amber-400" />,
      color: "bg-amber-500/10",
      source: { endpoint: "/admin/settlement/overview", table: "epoch_earnings", refreshedAt },
      loading,
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3", className)}>
      {cards.map((card, i) => (
        <FinancialCard key={i} {...card} />
      ))}
    </div>
  );
}
