import {
  MACHINE_ACCESS_PERMISSIONS,
  MACHINE_ACCESS_ROLE_TEMPLATES,
  MACHINE_ACCESS_SCOPE_POLICIES,
  MACHINE_ACCESS_TOKEN_DEFAULTS,
  SAFE_AGENT_SANDBOX_POLICY,
  uniqueValues,
} from "./contracts.js";

export class PermissionValidatorService {
  validatePermissions(scopes = []) {
    const invalid = scopes.filter((scope) => !MACHINE_ACCESS_PERMISSIONS.includes(scope));
    if (invalid.length > 0) {
      throw new Error(`Unknown machine access scopes: ${invalid.join(", ")}`);
    }
  }

  expandRoleBindings(roleBindings = []) {
    return uniqueValues(roleBindings.flatMap((role) => MACHINE_ACCESS_ROLE_TEMPLATES[role] || []));
  }

  resolveScopes({ tokenType, explicitScopes = [], roleBindings = [], defaultScopes = [] }) {
    const template = MACHINE_ACCESS_TOKEN_DEFAULTS[tokenType];
    if (!template) {
      throw new Error(`Unsupported token type: ${tokenType}`);
    }
    const requested = explicitScopes.length > 0 ? explicitScopes : template.scopes;
    const resolved = uniqueValues([...defaultScopes, ...this.expandRoleBindings(roleBindings), ...requested]);
    this.validatePermissions(resolved);
    const policy = MACHINE_ACCESS_SCOPE_POLICIES[tokenType];
    const rejected = resolved.filter((scope) => !policy(scope));
    if (rejected.length > 0) {
      throw new Error(`${tokenType} cannot carry scopes: ${rejected.join(", ")}`);
    }
    return resolved;
  }

  hasScopes(grantedScopes = [], requiredScopes = []) {
    const granted = new Set(grantedScopes);
    return requiredScopes.every((scope) => granted.has(scope));
  }

  assertScopes(grantedScopes = [], requiredScopes = []) {
    if (!this.hasScopes(grantedScopes, requiredScopes)) {
      throw new Error(`Missing required scopes: ${requiredScopes.join(", ")}`);
    }
  }

  assertAgentSandbox(tokenContext, { environment, action }) {
    if (tokenContext.tokenType !== SAFE_AGENT_SANDBOX_POLICY.tokenType) return;
    const deniedScopes = tokenContext.scopes.filter((scope) => SAFE_AGENT_SANDBOX_POLICY.deniedScopes.includes(scope));
    if (deniedScopes.length > 0) {
      throw new Error(`AI agent token contains denied scopes: ${deniedScopes.join(", ")}`);
    }
    if (!SAFE_AGENT_SANDBOX_POLICY.allowedEnvironments.includes(environment)) {
      throw new Error(`AI agent tokens cannot mutate ${environment}`);
    }
    if (!SAFE_AGENT_SANDBOX_POLICY.allowedActions.includes(action)) {
      throw new Error(`AI agent action blocked by sandbox policy: ${action}`);
    }
  }
}
