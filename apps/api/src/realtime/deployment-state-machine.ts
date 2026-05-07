import { DeploymentLifecycleState } from "./contracts";

const transitions: Record<DeploymentLifecycleState, DeploymentLifecycleState[]> = {
  queued: ["building", "failed"],
  building: ["routing", "failed"],
  routing: ["active", "failed"],
  active: ["failed"],
  failed: ["queued"],
};

export function canTransition(from: DeploymentLifecycleState, to: DeploymentLifecycleState): boolean {
  return transitions[from].includes(to);
}

export function nextLifecycleState(state: DeploymentLifecycleState): DeploymentLifecycleState {
  if (state === "queued") return "building";
  if (state === "building") return "routing";
  if (state === "routing") return "active";
  return state;
}
