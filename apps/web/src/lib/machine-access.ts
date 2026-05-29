export type TokenBlueprint = {
  type: string;
  scopeProfile: string[];
  defaultTtl: string;
  environments: string;
  rateLimit: string;
  primaryUse: string;
};

export const machineAccessTokenBlueprints: TokenBlueprint[] = [
  {
    type: "readonly-audit-token",
    scopeProfile: ["read:*"],
    defaultTtl: "30d",
    environments: "preview, staging, production",
    rateLimit: "180 req/min",
    primaryUse: "Security reviews, runtime audits, forensic playback",
  },
  {
    type: "deployment-token",
    scopeProfile: ["read:deployments", "read:runtime", "write:deployments", "write:builds"],
    defaultTtl: "7d",
    environments: "preview, staging",
    rateLimit: "60 req/min",
    primaryUse: "Build and preview deployment orchestration",
  },
  {
    type: "observability-token",
    scopeProfile: ["read:logs", "read:metrics", "read:runtime", "read:queues"],
    defaultTtl: "14d",
    environments: "preview, staging, production",
    rateLimit: "240 req/min",
    primaryUse: "Metrics, logs, queue health, websocket diagnostics",
  },
  {
    type: "ci-token",
    scopeProfile: ["read:deployments", "read:runtime", "write:builds", "write:deployments"],
    defaultTtl: "7d",
    environments: "preview, staging",
    rateLimit: "90 req/min",
    primaryUse: "CI/CD preview build lanes",
  },
  {
    type: "ai-agent-token",
    scopeProfile: ["read:*", "write:builds", "write:deployments"],
    defaultTtl: "8h",
    environments: "local, development, preview, staging",
    rateLimit: "90 req/min",
    primaryUse: "AI-assisted audits, diagnostics, preview deployment requests",
  },
  {
    type: "infra-admin-token",
    scopeProfile: ["read:*", "write:*", "admin:*"],
    defaultTtl: "12h",
    environments: "all, approval-gated in production",
    rateLimit: "45 req/min",
    primaryUse: "High-trust internal operations with full audit enforcement",
  },
  {
    type: "temporary-session-token",
    scopeProfile: ["read:*"],
    defaultTtl: "1h",
    environments: "scoped from parent token",
    rateLimit: "120 req/min",
    primaryUse: "Websocket handshakes and short-lived delegated sessions",
  },
  {
    type: "project-scoped-token",
    scopeProfile: ["read:*", "write:builds", "write:deployments"],
    defaultTtl: "14d",
    environments: "project-scoped",
    rateLimit: "90 req/min",
    primaryUse: "Tooling and automation constrained to one Satelink project",
  },
];

export const machineAccessScopes = [
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

export const machineAccessAuditExamples = [
  {
    action: "deploy.preview",
    actor: "claude-runtime-auditor",
    environment: "preview",
    project: "control-plane",
    status: "queued",
    note: "Replay nonce accepted, action queued for executor wiring.",
  },
  {
    action: "observability.inspect",
    actor: "vercel-preview-bot",
    environment: "staging",
    project: "apps/web",
    status: "success",
    note: "Readonly runtime metrics snapshot served with secret redaction.",
  },
  {
    action: "service.restart",
    actor: "infra-admin-runner",
    environment: "production",
    project: "apps/api",
    status: "awaiting_approval",
    note: "Protected environment gate blocked autonomous execution.",
  },
];

export const machineAccessAgentGuardrails = [
  "AI agent tokens can inspect logs, metrics, runtime, topology, deployments, queues, and analytics.",
  "AI agent tokens can request preview builds and preview deployments in non-production environments.",
  "AI agent tokens cannot read raw secrets, mutate billing, restart services, or write runtime configuration.",
  "Every mutable request requires a replay-protected nonce and writes a chained audit log entry.",
  "Production mutations remain approval-gated even for high-trust internal tokens.",
];

export const machineAccessApiBoundaries = [
  {
    surface: "/machine-access/v1/admin/*",
    purpose: "Bootstrap-admin control plane for token issuance, rotation, revocation, and audit review.",
  },
  {
    surface: "/machine-access/v1/observability/*",
    purpose: "Readonly infrastructure inspection for deployments, metrics, logs, topology, queues, and websocket state.",
  },
  {
    surface: "/machine-access/v1/actions/*",
    purpose: "Scoped build, preview deployment, diagnostics, and restart requests with approval-aware queuing.",
  },
  {
    surface: "/machine-access/v1/websocket/session",
    purpose: "Short-lived session token issuance for future websocket auth handshakes.",
  },
];

export const machineAccessSdkExamples = [
  "satelink-agent inspect runtime --env preview --project control-plane",
  "satelink-agent inspect logs --env staging --project apps/api",
  "satelink-agent deploy preview --env preview --project apps/web --branch feature/machine-access",
  "satelink-agent diagnose queue --env preview --project control-plane",
];
