"use client";

import { AlertTriangle, Info } from "lucide-react";

interface MeteredWarningBannerProps {
  variant?: "warning" | "info";
  message?: string;
}

export function MeteredWarningBanner({
  variant = "warning",
  message = "Displayed usage value may not equal collected or withdrawable USDT."
}: MeteredWarningBannerProps) {
  const isWarning = variant === "warning";

  return (
    <div className={`rounded-lg p-3 mb-4 flex items-center gap-2 border ${
      isWarning
        ? "bg-amber-900/10 border-amber-500/20"
        : "bg-blue-900/10 border-blue-500/20"
    }`}>
      {isWarning ? (
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
      ) : (
        <Info className="h-4 w-4 text-blue-500 shrink-0" />
      )}
      <span className={`text-xs ${isWarning ? "text-amber-300" : "text-blue-300"}`}>
        {message}
      </span>
    </div>
  );
}
