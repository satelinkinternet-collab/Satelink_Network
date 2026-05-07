import { satelinkTokens } from "@/lib/design-tokens";

export type RuntimeCondition = "stable" | "warning" | "critical";

export function getRuntimeCondition(queueDepth: number, failed: number): RuntimeCondition {
  if (queueDepth > 2100 || failed > 16) return "critical";
  if (queueDepth > 1400 || failed > 7) return "warning";
  return "stable";
}

export function runtimeConditionColor(condition: RuntimeCondition): string {
  if (condition === "critical") return satelinkTokens.colors.danger;
  if (condition === "warning") return satelinkTokens.colors.warning;
  return satelinkTokens.colors.success;
}
