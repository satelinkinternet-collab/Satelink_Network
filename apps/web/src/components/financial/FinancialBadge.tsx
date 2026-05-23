"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type BadgeType = "LIVE" | "ONCHAIN" | "UNPAID" | "METERED" | "FORECAST" | "PENDING" | "CLAIMED" | "ALLOCATED" | "SETTLED";

const badgeStyles: Record<BadgeType, { bg: string; text: string; border: string }> = {
  LIVE: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  ONCHAIN: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  UNPAID: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  METERED: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  FORECAST: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/30" },
  PENDING: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" },
  CLAIMED: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" },
  ALLOCATED: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
  SETTLED: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30" },
};

interface FinancialBadgeProps {
  type: BadgeType;
  className?: string;
}

export function FinancialBadge({ type, className }: FinancialBadgeProps) {
  const style = badgeStyles[type];
  return (
    <Badge
      className={cn(
        "text-[9px] font-semibold uppercase tracking-wider border",
        style.bg,
        style.text,
        style.border,
        className
      )}
    >
      {type === "LIVE" && "● "}{type}
    </Badge>
  );
}
