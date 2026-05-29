"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FinancialBadge, BadgeType } from "./FinancialBadge";
import {
  Activity, ArrowDownToLine, Wallet, Clock, CheckCircle2,
  AlertTriangle, Info, RefreshCw, ExternalLink, Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface FinancialTruthData {
  ok: boolean;
  timestamp: string;
  query_ms: number;
  metered_value_usdt: number;
  allocated_value_usdt: number;
  unpaid_value_usdt: number;
  treasury_real_usdt: number;
  withdrawable_now_usdt: number;
  claimed_total_usdt: number;
  cash_conversion_pct: number;
  status: "healthy" | "metered_only" | "treasury_constrained";
  sources: {
    metered: { table: string; query: string };
    allocated: { table: string; query: string };
    unpaid: { table: string; query: string };
    treasury: { source: string; address: string; contract: string; error: string | null };
    claimed: { tables: string[] };
  };
  settlement: {
    batches_pending: number;
    batches_confirmed: number;
  };
  pipeline: {
    revenue_events_v2: { count: number; sum_usdt: number };
    epoch_ledger: { open: number; closed: number; total_revenue: number };
    epoch_earnings: { unpaid: number; paid: number; sum_unpaid: number; sum_paid: number };
    settlement_batches: { pending: number; confirmed: number };
    node_claims: { count: number; sum_usdt: number };
    bottleneck: string | null;
    bottleneck_reason: string | null;
  };
  warnings: Array<{ code: string; message: string; severity: string }>;
}

interface TruthCardProps {
  title: string;
  value: string;
  badge: BadgeType;
  icon: React.ReactNode;
  color: string;
  source: { endpoint: string; table: string };
  loading?: boolean;
  refreshedAt: number;
}

function TruthCard({ title, value, badge, icon, color, source, loading, refreshedAt }: TruthCardProps) {
  const [showSource, setShowSource] = useState(false);

  return (
    <Card className="bg-zinc-900/80 border-zinc-800/60 relative group hover:border-zinc-700/80 transition-all">
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
          <p className={cn(
            "text-2xl font-bold",
            badge === "LIVE" || badge === "ONCHAIN" ? "text-emerald-400" :
            badge === "SETTLED" ? "text-blue-400" :
            badge === "UNPAID" ? "text-amber-400" :
            badge === "ALLOCATED" ? "text-cyan-400" :
            "text-zinc-300"
          )}>
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
                <span className="text-zinc-400">{new Date(refreshedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FinancialTruthPanelProps {
  className?: string;
}

export function FinancialTruthPanel({ className }: FinancialTruthPanelProps) {
  const [data, setData] = useState<FinancialTruthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState(Date.now());

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get("/financial/truth");
      if (res.data.ok) {
        setData(res.data);
        setRefreshedAt(Date.now());
      } else {
        setError(res.data.error || "Failed to fetch");
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const cards: TruthCardProps[] = data ? [
    {
      title: "Metered Value",
      value: `$${data.metered_value_usdt.toFixed(4)}`,
      badge: "METERED",
      icon: <Activity className="h-4 w-4 text-purple-400" />,
      color: "bg-purple-500/10",
      source: { endpoint: "/api/financial/truth", table: data.sources.metered.table },
      loading,
      refreshedAt,
    },
    {
      title: "Allocated",
      value: `$${data.allocated_value_usdt.toFixed(4)}`,
      badge: "ALLOCATED",
      icon: <Database className="h-4 w-4 text-cyan-400" />,
      color: "bg-cyan-500/10",
      source: { endpoint: "/api/financial/truth", table: data.sources.allocated.table },
      loading,
      refreshedAt,
    },
    {
      title: "Unpaid",
      value: `$${data.unpaid_value_usdt.toFixed(4)}`,
      badge: "UNPAID",
      icon: <Clock className="h-4 w-4 text-amber-400" />,
      color: "bg-amber-500/10",
      source: { endpoint: "/api/financial/truth", table: data.sources.unpaid.table },
      loading,
      refreshedAt,
    },
    {
      title: "Treasury Real",
      value: `$${data.treasury_real_usdt.toFixed(4)}`,
      badge: "ONCHAIN",
      icon: <Wallet className="h-4 w-4 text-emerald-400" />,
      color: "bg-emerald-500/10",
      source: { endpoint: "/api/financial/truth", table: `USDT.balanceOf(${data.sources.treasury.address.slice(0, 10)}...)` },
      loading,
      refreshedAt,
    },
    {
      title: "Withdrawable",
      value: `$${data.withdrawable_now_usdt.toFixed(4)}`,
      badge: "LIVE",
      icon: <ArrowDownToLine className="h-4 w-4 text-emerald-400" />,
      color: "bg-emerald-500/10",
      source: { endpoint: "/api/financial/truth", table: "MIN(unpaid, treasury)" },
      loading,
      refreshedAt,
    },
    {
      title: "Claimed Total",
      value: `$${data.claimed_total_usdt.toFixed(4)}`,
      badge: "SETTLED",
      icon: <CheckCircle2 className="h-4 w-4 text-blue-400" />,
      color: "bg-blue-500/10",
      source: { endpoint: "/api/financial/truth", table: data.sources.claimed.tables.join(", ") },
      loading,
      refreshedAt,
    },
  ] : [];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Financial Truth</h2>
          <p className="text-xs text-zinc-500">Canonical source of all financial metrics</p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className={cn(
              "text-xs px-2 py-1 rounded",
              data.status === "healthy" ? "bg-emerald-500/10 text-emerald-400" :
              data.status === "treasury_constrained" ? "bg-amber-500/10 text-amber-400" :
              "bg-purple-500/10 text-purple-400"
            )}>
              {data.status.replace(/_/g, " ").toUpperCase()}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Warnings */}
      {data?.warnings && data.warnings.length > 0 && (
        <div className="space-y-2">
          {data.warnings.map((warning, i) => (
            <div
              key={i}
              className={cn(
                "p-3 rounded-lg border flex items-start gap-2",
                warning.severity === "critical"
                  ? "bg-red-500/10 border-red-500/30"
                  : "bg-amber-500/10 border-amber-500/30"
              )}
            >
              <AlertTriangle className={cn(
                "h-4 w-4 mt-0.5 flex-shrink-0",
                warning.severity === "critical" ? "text-red-400" : "text-amber-400"
              )} />
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  warning.severity === "critical" ? "text-red-400" : "text-amber-400"
                )}>
                  {warning.message}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">Code: {warning.code}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {loading && !data ? (
          Array(6).fill(0).map((_, i) => (
            <Card key={i} className="bg-zinc-900/80 border-zinc-800/60">
              <CardContent className="p-4">
                <div className="h-20 bg-zinc-800/50 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))
        ) : (
          cards.map((card, i) => <TruthCard key={i} {...card} />)
        )}
      </div>

      {/* Cash Conversion */}
      {data && (
        <Card className="bg-zinc-900/80 border-zinc-800/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Cash Conversion Rate</p>
                <p className="text-xl font-bold text-zinc-100">{data.cash_conversion_pct.toFixed(2)}%</p>
                <p className="text-xs text-zinc-600 mt-1">claimed_total / metered_value</p>
              </div>
              <div className="text-right text-xs text-zinc-500">
                <p>Query: {data.query_ms}ms</p>
                <p>Updated: {new Date(data.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline Bottleneck */}
      {data?.pipeline?.bottleneck && (
        <Card className="bg-zinc-900/80 border-zinc-800/60 border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Settlement Pipeline Bottleneck
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-300 font-medium">{data.pipeline.bottleneck_reason}</p>
            <p className="text-xs text-zinc-500 mt-1">
              Table: <span className="font-mono text-zinc-400">{data.pipeline.bottleneck}</span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
