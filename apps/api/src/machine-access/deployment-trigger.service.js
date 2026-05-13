import { randomUUID } from "crypto";

export class DeploymentTriggerService {
  constructor({ pool, permissionValidator, environmentGuard, auditLogger }) {
    this.pool = pool;
    this.permissionValidator = permissionValidator;
    this.environmentGuard = environmentGuard;
    this.auditLogger = auditLogger;
  }

  async createActionRequest(tokenContext, request, auditContext = {}) {
    const environment = this.environmentGuard.assertEnvironmentAccess(
      tokenContext.environmentAccess,
      request.environment,
    );
    const projectId = this.environmentGuard.assertProjectAccess(tokenContext.projectAccess, request.projectId);
    const requestId = randomUUID();
    const approvalState =
      this.environmentGuard.isProtectedEnvironment(environment) || request.requiresApproval
        ? "awaiting_approval"
        : "approved";

    await this.pool.query(
      `INSERT INTO machine_access_action_requests (
        id, token_id, identity_id, action_type, target_type, target_id, environment,
        project_id, approval_state, status, request_payload, result_payload
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb
      )`,
      [
        requestId,
        tokenContext.tokenId,
        tokenContext.identityId,
        request.actionType,
        request.targetType,
        request.targetId || null,
        environment,
        projectId,
        approvalState,
        approvalState === "approved" ? "queued" : "awaiting_approval",
        JSON.stringify(request.payload || {}),
        JSON.stringify({
          executor: "scaffold-only",
          executed: false,
          reason:
            approvalState === "approved"
              ? "Queued for future executor integration"
              : "Protected environment or approval-gated action",
        }),
      ],
    );

    await this.auditLogger.log({
      tokenId: tokenContext.tokenId,
      identityId: tokenContext.identityId,
      machineIdentity: tokenContext.machineIdentity,
      action: request.actionType,
      requiredScope: request.requiredScope,
      environment,
      projectId,
      status: "success",
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      executionMetadata: {
        targetType: request.targetType,
        targetId: request.targetId || null,
        approvalState,
        payload: request.payload || {},
      },
    });

    return {
      requestId,
      actionType: request.actionType,
      approvalState,
      status: approvalState === "approved" ? "queued" : "awaiting_approval",
      environment,
      projectId,
      executionMode: "scaffold-only",
    };
  }

  async requestPreviewDeployment(tokenContext, request, auditContext = {}) {
    this.permissionValidator.assertScopes(tokenContext.scopes, ["write:deployments"]);
    this.permissionValidator.assertAgentSandbox(tokenContext, {
      environment: request.environment,
      action: "deploy.preview",
    });
    return this.createActionRequest(
      tokenContext,
      {
        actionType: "deploy.preview",
        requiredScope: "write:deployments",
        targetType: "deployment",
        targetId: request.projectId,
        environment: request.environment,
        projectId: request.projectId,
        payload: {
          commitSha: request.commitSha || null,
          branch: request.branch || null,
          reason: request.reason || "machine-preview",
        },
      },
      auditContext,
    );
  }

  async requestBuild(tokenContext, request, auditContext = {}) {
    this.permissionValidator.assertScopes(tokenContext.scopes, ["write:builds"]);
    this.permissionValidator.assertAgentSandbox(tokenContext, {
      environment: request.environment,
      action: "build.preview",
    });
    return this.createActionRequest(
      tokenContext,
      {
        actionType: "build.preview",
        requiredScope: "write:builds",
        targetType: "build",
        targetId: request.projectId,
        environment: request.environment,
        projectId: request.projectId,
        payload: {
          branch: request.branch || null,
          commitSha: request.commitSha || null,
        },
      },
      auditContext,
    );
  }

  async requestDiagnostics(tokenContext, request, auditContext = {}) {
    this.permissionValidator.assertScopes(tokenContext.scopes, ["read:runtime"]);
    if (tokenContext.tokenType === "ai-agent-token") {
      this.permissionValidator.assertAgentSandbox(tokenContext, {
        environment: request.environment,
        action: "diagnostics.run",
      });
    }
    return this.createActionRequest(
      tokenContext,
      {
        actionType: "diagnostics.run",
        requiredScope: "read:runtime",
        targetType: "runtime",
        targetId: request.service || request.projectId,
        environment: request.environment,
        projectId: request.projectId,
        payload: {
          service: request.service || null,
          profile: request.profile || "standard",
        },
      },
      auditContext,
    );
  }

  async requestServiceRestart(tokenContext, request, auditContext = {}) {
    this.permissionValidator.assertScopes(tokenContext.scopes, ["write:services"]);
    if (tokenContext.tokenType === "ai-agent-token") {
      throw new Error("AI agent tokens cannot restart services");
    }
    return this.createActionRequest(
      tokenContext,
      {
        actionType: "service.restart",
        requiredScope: "write:services",
        targetType: "service",
        targetId: request.service,
        environment: request.environment,
        projectId: request.projectId,
        payload: {
          service: request.service,
          reason: request.reason || "machine-restart",
        },
        requiresApproval: true,
      },
      auditContext,
    );
  }
}
