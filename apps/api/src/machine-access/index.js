import express from "express";
import {
  MACHINE_ACCESS_ADMIN_SECRET_HEADER,
  MACHINE_ACCESS_NAME,
  MACHINE_ACCESS_PERMISSIONS,
  MACHINE_ACCESS_TOKEN_TYPES,
  SAFE_AGENT_SANDBOX_POLICY,
} from "./contracts.js";
import { AuditLoggerService } from "./audit-logger.service.js";
import { createMachineAccessAdminGuard, createMachineAccessAuthMiddleware, requireMachineScopes, requireReplayNonce } from "./auth.middleware.js";
import { DeploymentTriggerService } from "./deployment-trigger.service.js";
import { EnvironmentGuardService } from "./environment-guard.service.js";
import { MachineIdentityService } from "./machine-identity.service.js";
import { ObservabilityGatewayService } from "./observability-gateway.service.js";
import { PermissionValidatorService } from "./permission-validator.service.js";
import { MachineAccessRateLimiterService } from "./rate-limiter.service.js";
import { ReplayProtectionService } from "./replay-protection.service.js";
import { ensureMachineAccessTables } from "./tables.js";
import { MachineAccessTokenService } from "./token.service.js";
import { TokenHashingService } from "./token-hashing.service.js";
import { WebsocketAuthService } from "./websocket-auth.service.js";

