export const MACHINE_ACCESS_NAME = "Satelink Machine Access";

export const MACHINE_ACCESS_ENVIRONMENTS = [
  "local",
  "development",
  "preview",
  "staging",
  "production",
];

export const MACHINE_ACCESS_PERMISSIONS = [
  "read:logs",
  "read:metrics",
  "read:deployments",
  "read:runtime",
  "read:topology",
  "read:queues",
  "read:analytics",
  "write:deployments",
  "write:builds",
  "write:configs",
  "write:runtime",
  "write:services",
  "admin:tokens",
  "admin:infrastructure",
  "admin:billing",
];

export const MACHINE_ACCESS_TOKEN_TYPES = [
  "readonly-audit-token",
  "deployment-token",
  "observability-token",
  "ci-token",
  "ai-agent-token",
  "infra-admin-token",
  "temporary-session-token",
  "project-scoped-token",
];

export const MACHINE_ACCESS_ROLE_TEMPLATES = {
  audit_reader: [
    "read:logs",
    "read:metrics",
    "read:deployments",
    "read:runtime",
    "read:topology",
    "read:queues",
    "read:analytics",
  ],
  observability_operator: [
    "read:logs",
    "read:metrics",
    "read:deployments",
    "read:runtime",
    "read:topology",
    "read:queues",
    "read:analytics",
  ],
  deployment_operator: [
    "read:logs",
    "read:deployments",
    "read:runtime",
    "write:deployments",
    "write:builds",
  ],
  ci_runner: [
    "read:logs",
    "read:deployments",
    "read:runtime",
    "write:builds",
    "write:deployments",
  ],
  agent_sandbox: [
    "read:logs",
    "read:metrics",
    "read:deployments",
    "read:runtime",
    "read:topology",
    "read:queues",
    "read:analytics",
    "write:builds",
    "write:deployments",
  ],
  infra_admin: MACHINE_ACCESS_PERMISSIONS,
};

export const MACHINE_ACCESS_TOKEN_DEFAULTS = {
  "readonly-audit-token": {
    scopes: MACHINE_ACCESS_ROLE_TEMPLATES.audit_reader,
    rateLimit: { windowMs: 60_000, max: 180 },
    expiresInHours: 24 * 30,
  },
  "deployment-token": {
    scopes: MACHINE_ACCESS_ROLE_TEMPLATES.deployment_operator,
    rateLimit: { windowMs: 60_000, max: 60 },
    expiresInHours: 24 * 7,
  },
  "observability-token": {
    scopes: MACHINE_ACCESS_ROLE_TEMPLATES.observability_operator,
    rateLimit: { windowMs: 60_000, max: 240 },
    expiresInHours: 24 * 14,
  },
  "ci-token": {
    scopes: MACHINE_ACCESS_ROLE_TEMPLATES.ci_runner,
    rateLimit: { windowMs: 60_000, max: 90 },
    expiresInHours: 24 * 7,
  },
  "ai-agent-token": {
    scopes: MACHINE_ACCESS_ROLE_TEMPLATES.agent_sandbox,
    rateLimit: { windowMs: 60_000, max: 90 },
    expiresInHours: 8,
  },
  "infra-admin-token": {
    scopes: MACHINE_ACCESS_PERMISSIONS,
    rateLimit: { windowMs: 60_000, max: 45 },
    expiresInHours: 12,
  },
  "temporary-session-token": {
    scopes: MACHINE_ACCESS_ROLE_TEMPLATES.audit_reader,
    rateLimit: { windowMs: 60_000, max: 120 },
    expiresInHours: 1,
  },
  "project-scoped-token": {
    scopes: [
      "read:logs",
      "read:metrics",
      "read:deployments",
      "read:runtime",
      "write:builds",
      "write:deployments",
    ],
    rateLimit: { windowMs: 60_000, max: 90 },
    expiresInHours: 24 * 14,
  },
};

export const MACHINE_ACCESS_SCOPE_POLICIES = {
  "readonly-audit-token": (scope) => scope.startsWith("read:"),
  "deployment-token": (scope) =>
    [
      "read:logs",
      "read:deployments",
      "read:runtime",
      "write:deployments",
      "write:builds",
      "write:runtime",
    ].includes(scope),
  "observability-token": (scope) => scope.startsWith("read:"),
  "ci-token": (scope) =>
    [
      "read:logs",
      "read:deployments",
      "read:runtime",
      "write:deployments",
      "write:builds",
    ].includes(scope),
  "ai-agent-token": (scope) =>
    [
      "read:logs",
      "read:metrics",
      "read:deployments",
      "read:runtime",
      "read:topology",
      "read:queues",
      "read:analytics",
      "write:deployments",
      "write:builds",
    ].includes(scope),
  "infra-admin-token": (scope) => MACHINE_ACCESS_PERMISSIONS.includes(scope),
  "temporary-session-token": (scope) => scope.startsWith("read:"),
  "project-scoped-token": (scope) =>
    [
      "read:logs",
      "read:metrics",
      "read:deployments",
      "read:runtime",
      "write:deployments",
      "write:builds",
    ].includes(scope),
};

export const SAFE_AGENT_SANDBOX_POLICY = {
  tokenType: "ai-agent-token",
  allowedReadScopes: [
    "read:logs",
    "read:metrics",
    "read:deployments",
    "read:runtime",
    "read:topology",
    "read:queues",
    "read:analytics",
  ],
  allowedWriteScopes: ["write:builds", "write:deployments"],
  allowedEnvironments: ["local", "development", "preview", "staging"],
  deniedScopes: [
    "write:configs",
    "write:runtime",
    "write:services",
    "admin:tokens",
    "admin:infrastructure",
    "admin:billing",
  ],
  allowedActions: [
    "observability.inspect",
    "audit.run",
    "deploy.preview",
    "build.preview",
    "diagnostics.run",
  ],
  deniedActions: [
    "deploy.production",
    "runtime.destroy",
    "service.purge",
    "secret.read",
    "billing.mutate",
  ],
};

export const PROTECTED_ENVIRONMENTS = new Set(["production"]);

export const MUTATING_MACHINE_ACCESS_SCOPES = new Set(
  MACHINE_ACCESS_PERMISSIONS.filter((scope) => scope.startsWith("write:") || scope.startsWith("admin:")),
);

export const MACHINE_ACCESS_ADMIN_SECRET_HEADER = "x-satelink-admin-secret";
export const MACHINE_ACCESS_NONCE_HEADER = "x-satelink-nonce";

export function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function parseJsonField(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
