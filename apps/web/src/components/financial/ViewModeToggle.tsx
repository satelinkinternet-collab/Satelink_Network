"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type ViewMode = "reality" | "metered" | "forecast";

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

const modes: { value: ViewMode; label: string; description: string }[] = [
  { value: "reality", label: "Reality", description: "Onchain + claimable only" },
  { value: "metered", label: "Metered", description: "Internal economics" },
  { value: "forecast", label: "Forecast", description: "Projections" },
];

export function ViewModeToggle({ value, onChange, className }: ViewModeToggleProps) {
  return (
    <div className={cn("inline-flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800", className)}>
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onChange(mode.value)}
          title={mode.description}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
            value === mode.value
              ? mode.value === "reality"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : mode.value === "metered"
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

export function useViewMode(initial: ViewMode = "reality") {
  const [mode, setMode] = useState<ViewMode>(initial);
  return { mode, setMode };
}