export function createMachineAccessRouter(pool, redis) {
  const router = express.Router();
  router.use(express.json());

  const permissionValidator = new PermissionValidatorService();
  const environmentGuard = new EnvironmentGuardService();
  const auditLogger = new AuditLoggerService(pool);
  const identityService = new MachineIdentityService(pool);
  const tokenService = new MachineAccessTokenService({
    pool,
    hashingService: new TokenHashingService(),
    permissionValidator,
    identityService,
    auditLogger,
    environmentGuard,
  });
  const deploymentTrigger = new DeploymentTriggerService({
    pool,
    permissionValidator,
    environmentGuard,
    auditLogger,
  });
  const observabilityGateway = new ObservabilityGatewayService(pool);
  const websocketAuth = new WebsocketAuthService();
  const rateLimiter = new MachineAccessRateLimiterService(redis);
  const replayProtection = new ReplayProtectionService(redis);
  const adminGuard = createMachineAccessAdminGuard({
    adminSecretHeader: MACHINE_ACCESS_ADMIN_SECRET_HEADER,
    environmentGuard,
  });
  const auth = createMachineAccessAuthMiddleware({
    tokenService,
    rateLimiter,
    environmentGuard,
    auditLogger,
  });

  router.get("/health", (_req, res) => {
    res.json({
      ok: true,
      name: MACHINE_ACCESS_NAME,
      mode: "internal-only",
      security: {
        hashedTokenStorage: true,
        auditLogChaining: true,
        replayProtection: true,
        environmentIsolation: true,
      },
    });
  });

  router.use("/admin", adminGuard);

  router.get("/admin/permissions", (_req, res) => {
    res.json({
      ok: true,
      tokenTypes: MACHINE_ACCESS_TOKEN_TYPES,
      permissions: MACHINE_ACCESS_PERMISSIONS,
      safeAgentSandbox: SAFE_AGENT_SANDBOX_POLICY,
      adminSecretHeader: MACHINE_ACCESS_ADMIN_SECRET_HEADER,
    });
  });

  router.get("/admin/tokens", async (_req, res) => {
    const tokens = await tokenService.listTokens();
    res.json({ ok: true, tokens });
  });

  router.post("/admin/tokens", async (req, res) => {
    try {
      const issued = await tokenService.issueToken(req.body, {
        issuedBy: req.body.issuedBy || "internal-admin",
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      return res.status(201).json({
        ok: true,
        warning: "Raw token is only returned once. Store it in your secret manager now.",
        token: issued.rawToken,
        record: {
          tokenId: issued.tokenId,
          tokenName: issued.tokenName,
          tokenType: issued.tokenType,
          scopes: issued.scopes,
          environmentAccess: issued.environmentAccess,
          projectAccess: issued.projectAccess,
          expiresAt: issued.expiresAt,
          rateLimit: issued.rateLimit,
        },
      });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.post("/admin/tokens/:tokenId/revoke", async (req, res) => {
    try {
      const revoked = await tokenService.revokeToken(req.params.tokenId, {
        machineIdentity: "internal-admin",
        environment: req.body.environment || "preview",
        projectId: req.body.projectId || "*",
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      return res.json({ ok: true, revoked });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.post("/admin/tokens/:tokenId/rotate", async (req, res) => {
    try {
      const rotated = await tokenService.rotateToken(req.params.tokenId, {
        identityName: req.body.identityName,
        machineType: req.body.machineType,
        machineIdentity: "internal-admin",
        environment: req.body.environment || "preview",
        projectId: req.body.projectId || "*",
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      return res.json({
        ok: true,
        warning: "Raw replacement token is only returned once. Store it in your secret manager now.",
        token: rotated.rawToken,
        record: rotated,
      });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.get("/admin/audit", async (req, res) => {
    const audit = await auditLogger.listAuditEntries({
      environment: req.query.environment,
      projectId: req.query.projectId,
      limit: req.query.limit,
    });
    res.json({ ok: true, audit });
  });

  router.get("/admin/agents/policy", async (_req, res) => {
    const identities = await identityService.listIdentities();
    res.json({
      ok: true,
      safeAgentSandbox: SAFE_AGENT_SANDBOX_POLICY,
      identities: identities.filter((identity) => identity.is_ai_agent),
    });
  });

  router.use(auth);

  router.get("/whoami", (req, res) => {
    res.json({
      ok: true,
      identity: req.machineAccess,
    });
  });

  router.get(
    "/observability/overview",
    requireMachineScopes(permissionValidator, ["read:runtime"]),
    async (req, res) => {
      const data = await observabilityGateway.getOverview({
        environment: req.machineAccess.environment,
        projectId: req.machineAccess.projectId,
      });
      res.json({ ok: true, data });
    },
  );

  router.get(
    "/observability/metrics",
    requireMachineScopes(permissionValidator, ["read:metrics"]),
    async (req, res) => {
      const data = await observabilityGateway.getMetrics({
        environment: req.machineAccess.environment,
        projectId: req.machineAccess.projectId,
      });
      res.json({ ok: true, data });
    },
  );

  router.get(
    "/observability/deployments",
    requireMachineScopes(permissionValidator, ["read:deployments"]),
    async (req, res) => {
      const data = await observabilityGateway.getDeployments({
        environment: req.machineAccess.environment,
        projectId: req.machineAccess.projectId,
        limit: req.query.limit,
      });
      res.json({ ok: true, data });
    },
  );

  router.get(
    "/observability/logs",
    requireMachineScopes(permissionValidator, ["read:logs"]),
    async (req, res) => {
      const data = await observabilityGateway.getLogs({
        environment: req.machineAccess.environment,
        projectId: req.machineAccess.projectId,
        limit: req.query.limit,
      });
      res.json({ ok: true, data });
    },
  );

  router.get(
    "/observability/topology",
    requireMachineScopes(permissionValidator, ["read:topology"]),
    async (_req, res) => {
      const data = await observabilityGateway.getTopology();
      res.json({ ok: true, data });
    },
  );

  router.get(
    "/observability/queues",
    requireMachineScopes(permissionValidator, ["read:queues"]),
    async (_req, res) => {
      const data = await observabilityGateway.getQueues();
      res.json({ ok: true, data });
    },
  );

  router.get(
    "/observability/websocket",
    requireMachineScopes(permissionValidator, ["read:runtime"]),
    async (_req, res) => {
      const data = await observabilityGateway.getWebsocketHealth();
      res.json({ ok: true, data });
    },
  );

  router.post(
    "/actions/deploy-preview",
    requireMachineScopes(permissionValidator, ["write:deployments"]),
    requireReplayNonce(replayProtection),
    async (req, res) => {
      try {
        const action = await deploymentTrigger.requestPreviewDeployment(req.machineAccess, req.body, {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });
        return res.status(202).json({ ok: true, action });
      } catch (error) {
        return res.status(403).json({ ok: false, error: error.message });
      }
    },
  );

  router.post(
    "/actions/build-preview",
    requireMachineScopes(permissionValidator, ["write:builds"]),
    requireReplayNonce(replayProtection),
    async (req, res) => {
      try {
        const action = await deploymentTrigger.requestBuild(req.machineAccess, req.body, {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });
        return res.status(202).json({ ok: true, action });
      } catch (error) {
        return res.status(403).json({ ok: false, error: error.message });
      }
    },
  );

  router.post(
    "/actions/run-diagnostics",
    requireMachineScopes(permissionValidator, ["read:runtime"]),
    requireReplayNonce(replayProtection),
    async (req, res) => {
      try {
        const action = await deploymentTrigger.requestDiagnostics(req.machineAccess, req.body, {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });
        return res.status(202).json({ ok: true, action });
      } catch (error) {
        return res.status(403).json({ ok: false, error: error.message });
      }
    },
  );

  router.post(
    "/actions/restart-service",
    requireMachineScopes(permissionValidator, ["write:services"]),
    requireReplayNonce(replayProtection),
    async (req, res) => {
      try {
        const action = await deploymentTrigger.requestServiceRestart(req.machineAccess, req.body, {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });
        return res.status(202).json({ ok: true, action });
      } catch (error) {
        return res.status(403).json({ ok: false, error: error.message });
      }
    },
  );

  router.post(
    "/websocket/session",
    requireMachineScopes(permissionValidator, ["read:runtime"]),
    async (req, res) => {
      try {
        const session = websocketAuth.issueSessionToken(req.machineAccess, req.body);
        await auditLogger.log({
          tokenId: req.machineAccess.tokenId,
          identityId: req.machineAccess.identityId,
          machineIdentity: req.machineAccess.machineIdentity,
          action: "websocket.session.issue",
          requiredScope: "read:runtime",
          environment: session.environment,
          projectId: session.projectId,
          status: "success",
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          executionMetadata: {
            expiresInMinutes: session.expiresInMinutes,
            scopes: session.scopes,
          },
        });
        return res.json({ ok: true, session });
      } catch (error) {
        return res.status(400).json({ ok: false, error: error.message });
      }
    },
  );

  return router;
}

export { ensureMachineAccessTables };
