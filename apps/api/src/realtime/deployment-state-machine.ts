import { DeploymentLifecycleState } from "./contracts";

const transitions: Record<DeploymentLifecycleState, DeploymentLifecycleState[]> = {
  queued: ["provisioning", "failed"],
  provisioning: ["building", "failed"],
  building: ["deploying", "failed"],
  deploying: ["syncing", "failed"],
  syncing: ["routing", "failed"],
  routing: ["healthcheck", "failed"],
  healthcheck: ["active", "degraded", "failed"],
  active: ["degraded", "failed"],
  degraded: ["retrying", "active", "failed"],
  retrying: ["provisioning", "failed", "rolled_back"],
  failed: ["retrying", "rolled_back"],
  rolled_back: ["queued"],
};

export function canTransition(from: DeploymentLifecycleState, to: DeploymentLifecycleState): boolean {
  return transitions[from].includes(to);
}

export function nextLifecycleState(state: DeploymentLifecycleState): DeploymentLifecycleState {
  if (state === "queued") return "provisioning";
  if (state === "provisioning") return "building";
  if (state === "building") return "deploying";
  if (state === "deploying") return "syncing";
  if (state === "syncing") return "routing";
  if (state === "routing") return "healthcheck";
  if (state === "healthcheck") return "active";
  return state;
}
