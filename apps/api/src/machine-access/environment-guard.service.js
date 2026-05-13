import { MACHINE_ACCESS_ENVIRONMENTS, PROTECTED_ENVIRONMENTS, uniqueValues } from "./contracts.js";

export class EnvironmentGuardService {
  normalizeEnvironment(environment) {
    if (!environment) return "preview";
    const normalized = String(environment).toLowerCase();
    if (!MACHINE_ACCESS_ENVIRONMENTS.includes(normalized)) {
      throw new Error(`Unsupported environment: ${environment}`);
    }
    return normalized;
  }

  normalizeList(values = [], fallback = ["preview"]) {
    const input = values.length > 0 ? values : fallback;
    return uniqueValues(input.map((value) => this.normalizeEnvironment(value)));
  }

  assertEnvironmentAccess(grantedEnvironments = [], targetEnvironment) {
    const normalized = this.normalizeEnvironment(targetEnvironment);
    if (!grantedEnvironments.includes("*") && !grantedEnvironments.includes(normalized)) {
      throw new Error(`Token cannot access ${normalized}`);
    }
    return normalized;
  }

  assertProjectAccess(grantedProjects = [], projectId) {
    const normalized = projectId || "core-platform";
    if (!grantedProjects.includes("*") && !grantedProjects.includes(normalized)) {
      throw new Error(`Token cannot access project ${normalized}`);
    }
    return normalized;
  }

  assertIpAccess(ipRestrictions = [], requestIp) {
    if (!ipRestrictions || ipRestrictions.length === 0) return true;
    const normalizedIp = String(requestIp || "").replace("::ffff:", "");
    if (!ipRestrictions.includes(normalizedIp)) {
      throw new Error(`Source IP ${normalizedIp || "unknown"} is not allowed`);
    }
    return true;
  }

  isProtectedEnvironment(environment) {
    return PROTECTED_ENVIRONMENTS.has(this.normalizeEnvironment(environment));
  }
}
