export type AdvancedDeploymentState =
  | "queued"
  | "provisioning"
  | "building"
  | "deploying"
  | "syncing"
  | "routing"
  | "healthcheck"
  | "active"
  | "degraded"
  | "retrying"
  | "failed"
  | "rolled_back";

export const lifecycleOrder: AdvancedDeploymentState[] = [
  "queued",
  "provisioning",
  "building",
  "deploying",
  "syncing",
  "routing",
  "healthcheck",
  "active",
];

export function getNextLifecycleState(
  current: AdvancedDeploymentState,
  failureChance = 0.1,
): AdvancedDeploymentState {
  if (current === "failed") return Math.random() < 0.55 ? "retrying" : "rolled_back";
  if (current === "retrying") return "provisioning";
  if (current === "active" && Math.random() < 0.12) return "degraded";
  if (current === "degraded") return Math.random() < 0.4 ? "retrying" : "active";

  if (Math.random() < failureChance && current !== "queued" && current !== "healthcheck") {
    return "failed";
  }

  const idx = lifecycleOrder.indexOf(current);
  if (idx === -1 || idx === lifecycleOrder.length - 1) return "active";
  return lifecycleOrder[idx + 1];
}

export function progressFromState(state: AdvancedDeploymentState): number {
  const map: Record<AdvancedDeploymentState, number> = {
    queued: 6,
    provisioning: 17,
    building: 34,
    deploying: 52,
    syncing: 67,
    routing: 79,
    healthcheck: 92,
    active: 100,
    degraded: 74,
    retrying: 42,
    failed: 66,
    rolled_back: 100,
  };
  return map[state];
}
