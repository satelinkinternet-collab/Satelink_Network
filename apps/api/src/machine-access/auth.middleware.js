import express from "express";
import { timingSafeEqual } from "crypto";
import {
  MACHINE_ACCESS_NONCE_HEADER,
  MUTATING_MACHINE_ACCESS_SCOPES,
} from "./contracts.js";

export function createMachineAccessAdminGuard({ adminSecretHeader, environmentGuard }) {
  const router = express.Router();
  router.use((req, res, next) => {
    const configured = process.env.MACHINE_ACCESS_ADMIN_SECRET;
    if (!configured) {
      return res.status(503).json({
        ok: false,
        error: "machine_access_admin_secret_missing",
      });
    }

    const provided = req.header(adminSecretHeader);
    const configuredBuffer = Buffer.from(configured);
    const providedBuffer = Buffer.from(provided || "");
    const isValid =
      providedBuffer.length === configuredBuffer.length &&
      timingSafeEqual(providedBuffer, configuredBuffer);

    if (!provided || !isValid) {
      return res.status(401).json({ ok: false, error: "invalid_machine_access_admin_secret" });
    }

    try {
      environmentGuard.assertIpAccess([], req.ip);
      return next();
    } catch (error) {
      return res.status(403).json({ ok: false, error: error.message });
    }
  });
  return router;
}

export function createMachineAccessAuthMiddleware({
  tokenService,
  rateLimiter,
  environmentGuard,
  auditLogger,
}) {
  return async function machineAccessAuth(req, res, next) {
    try {
      const authHeader = req.header("authorization") || "";
      if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ ok: false, error: "missing_machine_access_token" });
      }
      const rawToken = authHeader.slice("Bearer ".length).trim();
      const tokenContext = await tokenService.authenticateToken(rawToken);
      environmentGuard.assertIpAccess(tokenContext.ipRestrictions, req.ip);
      await rateLimiter.consume(tokenContext);

      req.machineAccess = {
        ...tokenContext,
        environment: req.query.environment || req.body?.environment || tokenContext.environmentAccess[0] || "preview",
        projectId: req.query.projectId || req.body?.projectId || tokenContext.projectAccess[0] || "core-platform",
      };
      return next();
    } catch (error) {
      await auditLogger.log({
        machineIdentity: "unknown-machine",
        tokenId: null,
        identityId: null,
        action: "auth.failed",
        requiredScope: null,
        environment: req.query.environment || req.body?.environment || null,
        projectId: req.query.projectId || req.body?.projectId || null,
        status: "failure",
        failureReason: error.message,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        executionMetadata: {
          path: req.path,
          method: req.method,
        },
      }).catch(() => {});
      return res.status(401).json({ ok: false, error: error.message });
    }
  };
}

export function requireMachineScopes(permissionValidator, scopes = []) {
  return (req, res, next) => {
    try {
      permissionValidator.assertScopes(req.machineAccess?.scopes || [], scopes);
      return next();
    } catch (error) {
      return res.status(403).json({ ok: false, error: error.message });
    }
  };
}

export function requireReplayNonce(replayProtection) {
  return async (req, res, next) => {
    try {
      const requestedScopes = req.machineAccess?.scopes || [];
      const needsNonce = requestedScopes.some((scope) => MUTATING_MACHINE_ACCESS_SCOPES.has(scope));
      if (!needsNonce) return next();
      await replayProtection.assertNonce({
        tokenId: req.machineAccess.tokenId,
        nonce: req.header(MACHINE_ACCESS_NONCE_HEADER),
      });
      return next();
    } catch (error) {
      return res.status(409).json({ ok: false, error: error.message });
    }
  };
}
